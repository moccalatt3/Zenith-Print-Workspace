import { useState, useEffect } from "react";
import {
  User,
  Lock,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Building,
  Calendar,
} from "lucide-react";
import adminSettingsService from "../../services/adminSettingsService";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // State untuk data profile
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "",
    user_type: "",
    created_at: "",
  });

  // State untuk password
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State untuk reset data
  const [resetData, setResetData] = useState({
    confirmText: "",
  });

  // Load profile data on component mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await adminSettingsService.getProfile();
      if (response.success) {
        setProfile(response.data);
      }
    } catch (err) {
      setError("Gagal memuat profil: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk update profile
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminSettingsService.updateProfile({
        name: profile.name,
        email: profile.email,
      });

      if (response.success) {
        setSuccess("Profile berhasil diperbarui!");
      }
    } catch (err) {
      setError("Gagal memperbarui profile: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk update password
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password.newPassword !== password.confirmPassword) {
      setError("Password baru dan konfirmasi password tidak cocok");
      setLoading(false);
      return;
    }

    if (password.newPassword.length < 6) {
      setError("Password baru harus minimal 6 karakter");
      setLoading(false);
      return;
    }

    try {
      const response = await adminSettingsService.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });

      if (response.success) {
        setSuccess("Password berhasil diperbarui!");
        setPassword({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (err) {
      setError("Gagal memperbarui password: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk reset data
  const handleResetData = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (resetData.confirmText !== "RESET DATA SAYA") {
      setError("Silakan ketik 'RESET DATA SAYA' untuk konfirmasi");
      setLoading(false);
      return;
    }

    if (!window.confirm("⚠️ PERINGATAN: Tindakan ini akan menghapus SEMUA DATA kecuali data admin. Data yang dihapus tidak dapat dikembalikan. Yakin ingin melanjutkan?")) {
      setLoading(false);
      return;
    }

    if (!window.confirm("🚨 KONFIRMASI AKHIR: Anda yakin ingin menghapus SEMUA DATA transaksi, order, pembayaran, dan data lainnya? Tindakan ini TIDAK DAPAT DIBATALKAN!")) {
      setLoading(false);
      return;
    }

    try {
      const response = await adminSettingsService.resetData();

      if (response.success) {
        setSuccess("Data berhasil direset! Semua data non-admin telah dihapus.");
        setResetData({
          confirmText: "",
        });
      }
    } catch (err) {
      setError("Gagal mereset data: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setLoading(false);
    }
  };

  // Tabs configuration
  const tabs = [
    { id: "profile", name: "Edit Profile", icon: User },
    { id: "password", name: "Ubah Password", icon: Lock },
    { id: "reset", name: "Reset Data", icon: RefreshCw },
  ];

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Pengaturan Sistem
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Kelola profil akun, keamanan, dan pengaturan sistem
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span className="flex-1">{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="ml-2 text-green-500 hover:text-green-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Tabs Navigation - Responsive */}
        <div className="border-b border-gray-300">
          <nav className="flex overflow-x-auto -mb-px">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-4 sm:px-6 text-sm font-medium border-b-2 transition-all duration-200 flex-shrink-0 ${
                    activeTab === tab.id
                      ? "border-gray-900 text-gray-900 bg-gray-50 font-semibold"
                      : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-600"
                  }`}
                >
                  <IconComponent
                    className={`w-4 h-4 ${
                      activeTab === tab.id ? "text-gray-900" : "text-gray-500"
                    }`}
                  />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden text-xs">
                    {tab.id === "profile" && "Profile"}
                    {tab.id === "password" && "Password"}
                    {tab.id === "reset" && "Reset"}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {/* Edit Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  Informasi Profil
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  Kelola informasi profil akun Anda
                </p>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={profile.role || "Admin"}
                        readOnly
                        className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipe User
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={profile.user_type || "Individual"}
                        readOnly
                        className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {profile.created_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bergabung Sejak
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formatDate(profile.created_at)}
                        readOnly
                        className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {loading ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Change Password Tab */}
          {activeTab === "password" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  Ubah Password
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  Pastikan password baru Anda kuat dan mudah diingat
                </p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Saat Ini *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={password.currentPassword}
                      onChange={(e) =>
                        setPassword({
                          ...password,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Baru *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={password.newPassword}
                      onChange={(e) =>
                        setPassword({
                          ...password,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                      required
                      minLength="6"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    Minimal 6 karakter
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konfirmasi Password Baru *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={password.confirmPassword}
                      onChange={(e) =>
                        setPassword({
                          ...password,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {loading ? "Mengupdate..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reset Data Tab */}
          {activeTab === "reset" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  Reset Data Sistem
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  Hati-hati! Tindakan ini akan menghapus data tertentu dari
                  sistem
                </p>
              </div>

              <div className="bg-red-50 rounded-lg p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-red-900 mb-2">
                      Peringatan: Tindakan Berbahaya
                    </h3>
                    <p className="text-xs sm:text-sm text-red-700">
                      Reset data akan menghapus SEMUA DATA dari sistem kecuali data admin. 
                      Data yang akan dihapus meliputi: semua transaksi, order, pembayaran, 
                      riwayat status, perhitungan harga, dan data referrals. Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleResetData} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konfirmasi Reset Data *
                  </label>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">
                    Ketik{" "}
                    <span className="font-mono font-bold text-gray-900">
                      RESET DATA SAYA
                    </span>{" "}
                    untuk mengonfirmasi
                  </p>
                  <input
                    type="text"
                    value={resetData.confirmText}
                    onChange={(e) =>
                      setResetData({
                        ...resetData,
                        confirmText: e.target.value,
                      })
                    }
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 font-mono text-sm"
                    placeholder="RESET DATA SAYA"
                    required
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={
                      loading || resetData.confirmText !== "RESET DATA SAYA"
                    }
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {loading ? "Memproses..." : "Reset Data Sistem"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;