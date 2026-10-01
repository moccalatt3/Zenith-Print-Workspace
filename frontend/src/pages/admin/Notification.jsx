import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ShoppingCart,
  CheckCircle,
  Search,
  Settings,
  Users,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import notificationService from "../../services/notificationService";

// Constants untuk avoid magic strings
const FILTER_TYPES = {
  ALL: 'all',
  UNREAD: 'unread',
  ORDER: 'order',
  PAYMENT: 'payment',
  SYSTEM: 'system',
  USER: 'user'
};

const NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_STATUS_UPDATED: 'order_status_updated',
  PAYMENT_VERIFIED: 'payment_verified',
  PAYMENT_REJECTED: 'payment_rejected',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  NEW_CUSTOMER: 'new_customer',
  NEW_AFFILIATE: 'new_affiliate'
};

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState(FILTER_TYPES.ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Mobile filter state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  });

  const navigate = useNavigate();

  // Load notifications dengan useCallback
  const loadNotifications = useCallback(async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);

      const response = await notificationService.getAdminNotifications({
        page: page,
        limit: limit,
        search: searchTerm,
      });

      if (response.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);

        if (response.pagination) {
          setPagination(response.pagination);
        } else {
          setPagination({
            currentPage: page,
            totalPages: Math.ceil(
              (response.data.total || response.data.notifications?.length || 0) / limit
            ),
            totalItems: response.data.total || response.data.notifications?.length || 0,
            itemsPerPage: limit,
            hasNext: false,
            hasPrev: false,
          });
        }
      }
    } catch (error) {
      console.error("Error loading ADMIN notifications:", error);
      setPagination((prev) => ({
        ...prev,
        totalItems: notifications.length,
      }));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, itemsPerPage, notifications.length]);

  // Initial load
  useEffect(() => {
    loadNotifications(1, itemsPerPage);
  }, [loadNotifications, itemsPerPage]);

  // Search effect dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadNotifications(1, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filter, loadNotifications, itemsPerPage]);

  // Reset selection ketika data berubah
  useEffect(() => {
    setSelectedNotifications([]);
    setSelectAll(false);
  }, [notifications, pagination.currentPage, filter, searchTerm]);

  // Handler functions dengan useCallback
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      loadNotifications(newPage, itemsPerPage);
    }
  }, [pagination?.totalPages, loadNotifications, itemsPerPage]);

  const handleItemsPerPageChange = useCallback((newLimit) => {
    setItemsPerPage(newLimit);
    loadNotifications(1, newLimit);
  }, [loadNotifications]);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map((notif) => notif.id));
    }
    setSelectAll(!selectAll);
  }, [selectAll, notifications]);

  const handleSelectNotification = useCallback((id) => {
    setSelectedNotifications((prev) => {
      const newSelection = prev.includes(id)
        ? prev.filter((notificationId) => notificationId !== id)
        : [...prev, id];
      
      setSelectAll(newSelection.length === notifications.length && notifications.length > 0);
      
      return newSelection;
    });
  }, [notifications.length]);

  // Stats data dengan useMemo
  const stats = useMemo(() => [
    {
      title: "Total Notifications Admin",
      value: pagination.totalItems.toString(),
      icon: Bell,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    {
      title: "Unread Admin",
      value: unreadCount.toString(),
      icon: CheckCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    {
      title: "Order Notifications",
      value: notifications.filter(
        (n) => n.notification_type === NOTIFICATION_TYPES.ORDER_CREATED ||
               n.notification_type === NOTIFICATION_TYPES.ORDER_STATUS_UPDATED
      ).length.toString(),
      icon: ShoppingCart,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    {
      title: "Payment Notifications",
      value: notifications.filter(
        (n) => n.notification_type === NOTIFICATION_TYPES.PAYMENT_VERIFIED ||
               n.notification_type === NOTIFICATION_TYPES.PAYMENT_REJECTED
      ).length.toString(),
      icon: CheckCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  ], [pagination.totalItems, unreadCount, notifications]);

  // Helper functions
  const getNotificationTypeLabel = useCallback((type) => {
    switch (type) {
      case NOTIFICATION_TYPES.ORDER_CREATED:
        return "Pesanan Baru";
      case NOTIFICATION_TYPES.ORDER_STATUS_UPDATED:
        return "Status Pesanan";
      case NOTIFICATION_TYPES.PAYMENT_VERIFIED:
        return "Pembayaran Diverifikasi";
      case NOTIFICATION_TYPES.PAYMENT_REJECTED:
        return "Pembayaran Ditolak";
      case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
        return "Sistem";
      case NOTIFICATION_TYPES.NEW_CUSTOMER:
        return "Customer Baru";
      case NOTIFICATION_TYPES.NEW_AFFILIATE:
        return "Affiliate Baru";
      default:
        return type;
    }
  }, []);

  const getTypeIcon = useCallback((type) => {
    switch (type) {
      case NOTIFICATION_TYPES.ORDER_CREATED:
      case NOTIFICATION_TYPES.ORDER_STATUS_UPDATED:
        return ShoppingCart;
      case NOTIFICATION_TYPES.PAYMENT_VERIFIED:
      case NOTIFICATION_TYPES.PAYMENT_REJECTED:
        return CheckCircle;
      case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
        return Settings;
      case NOTIFICATION_TYPES.NEW_CUSTOMER:
      case NOTIFICATION_TYPES.NEW_AFFILIATE:
        return Users;
      default:
        return Bell;
    }
  }, []);

  // Filtered notifications dengan useMemo
  const filteredNotifications = useMemo(() => 
    notifications.filter((notif) => {
      const matchesFilter =
        filter === FILTER_TYPES.ALL ||
        (filter === FILTER_TYPES.UNREAD && !notif.is_read) ||
        (filter === FILTER_TYPES.ORDER &&
          (notif.notification_type === NOTIFICATION_TYPES.ORDER_CREATED ||
            notif.notification_type === NOTIFICATION_TYPES.ORDER_STATUS_UPDATED)) ||
        (filter === FILTER_TYPES.PAYMENT &&
          (notif.notification_type === NOTIFICATION_TYPES.PAYMENT_VERIFIED ||
            notif.notification_type === NOTIFICATION_TYPES.PAYMENT_REJECTED)) ||
        (filter === FILTER_TYPES.SYSTEM &&
          notif.notification_type === NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT) ||
        (filter === FILTER_TYPES.USER &&
          (notif.notification_type === NOTIFICATION_TYPES.NEW_CUSTOMER ||
            notif.notification_type === NOTIFICATION_TYPES.NEW_AFFILIATE));

      const matchesSearch =
        notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFilter && matchesSearch;
    }), [notifications, filter, searchTerm]);

  // Action handlers
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationService.markAdminAsRead(id);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking ADMIN notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      setActionLoading(true);
      await notificationService.markAllAdminAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all ADMIN notifications as read:", error);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const archiveNotification = useCallback(async (id) => {
    try {
      const notificationToDelete = notifications.find((n) => n.id === id);
      const wasUnread = notificationToDelete && !notificationToDelete.is_read;

      await notificationService.deleteAdminNotification(id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));

      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      if (notifications.length === 1 && pagination.currentPage > 1) {
        loadNotifications(pagination.currentPage - 1, itemsPerPage);
      } else {
        loadNotifications(pagination.currentPage, itemsPerPage);
      }
    } catch (error) {
      console.error("Error deleting ADMIN notification:", error);
    }
  }, [notifications, pagination.currentPage, itemsPerPage, loadNotifications]);

  const deleteAllNotifications = useCallback(async () => {
    if (notifications.length === 0) return;

    try {
      setActionLoading(true);
      await notificationService.deleteAllAdminNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setPagination((prev) => ({
        ...prev,
        totalItems: 0,
      }));
    } catch (error) {
      console.error("Error deleting all ADMIN notifications:", error);
    } finally {
      setActionLoading(false);
    }
  }, [notifications.length]);

  const markSelectedAsRead = useCallback(async () => {
    if (selectedNotifications.length === 0 || actionLoading) return;

    try {
      setActionLoading(true);
      
      const promises = selectedNotifications.map((id) =>
        notificationService.markAdminAsRead(id)
      );
      
      await Promise.all(promises);
      
      setNotifications((prev) =>
        prev.map((notif) =>
          selectedNotifications.includes(notif.id)
            ? { ...notif, is_read: true }
            : notif
        )
      );

      const markedUnreadCount = notifications.filter(
        (notif) => selectedNotifications.includes(notif.id) && !notif.is_read
      ).length;
      setUnreadCount((prev) => Math.max(0, prev - markedUnreadCount));

      setSelectedNotifications([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error marking selected notifications as read:", error);
    } finally {
      setActionLoading(false);
    }
  }, [selectedNotifications, actionLoading, notifications]);

  const deleteSelectedNotifications = useCallback(async () => {
    if (selectedNotifications.length === 0 || actionLoading) return;

    try {
      setActionLoading(true);
      
      const promises = selectedNotifications.map((id) =>
        notificationService.deleteAdminNotification(id)
      );
      
      await Promise.all(promises);

      const deletedUnreadCount = notifications.filter(
        (notif) => selectedNotifications.includes(notif.id) && !notif.is_read
      ).length;

      setNotifications((prev) =>
        prev.filter((notif) => !selectedNotifications.includes(notif.id))
      );

      setUnreadCount((prev) => Math.max(0, prev - deletedUnreadCount));
      setSelectedNotifications([]);
      setSelectAll(false);

      if (notifications.length === selectedNotifications.length && pagination.currentPage > 1) {
        loadNotifications(pagination.currentPage - 1, itemsPerPage);
      } else {
        loadNotifications(pagination.currentPage, itemsPerPage);
      }
    } catch (error) {
      console.error("Error deleting selected notifications:", error);
    } finally {
      setActionLoading(false);
    }
  }, [selectedNotifications, actionLoading, notifications, pagination.currentPage, itemsPerPage, loadNotifications]);

  // Format time function
  const formatTime = useCallback((createdAt) => {
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
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Notifications Admin
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Kelola dan tinjau semua notifikasi sistem admin
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {notifications.length > 0 && (
            <button
              onClick={deleteAllNotifications}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#000000] to-[#333333] text-white rounded-lg hover:from-[#333333] hover:to-[#555555] transition-all duration-200 font-medium text-sm w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Semua
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm w-full sm:w-auto justify-center"
            >
              {actionLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Tandai Semua Dibaca
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="bg-white p-4 sm:p-5 rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                  <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar untuk Selected Items */}
      {selectedNotifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-blue-800 font-medium text-sm">
                {selectedNotifications.length} notifikasi dipilih
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={markSelectedAsRead}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto justify-center"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Tandai Dibaca
              </button>
              <button
                onClick={deleteSelectedNotifications}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto justify-center"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari notifikasi admin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
          />
        </div>

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200"
          >
            <span className="font-medium text-gray-900 text-sm">
              Filter Notifikasi
            </span>
            {isMobileFilterOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {isMobileFilterOpen && (
            <div className="mt-2 bg-white border border-gray-300 rounded-lg shadow-sm p-3">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Notifikasi
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  >
                    <option value={FILTER_TYPES.ALL}>Semua Notifikasi Admin</option>
                    <option value={FILTER_TYPES.UNREAD}>Belum Dibaca</option>
                    <option value={FILTER_TYPES.ORDER}>Orders</option>
                    <option value={FILTER_TYPES.PAYMENT}>Pembayaran</option>
                    <option value={FILTER_TYPES.SYSTEM}>Sistem</option>
                    <option value={FILTER_TYPES.USER}>User & Affiliate</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Filter */}
        <div className="hidden lg:block">
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value={FILTER_TYPES.ALL}>Semua Notifikasi Admin</option>
              <option value={FILTER_TYPES.UNREAD}>Belum Dibaca</option>
              <option value={FILTER_TYPES.ORDER}>Orders</option>
              <option value={FILTER_TYPES.PAYMENT}>Pembayaran</option>
              <option value={FILTER_TYPES.SYSTEM}>Sistem</option>
              <option value={FILTER_TYPES.USER}>User & Affiliate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Daftar Notifikasi Admin ({pagination?.totalItems || 0})
          </h2>
        </div>

        <div className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Bell className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Tidak ada notifikasi admin yang ditemukan
              </h3>
              <p className="text-gray-500 text-sm px-4">
                {searchTerm || filter !== FILTER_TYPES.ALL
                  ? "Coba ubah filter pencarian atau kata kunci"
                  : "Semua notifikasi admin sudah dibaca"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="w-full hidden lg:table">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tl-lg w-12">
                      <input
                        type="checkbox"
                        checked={selectAll && notifications.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                      />
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Notifikasi
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Waktu
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tr-lg">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification, index) => {
                    const TypeIcon = getTypeIcon(notification.notification_type);
                    const isLastRow = index === filteredNotifications.length - 1;
                    const isSelected = selectedNotifications.includes(notification.id);

                    return (
                      <tr
                        key={notification.id}
                        className={`hover:bg-gray-50 transition-all duration-150 group ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className={`py-4 px-6 ${isLastRow ? "rounded-bl-lg" : ""}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectNotification(notification.id)}
                            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {getNotificationTypeLabel(notification.notification_type)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              !notification.is_read
                                ? "bg-gray-100 text-gray-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {!notification.is_read ? (
                              <>
                                <Bell className="w-3 h-3" />
                                Belum Dibaca
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Sudah Dibaca
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {formatTime(notification.created_at)}
                          </div>
                        </td>
                        <td className={`py-4 px-6 ${isLastRow ? "rounded-br-lg" : ""}`}>
                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
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
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
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

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3 p-4">
                {filteredNotifications.map((notification) => {
                  const TypeIcon = getTypeIcon(notification.notification_type);
                  const isSelected = selectedNotifications.includes(notification.id);

                  return (
                    <div
                      key={notification.id}
                      className={`bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200 ${
                        isSelected ? "bg-blue-50 border-blue-200" : ""
                      }`}
                    >
                      {/* Header dengan Checkbox dan Type */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectNotification(notification.id)}
                            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 mt-1 flex-shrink-0"
                          />
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <TypeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900 truncate">
                              {getNotificationTypeLabel(notification.notification_type)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            !notification.is_read
                              ? "bg-gray-100 text-gray-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {!notification.is_read ? (
                            <>
                              <Bell className="w-3 h-3" />
                              Belum
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Sudah
                            </>
                          )}
                        </span>
                      </div>

                      {/* Content */}
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>

                      {/* Footer dengan Time dan Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          {formatTime(notification.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
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
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Hapus notifikasi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination Section */}
          {!loading && filteredNotifications.length > 0 && (
            <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-700">Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-2 sm:px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-xs sm:text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs sm:text-sm text-gray-700">per halaman</span>
                </div>

                {/* Pagination info */}
                <div className="text-xs sm:text-sm text-gray-700 text-center">
                  Menampilkan{" "}
                  {((pagination?.currentPage || 1) - 1) * itemsPerPage + 1} -{" "}
                  {Math.min(
                    (pagination?.currentPage || 1) * itemsPerPage,
                    pagination?.totalItems || 0
                  )}{" "}
                  dari {pagination?.totalItems || 0} notifikasi admin
                </div>

                {/* Pagination controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination?.currentPage === 1}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => handlePageChange((pagination?.currentPage || 1) - 1)}
                    disabled={!pagination?.hasPrev}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    «
                  </button>

                  {/* Page numbers */}
                  {Array.from(
                    { length: Math.min(5, pagination?.totalPages || 1) },
                    (_, i) => {
                      let pageNum;
                      const totalPages = pagination?.totalPages || 1;
                      const currentPage = pagination?.currentPage || 1;

                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-2 sm:px-3 py-1.5 border rounded-lg text-xs sm:text-sm font-medium ${
                            currentPage === pageNum
                              ? "bg-orange-500 text-white border-orange-500"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                  
                  <button
                    onClick={() => handlePageChange((pagination?.currentPage || 1) + 1)}
                    disabled={!pagination?.hasNext}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    »
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination?.totalPages || 1)}
                    disabled={(pagination?.currentPage || 1) === (pagination?.totalPages || 1)}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    »»
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

export default Notification;