import { useState, useEffect } from "react";
import { authService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  MessageSquare,
  ShoppingCart,
  Settings,
  CheckCircle,
  TrendingUp,
  Users,
  Menu,
} from "lucide-react";
import notificationService from "../services/notificationService";

const TopbarAdmin = () => {
  const user = authService.getCurrentUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load notifications from API
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getAdminNotifications({
        page: 1,
        limit: 10,
      });
      if (response.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error("Error loading admin notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getAdminUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      console.error("Error loading admin unread count:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_created":
      case "order_status_updated":
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case "payment_verified":
      case "payment_rejected":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "system_announcement":
        return <Settings className="w-4 h-4 text-orange-600" />;
      case "commission_earned":
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case "new_customer":
        return <Users className="w-4 h-4 text-indigo-600" />;
      case "new_affiliate":
        return <Users className="w-4 h-4 text-teal-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case "order_created":
        return "Pesanan Baru";
      case "order_status_updated":
        return "Status Pesanan";
      case "payment_verified":
        return "Pembayaran Diverifikasi";
      case "payment_rejected":
        return "Pembayaran Ditolak";
      case "system_announcement":
        return "Sistem";
      case "commission_earned":
        return "Komisi";
      case "new_customer":
        return "Customer Baru";
      case "new_affiliate":
        return "Affiliate Baru";
      default:
        return type;
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return "Baru saja";

    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;

    return created.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ✅ SIMPLE: Langsung redirect ke halaman notifications
  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read first if unread
      if (!notification.is_read) {
        await notificationService.markAdminAsRead(notification.id);
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notification.id ? { ...notif, is_read: true } : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      setIsNotificationsOpen(false);

      // ✅ LANGSUNG REDIRECT KE HALAMAN NOTIFICATIONS
      navigate("/admin/notifications");
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAdminAsRead();
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest(".user-dropdown")) {
        setIsDropdownOpen(false);
      }
      if (
        isNotificationsOpen &&
        !event.target.closest(".notifications-dropdown")
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationsOpen]);

  return (
    <header className="bg-white border-b border-gray-200 h-[70px] flex items-center lg:pl-64">
      <div className="flex justify-between lg:justify-end items-center w-full px-4 lg:px-6">
        {/* Mobile Title - Hidden on desktop */}
        <div className="lg:hidden pl-13">
          <h1 className="text-lg font-bold text-gray-800">Admin Panel</h1>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Notifications with Count */}
          <div className="relative notifications-dropdown">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-lg hover:bg-gray-50"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute top-12 -right-4 mt-2 w-[280px] sm:w-[320px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Notifikasi
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white text-[10px] rounded-full font-medium">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[10px] text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Tandai semua
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center items-center py-6">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-6">
                      <Bell className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">
                        Tidak ada notifikasi
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-2.5 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
                          !notification.is_read ? "bg-orange-50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-gray-100 flex-shrink-0">
                            {getNotificationIcon(
                              notification.notification_type
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-medium text-gray-900 line-clamp-1 flex-1">
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0 mt-0.5"></div>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-gray-400">
                                {getNotificationTypeLabel(
                                  notification.notification_type
                                )}
                              </span>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">
                                {formatTime(notification.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-3 py-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate("/admin/notifications");
                    }}
                    className="w-full text-center text-xs text-gray-600 hover:text-gray-800 font-medium py-1"
                  >
                    Lihat Semua
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative user-dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || "A"}
                </span>
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || "Admin User"}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === "admin"
                    ? "Administrator"
                    : user?.role || "Administrator"}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email || "admin@print3d.com"}
                  </p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate("/admin/settings");
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <MessageSquare className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate text-xs">Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate("/admin/notifications");
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Bell className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate text-xs">Notifications</span>
                  </button>
                </div>

                <div className="border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      authService.logout();
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate text-xs">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopbarAdmin;
