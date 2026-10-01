import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  ShoppingBag,
  CheckCircle,
  Clock,
  AlertCircle,
  Key,
  Settings,
  Activity,
  Menu,
} from "lucide-react";
import { authService } from "../../services/authService";
import { profileService } from "../../services/profileService";

const Profile = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    companyName: "", // TAMBAH INI
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [statistics, setStatistics] = useState({
    total_orders: 0,
    completed_orders: 0,
    processing_orders: 0,
    pending_orders: 0,
  });
  const [activity, setActivity] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();

      if (user) {
        setCurrentUser(user);

        // Load profile data from API
        const profileResponse = await profileService.getProfile();
        if (profileResponse.success) {
          const { user: userData, statistics: stats } = profileResponse.data;

          setFormData({
            name: userData.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            address: userData.address || "",
            companyName: userData.company_name || "", // TAMBAH INI
          });

          setStatistics(stats);
        }

        // Load activity data
        const activityResponse = await profileService.getActivity();
        if (activityResponse.success) {
          setActivity(activityResponse.data.orders || []);
        }
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
      setError("Gagal memuat data profil");
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form data jika cancel edit
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        address: currentUser.address || "",
        companyName: currentUser.company_name || "", // TAMBAH INI
      });
    }
    setIsEditing(!isEditing);
    setMessage("");
    setError("");
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      // Validasi email format di frontend
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Format email tidak valid");
        setSaving(false);
        return;
      }

      const response = await profileService.updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        companyName: formData.companyName, // TAMBAH INI
      });

      if (response.success) {
        setMessage("Profil berhasil diperbarui");
        setIsEditing(false);

        // Update current user data
        const updatedUser = {
          ...currentUser,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          company_name: formData.companyName, // TAMBAH INI
        };
        setCurrentUser(updatedUser);

        // Update localStorage
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("Password dan konfirmasi password tidak cocok");
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError("Password baru minimal 6 karakter");
        return;
      }

      setSaving(true);
      setError("");

      const response = await profileService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.success) {
        setMessage("Password berhasil diubah");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      under_review: {
        iconColor: "text-yellow-400",
        text: "Dalam Review",
        icon: AlertCircle,
      },
      waiting_payment: {
        iconColor: "text-orange-400",
        text: "Menunggu Bayar",
        icon: AlertCircle,
      },
      payment_received: {
        iconColor: "text-blue-400",
        text: "Pembayaran Diterima",
        icon: Clock,
      },
      printing: {
        iconColor: "text-indigo-400",
        text: "Sedang Dicetak",
        icon: Clock,
      },
      final_touchup: {
        iconColor: "text-purple-400",
        text: "Finishing",
        icon: Clock,
      },
      ready_to_ship: {
        iconColor: "text-teal-400",
        text: "Siap Dikirim",
        icon: Clock,
      },
      completed: {
        iconColor: "text-green-400",
        text: "Selesai",
        icon: CheckCircle,
      },
      cancelled: {
        iconColor: "text-red-400",
        text: "Dibatalkan",
        icon: X,
      },
    };

    const config = statusConfig[status] || {
      iconColor: "text-gray-400",
      text: status,
      icon: AlertCircle,
    };
    const IconComponent = config.icon;

    return (
      <span className="flex items-center gap-1 px-3 py-1 bg-gray-400/10 text-gray-300 border border-gray-400/20 rounded-full text-sm">
        <IconComponent className={`w-3 h-3 ${config.iconColor}`} />
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FA812F] mx-auto mb-4"></div>
          <p className="text-white">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Silakan login untuk melihat profil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            My Profile
          </h1>
          <p className="text-gray-300 text-sm sm:text-lg">
            Kelola informasi profil Anda untuk pengalaman yang lebih personal
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-green-400 text-center text-sm sm:text-base">
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-center text-sm sm:text-base">
              {error}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Card - Main Content dengan Tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-400/20 rounded-full flex items-center justify-center border-2 border-gray-400/30">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {currentUser.name}
                  </h2>
                  <p className="text-gray-400 text-sm sm:text-base">
                    Member sejak{" "}
                    {currentUser.created_at
                      ? formatDate(currentUser.created_at)
                      : "2024"}
                  </p>
                </div>
              </div>

              {/* Mobile Tab Navigation Button */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-full flex items-center justify-between bg-black/40 text-gray-300 px-4 py-3 rounded-lg border border-gray-600/40 backdrop-blur-sm hover:bg-black/50 transition-colors duration-200"
                >
                  <span className="flex items-center gap-2">
                    {activeTab === "activity" && (
                      <Activity className="w-4 h-4" />
                    )}
                    {activeTab === "profile" && (
                      <Settings className="w-4 h-4" />
                    )}
                    {activeTab === "password" && <Key className="w-4 h-4" />}
                    {activeTab === "activity" && "Aktivitas Terbaru"}
                    {activeTab === "profile" && "Informasi Profil"}
                    {activeTab === "password" && "Ubah Password"}
                  </span>
                  <Menu className="w-4 h-4" />
                </button>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                  <div className="mt-2 bg-black/60 backdrop-blur-lg rounded-lg border border-gray-600/40 overflow-hidden shadow-xl">
                    <button
                      onClick={() => {
                        setActiveTab("activity");
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-3 border-l-4 transition-all duration-200 ${
                        activeTab === "activity"
                          ? "border-[#FA812F] text-[#FA812F] bg-[#FA812F]/15"
                          : "border-transparent text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      Aktivitas Terbaru
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("profile");
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-3 border-l-4 transition-all duration-200 ${
                        activeTab === "profile"
                          ? "border-[#FA812F] text-[#FA812F] bg-[#FA812F]/15"
                          : "border-transparent text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Informasi Profil
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("password");
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-3 border-l-4 transition-all duration-200 ${
                        activeTab === "password"
                          ? "border-[#FA812F] text-[#FA812F] bg-[#FA812F]/15"
                          : "border-transparent text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Key className="w-4 h-4" />
                      Ubah Password
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop Tab Navigation */}
              <div className="hidden lg:flex border-b border-gray-600/30 mb-6">
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors duration-200 ${
                    activeTab === "activity"
                      ? "border-[#FA812F] text-[#FA812F]"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Aktivitas Terbaru
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors duration-200 ${
                    activeTab === "profile"
                      ? "border-[#FA812F] text-[#FA812F]"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Informasi Profil
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors duration-200 ${
                    activeTab === "password"
                      ? "border-[#FA812F] text-[#FA812F]"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Key className="w-4 h-4" />
                  Ubah Password
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "activity" && (
                <div className="space-y-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
                    Aktivitas Order Terbaru
                  </h3>
                  {activity.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-sm sm:text-base">
                        Belum ada aktivitas order
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-2">
                        Order Anda akan muncul di sini
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activity.map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
                        >
                          <div className="flex-1 mb-3 sm:mb-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <p className="text-white font-medium text-sm truncate">
                                {order.order_number}
                              </p>
                              <span className="text-xs text-gray-500 bg-gray-500/20 px-2 py-1 rounded self-start">
                                {order.item_count || 0} items
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-400 mb-2 line-clamp-2">
                              {order.materials
                                ? order.materials
                                    .split(",")
                                    .slice(0, 3)
                                    .join(", ")
                                : "No materials specified"}
                              {order.materials &&
                                order.materials.split(",").length > 3 &&
                                ` dan ${
                                  order.materials.split(",").length - 3
                                } lainnya`}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                              <span>{formatDate(order.created_at)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="font-medium text-gray-400">
                                {formatCurrency(order.total_amount)}
                              </span>
                            </div>
                          </div>
                          <div className="self-start sm:self-auto">
                            {getStatusBadge(order.order_status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">
                      Informasi Profil
                    </h3>
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center justify-center gap-2 bg-gray-500/20 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-500/30 transition-colors duration-200 border border-gray-400/20 w-full sm:w-auto"
                    >
                      <Edit className="w-4 h-4" />
                      {isEditing ? "Batal Edit" : "Edit Profil"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Nama Lengkap
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full text-white bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FA812F] text-sm sm:text-base"
                          />
                        ) : (
                          <p className="text-white text-base sm:text-lg">
                            {formData.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Email
                        </label>
                        {isEditing ? (
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full text-white bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FA812F] text-sm sm:text-base"
                          />
                        ) : (
                          <p className="text-white text-base sm:text-lg">
                            {formData.email}
                          </p>
                        )}
                        {!isEditing && (
                          <p className="text-xs text-gray-500 mt-1">
                            Email dapat diubah dengan mengklik Edit Profil
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Conditional Company Name Input - HANYA MUNCUL JIKA user_type = 'company' */}
                      {currentUser?.user_type === "company" && (
                        <div>
                          <label className="text-sm text-gray-400 block mb-2">
                            Nama Perusahaan
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="companyName"
                              value={formData.companyName}
                              onChange={handleInputChange}
                              className="w-full text-white bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FA812F] text-sm sm:text-base"
                              placeholder="Masukkan nama perusahaan"
                            />
                          ) : (
                            <p className="text-white text-base sm:text-lg">
                              {formData.companyName || "Belum diisi"}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Telepon
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full text-white bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FA812F] text-sm sm:text-base"
                            placeholder="Contoh: +6281234567890"
                          />
                        ) : (
                          <p className="text-white text-base sm:text-lg">
                            {formData.phone || "Belum diisi"}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Alamat
                        </label>
                        {isEditing ? (
                          <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full text-white bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FA812F] resize-none text-sm sm:text-base"
                            placeholder="Masukkan alamat lengkap"
                          />
                        ) : (
                          <p className="text-white text-base sm:text-lg leading-relaxed">
                            {formData.address || "Belum diisi"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-600/30">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 font-semibold text-sm sm:text-base"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? "Menyimpan..." : "Simpan Perubahan"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "password" && (
                <div className="space-y-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
                    Ubah Password
                  </h3>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="text-sm text-gray-400 block mb-2">
                        Password Saat Ini
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordInputChange}
                        className="w-full text-white bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FA812F] text-sm sm:text-base"
                        placeholder="Masukkan password saat ini"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 block mb-2">
                        Password Baru
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
                        className="w-full text-white bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FA812F] text-sm sm:text-base"
                        placeholder="Masukkan password baru (minimal 6 karakter)"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 block mb-2">
                        Konfirmasi Password Baru
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        className="w-full text-white bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FA812F] text-sm sm:text-base"
                        placeholder="Konfirmasi password baru"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-600/30">
                    <button
                      onClick={handlePasswordChange}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 font-semibold text-sm sm:text-base"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Mengubah..." : "Ubah Password"}
                    </button>
                    <button
                      onClick={() =>
                        setPasswordData({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        })
                      }
                      className="flex items-center justify-center gap-2 bg-gray-500/20 text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-500/30 transition-colors duration-200 border border-gray-400/20 text-sm sm:text-base"
                    >
                      <X className="w-4 h-4" />
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Card - Statistics */}
          <div className="space-y-4 sm:space-y-6">
            {/* Statistics Card */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">
                Statistik Order
              </h3>

              <div className="space-y-3 sm:space-y-4">
                {/* Total Orders */}
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-[#F25912]/10 to-[#FA812F]/10 rounded-lg border border-[#FA812F]/20">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FA812F]/20 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#FA812F]" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {statistics.total_orders || 0}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400">
                        Total Semua Order
                      </div>
                    </div>
                  </div>
                </div>

                {/* Completed Orders */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-400/5 rounded-lg hover:bg-gray-400/10 transition-colors duration-200">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-400/10 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {statistics.completed_orders || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      Selesai
                    </div>
                  </div>
                </div>

                {/* Processing Orders */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-400/5 rounded-lg hover:bg-gray-400/10 transition-colors duration-200">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-400/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {statistics.processing_orders || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      Dalam Proses
                    </div>
                  </div>
                </div>

                {/* Pending Orders */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-400/5 rounded-lg hover:bg-gray-400/10 transition-colors duration-200">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-400/10 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {statistics.pending_orders || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      Menunggu
                    </div>
                  </div>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-3 sm:gap-4 mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-400/5 rounded-lg">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-400/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Member sejak
                  </p>
                  <p className="text-white font-semibold text-sm sm:text-base">
                    {currentUser.created_at
                      ? formatDate(currentUser.created_at)
                      : "2024"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
