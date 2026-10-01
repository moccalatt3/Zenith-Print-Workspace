import api from "./api";

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });

      if (response.data.success) {
        const { token, user } = response.data.data;

        // ✅ CLEANUP: Hapus data order sebelumnya sebelum login baru
        const savedOrder = localStorage.getItem("lastActiveOrder");
        if (savedOrder) {
          try {
            const orderData = JSON.parse(savedOrder);
            // Hanya hapus jika data tersebut bukan milik user yang login
            if (orderData.userEmail !== email) {
              localStorage.removeItem("lastActiveOrder");
              console.log("🧹 Cleared previous user's order data during login");
            }
          } catch (error) {
            localStorage.removeItem("lastActiveOrder");
          }
        }

        // Simpan token dan user data
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("loginTime", Date.now().toString());

        console.log(
          "✅ Login successful for user:",
          user.role,
          user.name,
          user.email
        );

        // Redirect berdasarkan role setelah login berhasil
        if (user.role === "admin") {
          console.log("🔄 Redirecting admin to dashboard...");
          setTimeout(() => {
            window.location.href = "/admin/dashboard";
          }, 100);
        } else {
          console.log("🔄 Redirecting user to home...");
          setTimeout(() => {
            window.location.href = "/";
          }, 100);
        }
      }

      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Gagal login";
      throw new Error(errorMessage);
    }
  },

  register: async (userData) => {
    try {
      console.log("Sending register data:", userData);
      const response = await api.post("/auth/register", userData);
      console.log("Register response:", response.data);

      if (response.data.success) {
        const { token, user } = response.data.data;

        // ✅ CLEANUP: Hapus data order yang mungkin tersisa
        localStorage.removeItem("lastActiveOrder");

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("loginTime", Date.now().toString());

        console.log(
          "✅ Registration successful for user:",
          user.role,
          user.name,
          user.email
        );

        // Redirect setelah registrasi berhasil
        if (user.role === "admin") {
          setTimeout(() => {
            window.location.href = "/admin/dashboard";
          }, 100);
        } else {
          setTimeout(() => {
            window.location.href = "/";
          }, 100);
        }
      }

      return response.data;
    } catch (error) {
      console.error("Register error details:", error);
      console.error("Error response:", error.response);

      let errorMessage = "Terjadi kesalahan saat registrasi";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = "Data yang dimasukkan tidak valid";
      } else if (error.response?.status === 500) {
        errorMessage = "Terjadi kesalahan server. Silakan coba lagi.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post("/auth/forgot-password", { email });
      return response.data;
    } catch (error) {
      console.error("Forgot password error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengirim instruksi reset password";
      throw new Error(errorMessage);
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post("/auth/reset-password", {
        token,
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error("Reset password error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal reset password";
      throw new Error(errorMessage);
    }
  },

  validateReferralCode: async (referralCode) => {
    try {
      const response = await api.post("/auth/validate-referral", {
        referralCode,
      });
      return response.data;
    } catch (error) {
      console.error("Validate referral error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal validasi kode referral";
      throw new Error(errorMessage);
    }
  },

  logout: () => {
    try {
      const user = authService.getCurrentUser();
      console.log("🚪 Logging out user:", user?.email);

      // ✅ ENHANCED CLEANUP: Hapus data order user yang logout
      const savedOrder = localStorage.getItem("lastActiveOrder");
      if (savedOrder) {
        try {
          const orderData = JSON.parse(savedOrder);
          // Validasi: hanya hapus jika data tersebut milik user yang logout
          const isUserData =
            orderData.userId === user?.id ||
            orderData.userEmail === user?.email;

          if (isUserData) {
            localStorage.removeItem("lastActiveOrder");
            console.log(
              "🧹 Cleared order data for logged out user:",
              user?.email
            );
          } else {
            console.log("ℹ️ Keeping other user's order data during logout");
          }
        } catch (error) {
          console.error("Error parsing order data during logout:", error);
          localStorage.removeItem("lastActiveOrder");
        }
      }

      // Clear auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");

      console.log("✅ Logout completed for user:", user?.email);
    } catch (error) {
      console.error("Error during logout:", error);
      // Force cleanup on error
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("lastActiveOrder");
    }

    window.location.href = "/";
  },

  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;

      const user = JSON.parse(userStr);

      // Validasi struktur user data
      if (!user || typeof user !== "object") {
        console.warn("⚠️ Invalid user data structure");
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error getting user from localStorage:", error);
      return null;
    }
  },

  getToken: () => {
    try {
      return localStorage.getItem("token");
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  },

  isAuthenticated: () => {
    try {
      const token = localStorage.getItem("token");
      const user = authService.getCurrentUser();

      if (!token || !user) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  },

  isAdmin: () => {
    try {
      const user = authService.getCurrentUser();

      if (!user) {
        console.log("❌ No user found for admin check");
        return false;
      }

      const isAdmin = user.role === "admin";
      console.log(
        `🔍 Admin check: ${user.role} -> ${isAdmin ? "ADMIN" : "USER"}`
      );

      return isAdmin;
    } catch (error) {
      console.error("Error checking admin role:", error);
      return false;
    }
  },

  // ✅ NEW METHOD: Validasi dan cleanup data order di localStorage
  validateAndCleanOrderData: () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        // Jika tidak ada user, hapus semua data order
        localStorage.removeItem("lastActiveOrder");
        return null;
      }

      const savedOrder = localStorage.getItem("lastActiveOrder");
      if (!savedOrder) return null;

      const orderData = JSON.parse(savedOrder);

      // Validasi: pastikan data order milik user yang sedang login
      const isSameUser =
        orderData.userId === currentUser.id ||
        orderData.userEmail === currentUser.email;

      if (isSameUser) {
        console.log("✅ Valid order data for current user:", currentUser.email);
        return orderData;
      } else {
        // ❌ Data order milik user lain - HAPUS
        console.log("🧹 Removing other user's order data:", {
          currentUser: currentUser.email,
          orderUser: orderData.userEmail,
        });
        localStorage.removeItem("lastActiveOrder");
        return null;
      }
    } catch (error) {
      console.error("Error validating order data:", error);
      localStorage.removeItem("lastActiveOrder");
      return null;
    }
  },

  // ✅ NEW METHOD: Save order data dengan user context
  saveOrderData: (orderData) => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.warn("⚠️ Cannot save order data: No user logged in");
        return false;
      }

      const dataToSave = {
        ...orderData,
        userId: currentUser.id,
        userEmail: currentUser.email,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem("lastActiveOrder", JSON.stringify(dataToSave));
      console.log("💾 Order data saved for user:", currentUser.email);
      return true;
    } catch (error) {
      console.error("Error saving order data:", error);
      return false;
    }
  },

  // ✅ NEW METHOD: Clear order data hanya jika milik current user
  clearOrderData: () => {
    try {
      const currentUser = authService.getCurrentUser();
      const savedOrder = localStorage.getItem("lastActiveOrder");

      if (!savedOrder) return true;

      const orderData = JSON.parse(savedOrder);
      const isUserData =
        orderData.userId === currentUser?.id ||
        orderData.userEmail === currentUser?.email;

      if (isUserData || !currentUser) {
        localStorage.removeItem("lastActiveOrder");
        console.log("🧹 Order data cleared");
        return true;
      } else {
        console.log("ℹ️ Skipping clear - order data belongs to different user");
        return false;
      }
    } catch (error) {
      console.error("Error clearing order data:", error);
      localStorage.removeItem("lastActiveOrder");
      return false;
    }
  },

  // Method untuk check session dan redirect jika perlu
  checkAndRedirect: () => {
    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      const currentPath = window.location.pathname;

      console.log(`📍 Current path: ${currentPath}, User role: ${user?.role}`);

      // ✅ Validasi data order sebelum redirect
      authService.validateAndCleanOrderData();

      // Jika admin mengakses halaman non-admin, redirect ke dashboard
      if (user?.role === "admin" && !currentPath.startsWith("/admin")) {
        console.log(
          "🔄 Admin accessing non-admin page, redirecting to dashboard..."
        );
        window.location.href = "/admin/dashboard";
        return true;
      }

      // Jika user biasa mengakses halaman admin, redirect ke home
      if (user?.role !== "admin" && currentPath.startsWith("/admin")) {
        console.log("🔄 User accessing admin page, redirecting to home...");
        window.location.href = "/";
        return true;
      }
    } else {
      // Jika tidak authenticated, pastikan data order dihapus
      localStorage.removeItem("lastActiveOrder");
    }
    return false;
  },

  // Method untuk refresh user data dari API jika diperlukan
  refreshUserData: async () => {
    try {
      const token = authService.getToken();
      if (!token) return null;

      const response = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const userData = response.data.data;
        localStorage.setItem("user", JSON.stringify(userData));

        // ✅ Validasi ulang data order setelah refresh user data
        authService.validateAndCleanOrderData();

        return userData;
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      // Jika token invalid, logout
      if (error.response?.status === 401) {
        authService.logout();
      }
    }
    return null;
  },

  // Method untuk mendapatkan user info dengan validasi
  getUserInfo: () => {
    const user = authService.getCurrentUser();
    const token = authService.getToken();

    return {
      isAuthenticated: !!token && !!user,
      user: user,
      isAdmin: user?.role === "admin",
      token: token,
    };
  },

  // ✅ NEW METHOD: Get current user identifier untuk logging
  getUserIdentifier: () => {
    const user = authService.getCurrentUser();
    if (!user) return "unknown-user";

    return user.email || user.id || `user-${user.role}`;
  },
};

// Auto-check session pada load
if (typeof window !== "undefined") {
  // Check session setelah DOM loaded
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      authService.checkAndRedirect();
    }, 50);
  });

  // ✅ ENHANCED: Juga check saat page visible (tab switch)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      setTimeout(() => {
        authService.validateAndCleanOrderData();
      }, 100);
    }
  });
}

export default api;
