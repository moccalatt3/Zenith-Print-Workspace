import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ShoppingCart,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Search,
  Archive,
  TrendingUp,
  Clock,
  Settings,
  ExternalLink,
  Loader,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";
import notificationService from "../../services/notificationService";

const UserNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load notifications from API dengan pagination
  const loadNotifications = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);

      const filters = {
        page: page,
        limit: limit,
        search: searchTerm,
        filter: filter !== "all" ? filter : "",
      };

      console.log("📨 Loading notifications with filters:", filters);

      const response = await notificationService.getUserNotifications(filters);

      if (response.success) {
        setNotifications(response.data.notifications || []);
        setPagination(
          response.data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: response.data.notifications?.length || 0,
            itemsPerPage: limit,
            hasNext: false,
            hasPrev: false,
          }
        );

        console.log("✅ Loaded notifications:", {
          count: response.data.notifications?.length || 0,
          total: response.data.total || 0,
          pagination: response.data.pagination,
        });
      }
    } catch (error) {
      console.error("❌ Error loading notifications:", error);
      // Fallback ke array kosong jika error
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadNotifications(1, itemsPerPage);
  }, []);

  // Search effect dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadNotifications(1, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filter]);

  // Handler untuk ganti page
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadNotifications(newPage, itemsPerPage);
    }
  };

  // Handler untuk ganti items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    loadNotifications(1, newLimit);
  };

  // Helper functions (tetap sama seperti sebelumnya)
  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_created":
      case "order_status_updated":
        return <ShoppingCart className="w-4 h-4 text-blue-400" />;
      case "payment_verified":
      case "payment_rejected":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "system_announcement":
        return <Settings className="w-4 h-4 text-orange-400" />;
      case "commission_earned":
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
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
      default:
        return type;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "order_created":
      case "order_status_updated":
        return ShoppingCart;
      case "payment_verified":
      case "payment_rejected":
        return CheckCircle;
      case "system_announcement":
        return Settings;
      case "commission_earned":
        return TrendingUp;
      default:
        return Bell;
    }
  };

  // Handle mark as read
  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Handle mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
      // Reload untuk update unread count
      loadNotifications(pagination.currentPage, itemsPerPage);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Handle archive notification
  const archiveNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      // Reload data setelah delete
      loadNotifications(pagination.currentPage, itemsPerPage);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    const relatedData = notification.related_data
      ? JSON.parse(notification.related_data)
      : {};

    switch (notification.notification_type) {
      case "order_created":
      case "order_status_updated":
        if (relatedData.order_id) {
          navigate(`/orders/${relatedData.order_id}`);
        } else {
          navigate("/orders");
        }
        break;

      case "payment_verified":
      case "payment_rejected":
        if (relatedData.order_id) {
          navigate(`/orders/${relatedData.order_id}/payment`);
        } else {
          navigate("/orders");
        }
        break;

      case "commission_earned":
        navigate("/affiliate/commissions");
        break;

      default:
        break;
    }
  };

  // Format time from database
  const formatTime = (createdAt) => {
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

  const unreadCount = notifications.filter((notif) => !notif.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-20 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FA812F] mx-auto mb-4"></div>
          <p className="text-white">Memuat notifikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
            Notifications
          </h1>
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
            Kelola dan tinjau semua notifikasi sistem
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari notifikasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent"
              />
            </div>

            {/* Filter and Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Filter Type */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent text-sm transition-all duration-200"
              >
                <option value="all" className="bg-gray-800">
                  Semua Notifikasi
                </option>
                <option value="unread" className="bg-gray-800">
                  Belum Dibaca
                </option>
                <option value="order" className="bg-gray-800">
                  Orders
                </option>
                <option value="payment" className="bg-gray-800">
                  Pembayaran
                </option>
                <option value="system" className="bg-gray-800">
                  Sistem
                </option>
              </select>

              {/* Mark All as Read Button */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Tandai Semua Dibaca
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                Daftar Notifikasi ({pagination.totalItems})
              </h2>

              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">Tampilkan:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) =>
                    handleItemsPerPageChange(Number(e.target.value))
                  }
                  className="appearance-none bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent text-sm transition-all duration-200"
                >
                  <option value={10} className="bg-gray-800">
                    10
                  </option>
                  <option value={20} className="bg-gray-800">
                    20
                  </option>
                  <option value={50} className="bg-gray-800">
                    50
                  </option>
                  <option value={100} className="bg-gray-800">
                    100
                  </option>
                </select>
                <span className="text-sm text-gray-300">per halaman</span>
              </div>
            </div>
          </div>

          <div className="p-0">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Tidak ada notifikasi yang ditemukan
                </h3>
                <p className="text-gray-400">
                  {searchTerm || filter !== "all"
                    ? "Coba ubah filter pencarian atau kata kunci"
                    : "Semua notifikasi sudah dibaca"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Tipe
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Notifikasi
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {notifications.map((notification, index) => {
                      const TypeIcon = getTypeIcon(
                        notification.notification_type
                      );
                      const isLastRow = index === notifications.length - 1;

                      return (
                        <tr
                          key={notification.id}
                          className="hover:bg-white/5 transition-all duration-150 group cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <td
                            className={`py-4 px-6 ${
                              isLastRow ? "rounded-bl-lg" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <TypeIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-white">
                                {getNotificationTypeLabel(
                                  notification.notification_type
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-medium text-white text-sm">
                              {notification.title}
                            </div>
                            <div className="text-sm text-gray-300 mt-1">
                              {notification.message}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                              <Clock className="w-3 h-3" />
                              {formatTime(notification.created_at)}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1 bg-white/5 text-white px-2 py-1 rounded text-xs font-medium">
                              {!notification.is_read ? (
                                <>
                                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                  Belum Dibaca
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  Sudah Dibaca
                                </>
                              )}
                            </span>
                          </td>
                          <td
                            className={`py-4 px-6 ${
                              isLastRow ? "rounded-br-lg" : ""
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              {!notification.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all duration-200 border border-transparent hover:border-green-500/20"
                                  title="Tandai sebagai sudah dibaca"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveNotification(notification.id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-transparent hover:border-red-500/20"
                                title="Hapus notifikasi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Section */}
          {notifications.length > 0 && (
            <div className="bg-white/5 border-t border-white/10 px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Pagination info */}
                <div className="text-sm text-gray-300">
                  Menampilkan {(pagination.currentPage - 1) * itemsPerPage + 1}{" "}
                  -{" "}
                  {Math.min(
                    pagination.currentPage * itemsPerPage,
                    pagination.totalItems
                  )}{" "}
                  dari {pagination.totalItems} notifikasi
                </div>

                {/* Pagination controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                    className="p-2 border border-white/20 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-200"
                    title="Halaman pertama"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="p-2 border border-white/20 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-200"
                    title="Halaman sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page numbers */}
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (
                        pagination.currentPage >=
                        pagination.totalPages - 2
                      ) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 border rounded-lg text-sm font-medium transition-all duration-200 ${
                            pagination.currentPage === pageNum
                              ? "bg-[#FA812F] text-white border-[#FA812F]"
                              : "border-white/20 text-white hover:bg-white/10"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}

                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="p-2 border border-white/20 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-200"
                    title="Halaman berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="p-2 border border-white/20 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-200"
                    title="Halaman terakhir"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserNotifications;
