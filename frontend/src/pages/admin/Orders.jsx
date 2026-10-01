import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Package,
  CreditCard,
  Printer,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  XCircle,
  Loader,
  Truck,
  Download,
  User,
  Mail,
  Calendar,
  DollarSign,
  FileText,
  Building,
  Users,
  X,
} from "lucide-react";
import adminOrderService from "../../services/adminOrderService";
import adminHistoryService from "../../services/adminHistoryService";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");

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

  const handleDeleteFromHistory = async (orderId, orderNumber) => {
    if (!orderId) {
      alert("Error: Order ID tidak valid");
      return;
    }

    // Konfirmasi delete
    if (
      !confirm(
        `Yakin ingin menghapus order ${orderNumber} dari riwayat?\n\nStatus order harus "completed" atau "cancelled" untuk dapat dihapus.`
      )
    ) {
      return;
    }

    try {
      const response = await adminOrderService.deleteOrder(orderId);
      if (response.success) {
        alert(`✅ ${response.message}`);
        // Refresh data setelah delete
        fetchOrders(pagination.currentPage, itemsPerPage);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      const errorMessage =
        error.response?.data?.message || "Gagal menghapus order";
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleMoveToHistory = async () => {
    if (
      !confirm(
        "🚨 PERINGATAN: Yakin ingin memindahkan SEMUA order yang statusnya COMPLETE ke halaman Riwayat?\n\n" +
          "✅ Order yang dipindahkan akan:\n" +
          "   • Hilang PERMANEN dari halaman Orders\n" +
          "   • Tersedia di halaman Riwayat dengan data lengkap\n" +
          "   • Tidak dapat dikembalikan ke halaman Orders\n\n" +
          "📊 Proses ini akan memindahkan semua data termasuk items, pembayaran, dan history status."
      )
    ) {
      return;
    }

    try {
      console.log("🔄 Starting COMPLETE move to history process...");

      // Show loading state
      setLoading(true);

      const response = await adminHistoryService.moveCompletedToHistory();

      if (response.success) {
        const movedCount = response.data?.movedCount || 0;
        const failedCount = response.data?.failedCount || 0;

        let alertMessage = `✅ ${response.message}\n\n`;
        alertMessage += `📊 Hasil:\n`;
        alertMessage += `   • Berhasil dipindahkan: ${movedCount} order\n`;

        if (failedCount > 0) {
          alertMessage += `   • Gagal dipindahkan: ${failedCount} order\n`;
        }

        if (
          response.data?.movedOrders &&
          response.data.movedOrders.length > 0
        ) {
          alertMessage += `\n📋 Order yang berhasil dipindahkan:\n`;
          response.data.movedOrders.forEach((orderNum, index) => {
            if (index < 5) {
              // Show max 5 orders
              alertMessage += `   • ${orderNum}\n`;
            }
          });
          if (response.data.movedOrders.length > 5) {
            alertMessage += `   • ...dan ${
              response.data.movedOrders.length - 5
            } order lainnya\n`;
          }
        }

        alert(alertMessage);
        console.log("📊 Complete move result:", response.data);

        // Refresh semua data
        fetchOrders(pagination.currentPage, itemsPerPage);
        fetchStats();
      } else {
        alert(`❌ ${response.message}`);
      }
    } catch (error) {
      console.error("❌ Error moving to history:", error);

      let errorMessage = "❌ Gagal memindahkan order ke riwayat.\n";

      if (error.message) {
        errorMessage += `\nDetail: ${error.message}`;
      } else if (error.response?.data?.message) {
        errorMessage += `\nDetail: ${error.response.data.message}`;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders dengan pagination
  const fetchOrders = async (page = 1, limit = itemsPerPage) => {
    setLoading(true);
    try {
      const filters = {
        page: page,
        limit: limit,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : "",
        payment_status: paymentFilter !== "all" ? paymentFilter : "",
        user_type: userTypeFilter !== "all" ? userTypeFilter : "",
      };

      const response = await adminOrderService.getAllOrders(filters);
      if (response.success) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      alert(error.message || "Gagal mengambil data orders");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk ganti page
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage, itemsPerPage);
    }
  };

  // Handler untuk ganti items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    fetchOrders(1, newLimit);
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await adminOrderService.getOrderStats();
      if (response.success) {
        const statsData = response.data.overview;

        const formattedStats = [
          {
            title: "Total Orders",
            value: statsData.total_orders?.toString() || "0",
            change: "+12%",
            trend: "up",
            icon: Package,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
          },
          {
            title: "Individual Orders",
            value: statsData.individual_orders?.toString() || "0",
            change: `${statsData.individual_orders || 0} orders`,
            trend: "up",
            icon: Users,
            color: "text-green-600",
            bgColor: "bg-green-100",
          },
          {
            title: "Company Orders",
            value: statsData.company_orders?.toString() || "0",
            change: `${statsData.company_orders || 0} orders`,
            trend: "up",
            icon: Building,
            color: "text-purple-600",
            bgColor: "bg-purple-100",
          },
          {
            title: "In Production",
            value: statsData.in_production_orders?.toString() || "0",
            change: `${statsData.in_production_orders || 0} orders`,
            trend: "up",
            icon: Printer,
            color: "text-orange-600",
            bgColor: "bg-orange-100",
          },
        ];

        setStats(formattedStats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Use default stats if API fails
      const individualOrders = orders.filter(
        (o) => o.user_type === "individual"
      ).length;
      const companyOrders = orders.filter(
        (o) => o.user_type === "company"
      ).length;
      const inProductionOrders = orders.filter((o) =>
        [
          "processing",
          "printing",
          "quality_check",
          "payment_received",
        ].includes(o.order_status)
      ).length;

      setStats([
        {
          title: "Total Orders",
          value: orders.length.toString(),
          change: "+12%",
          trend: "up",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
        },
        {
          title: "Individual Orders",
          value: individualOrders.toString(),
          change: `${individualOrders} orders`,
          trend: "up",
          icon: Users,
          color: "text-green-600",
          bgColor: "bg-green-100",
        },
        {
          title: "Company Orders",
          value: companyOrders.toString(),
          change: `${companyOrders} orders`,
          trend: "up",
          icon: Building,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
        },
        {
          title: "In Production",
          value: inProductionOrders.toString(),
          change: `${inProductionOrders} orders`,
          trend: "up",
          icon: Printer,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
        },
      ]);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOrders(1, itemsPerPage);
    fetchStats();
  }, []);

  // Search effect dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrders(1, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, paymentFilter, userTypeFilter]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Get status badge color - SESUAI STRUCTURE BARU
  const getStatusBadge = (status, userType = "individual") => {
    const statusConfig = {
      // Status baru sesuai database
      under_review: {
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        text: "UNDER REVIEW",
      },
      waiting_payment: {
        color: "bg-orange-100 text-orange-800",
        icon: CreditCard,
        text: "MENUNGGU PEMBAYARAN",
      },
      payment_received: {
        color: "bg-blue-100 text-blue-800",
        icon: CheckCircle,
        text: "PEMBAYARAN DITERIMA",
      },
      printing: {
        color: "bg-purple-100 text-purple-800",
        icon: Printer,
        text: "PRINTING",
      },
      final_touchup: {
        color: "bg-indigo-100 text-indigo-800",
        icon: Package,
        text: "FINAL TOUCHUP",
      },
      ready_to_ship: {
        color: "bg-teal-100 text-teal-800",
        icon: Truck,
        text: "SIAP KIRIM",
      },
      completed: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        text: "SELESAI",
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        text: "DIBATALKAN",
      },
    };

    return statusConfig[status] || statusConfig.under_review;
  };

  // Get payment status badge - SESUAI STRUCTURE BARU
  const getPaymentBadge = (status, userType = "individual") => {
    const paymentConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", text: "MENUNGGU" },
      paid: { color: "bg-green-100 text-green-800", text: "LUNAS" },
      completed: { color: "bg-blue-100 text-blue-800", text: "COMPLETED" },
    };

    return paymentConfig[status] || paymentConfig.pending;
  };

  // Get user type badge
  const getUserTypeBadge = (userType) => {
    const userTypeConfig = {
      individual: {
        color: "bg-green-100 text-green-800",
        icon: Users,
        text: "INDIVIDUAL",
      },
      company: {
        color: "bg-purple-100 text-purple-800",
        icon: Building,
        text: "COMPANY",
      },
    };

    return userTypeConfig[userType] || userTypeConfig.individual;
  };

  // Get item status badge - SESUAI STRUCTURE BARU
  const getItemStatusBadge = (status) => {
    const itemStatusConfig = {
      pending: {
        color: "bg-gray-100 text-gray-800",
        text: "PENDING",
      },
      processing: {
        color: "bg-blue-100 text-blue-800",
        text: "PROCESSING",
      },
      printing: {
        color: "bg-purple-100 text-purple-800",
        text: "PRINTING",
      },
      quality_check: {
        color: "bg-orange-100 text-orange-800",
        text: "QUALITY CHECK",
      },
      completed: {
        color: "bg-green-100 text-green-800",
        text: "COMPLETED",
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        text: "CANCELLED",
      },
    };

    return itemStatusConfig[status] || itemStatusConfig.pending;
  };

  // Handle view detail
  const handleViewDetail = async (order) => {
    try {
      const response = await adminOrderService.getOrderDetail(order.id);
      if (response.success) {
        setSelectedOrder(response.data);
        setIsDetailModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching order detail:", error);
      alert(error.message || "Gagal mengambil detail order");
    }
  };

  // Handle edit order
  const handleEditOrder = async (order) => {
    try {
      const response = await adminOrderService.getOrderDetail(order.id);
      if (response.success) {
        setSelectedOrder(response.data);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching order detail for edit:", error);
      alert(error.message || "Gagal mengambil detail order untuk edit");
    }
  };

  // Handle delete order
  const handleDeleteOrder = (order) => {
    // ✅ PASTIKAN ORDER ADA DAN PUNYA ID
    if (!order || !order.id) {
      console.error("Order tidak valid:", order);
      alert("Error: Data order tidak valid");
      return;
    }

    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete order
  const confirmDeleteOrder = async () => {
    if (!selectedOrder) {
      alert("Tidak ada order yang dipilih untuk dihapus");
      return;
    }

    // ✅ VALIDASI STATUS - hanya izinkan completed dan cancelled
    const allowedStatuses = ["completed", "cancelled"];
    if (!allowedStatuses.includes(selectedOrder.order_status)) {
      alert(
        `Tidak dapat menghapus order dengan status "${selectedOrder.order_status}". Hanya order dengan status "completed" atau "cancelled" yang dapat dihapus.`
      );
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      const response = await adminOrderService.deleteOrder(selectedOrder.id);
      if (response.success) {
        alert(`✅ ${response.message}`);
        setIsDeleteModalOpen(false);
        setSelectedOrder(null);
        fetchOrders(pagination.currentPage, itemsPerPage);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      const errorMessage =
        error.response?.data?.message || "Gagal menghapus order";
      alert(`❌ ${errorMessage}`);
    }
  };

  // Update order status - SESUAI STRUCTURE BARU
  const updateOrderStatus = async (
    orderId,
    newStatus,
    adminNotes = "",
    userType = "individual"
  ) => {
    try {
      const response = await adminOrderService.updateOrderStatus(orderId, {
        status: newStatus,
        admin_notes: adminNotes,
        reason: `Status diubah oleh admin`,
      });

      if (response.success) {
        alert("Status order berhasil diperbarui");
        fetchOrders(pagination.currentPage, itemsPerPage);

        if (selectedOrder && selectedOrder.order.id === orderId) {
          const detailResponse = await adminOrderService.getOrderDetail(
            orderId
          );
          if (detailResponse.success) {
            setSelectedOrder(detailResponse.data);
          }
        }
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert(error.message || "Gagal memperbarui status order");
    }
  };

  // Update payment status - SESUAI STRUCTURE BARU
  const updatePaymentStatus = async (
    orderId,
    newPaymentStatus,
    userType = "individual"
  ) => {
    try {
      const response = await adminOrderService.updatePaymentStatus(orderId, {
        payment_status: newPaymentStatus,
      });

      if (response.success) {
        alert("Status pembayaran berhasil diperbarui");
        fetchOrders(pagination.currentPage, itemsPerPage);

        if (selectedOrder && selectedOrder.order.id === orderId) {
          const detailResponse = await adminOrderService.getOrderDetail(
            orderId
          );
          if (detailResponse.success) {
            setSelectedOrder(detailResponse.data);
          }
        }
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert(error.message || "Gagal memperbarui status pembayaran");
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">All Orders</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Kelola semua pesanan pelanggan (Individual & Company)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tombol untuk pindahkan ke riwayat */}
          <button
            onClick={handleMoveToHistory}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium w-full sm:w-auto justify-center"
          >
            <CheckCircle className="w-4 h-4" />
            Pindah Data Ke Riwayat
          </button>
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

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Daftar Pesanan
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {loading
                ? "Memuat..."
                : `${pagination.totalItems} pesanan ditemukan`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pesanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              />
            </div>

            {/* User Type Filter */}
            <select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value="all">Semua Tipe</option>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>

            {/* Status Filter - SESUAI STRUCTURE BARU */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="under_review">Under Review</option>
              <option value="waiting_payment">Menunggu Pembayaran</option>
              <option value="payment_received">Pembayaran Diterima</option>
              <option value="printing">Printing</option>
              <option value="final_touchup">Final Touchup</option>
              <option value="ready_to_ship">Siap Kirim</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Filter - SESUAI STRUCTURE BARU */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value="all">Semua Pembayaran</option>
              <option value="pending">Menunggu</option>
              <option value="paid">Lunas</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-600 text-sm">Memuat data orders...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="w-full hidden lg:table">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tl-lg">
                      Order ID
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Pembayaran
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tr-lg">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order, index) => {
                    const statusConfig = getStatusBadge(
                      order.order_status,
                      order.user_type
                    );
                    const paymentConfig = getPaymentBadge(
                      order.payment_status,
                      order.user_type
                    );
                    const userTypeConfig = getUserTypeBadge(order.user_type);
                    const StatusIcon = statusConfig.icon;
                    const UserTypeIcon = userTypeConfig.icon;

                    const isLastRow = index === orders.length - 1;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition-all duration-150 group"
                      >
                        <td
                          className={`py-4 px-6 ${
                            isLastRow ? "rounded-bl-lg" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {order.order_number}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {new Date(order.created_at).toLocaleDateString(
                                  "id-ID"
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {order.customer_name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {order.customer_email}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${userTypeConfig.color}`}
                            >
                              {userTypeConfig.text}
                            </span>
                            {order.user_type === "company" &&
                              order.company_name && (
                                <div className="text-xs text-gray-600">
                                  {order.company_name}
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="font-bold text-gray-900">
                              {formatCurrency(order.total_amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.item_count} items
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${paymentConfig.color}`}
                            >
                              {paymentConfig.text}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                          >
                            {statusConfig.text}
                          </span>
                        </td>
                        <td
                          className={`py-4 px-6 ${
                            isLastRow ? "rounded-br-lg" : ""
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetail(order)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Detail Order"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                              title="Edit Order"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Hapus Order"
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
                {orders.map((order) => {
                  const statusConfig = getStatusBadge(
                    order.order_status,
                    order.user_type
                  );
                  const paymentConfig = getPaymentBadge(
                    order.payment_status,
                    order.user_type
                  );
                  const userTypeConfig = getUserTypeBadge(order.user_type);

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm">
                              #{order.order_number}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${userTypeConfig.color}`}
                            >
                              {userTypeConfig.text}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {order.customer_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.customer_email}
                        </p>
                        {order.user_type === "company" && order.company_name && (
                          <p className="text-xs text-gray-600 mt-1">
                            {order.company_name}
                          </p>
                        )}
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.item_count} items
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                            >
                              {statusConfig.text}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Pembayaran</p>
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${paymentConfig.color}`}
                            >
                              {paymentConfig.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewDetail(order)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Detail Order"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Edit Order"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Hapus Order"
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

          {/* Empty State */}
          {!loading && orders.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Tidak ada pesanan yang ditemukan
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Coba ubah filter pencarian atau periksa kembali
              </p>
            </div>
          )}

          {/* Pagination Section */}
          {!loading && orders.length > 0 && (
            <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-700">Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) =>
                      handleItemsPerPageChange(Number(e.target.value))
                    }
                    className="px-2 sm:px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-xs sm:text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs sm:text-sm text-gray-700">
                    per halaman
                  </span>
                </div>

                {/* Pagination info */}
                <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                  Menampilkan {(pagination.currentPage - 1) * itemsPerPage + 1}{" "}
                  -{" "}
                  {Math.min(
                    pagination.currentPage * itemsPerPage,
                    pagination.totalItems
                  )}{" "}
                  dari {pagination.totalItems} pesanan
                </div>

                {/* Pagination controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    «
                  </button>

                  {/* Page numbers */}
                  {Array.from(
                    { length: Math.min(3, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage <= 2) {
                        pageNum = i + 1;
                      } else if (
                        pagination.currentPage >=
                        pagination.totalPages - 1
                      ) {
                        pageNum = pagination.totalPages - 2 + i;
                      } else {
                        pageNum = pagination.currentPage - 1 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-2 sm:px-3 py-1.5 border rounded-lg text-xs sm:text-sm font-medium ${
                            pagination.currentPage === pageNum
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
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    »
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
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

      {/* Detail Modal */}
      {isDetailModalOpen && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
          onUpdate={handleEditOrder}
          getItemStatusBadge={getItemStatusBadge}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedOrder && (
        <DeleteConfirmationModal
          order={selectedOrder}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedOrder(null);
          }}
          onConfirm={confirmDeleteOrder}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedOrder(null);
          }}
          onUpdate={fetchOrders}
          onStatusUpdate={updateOrderStatus}
          onPaymentUpdate={updatePaymentStatus}
        />
      )}
    </div>
  );
};

const OrderDetailModal = ({
  order,
  isOpen,
  onClose,
  onUpdate,
  getItemStatusBadge,
}) => {
  if (!isOpen) return null;

  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // ✅ PERBAIKAN: Gunakan URL langsung dari backend (tidak perlu reconstruct)
  const getFullImageUrl = (imagePath) => {
    if (!imagePath) {
      console.log("❌ Image path is null/undefined");
      return null;
    }

    console.log("🔍 Image path from backend:", imagePath);

    // ✅ JIKA BACKEND SUDAH MEMBERIKAN FULL URL, GUNAKAN LANGSUNG
    if (imagePath.startsWith("http")) {
      console.log("✅ Backend already provided full URL");
      return imagePath;
    }

    // ✅ JIKA MASIH RELATIVE PATH, TAMBAHKAN BASE URL DENGAN PATTERN YANG SAMA
    const backendUrl = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace("/api", "")
      : "http://localhost:4000";

    // Pastikan path diawali dengan slash
    const normalizedPath = imagePath.startsWith("/")
      ? imagePath
      : `/${imagePath}`;
    const fullUrl = `${backendUrl}${normalizedPath}`;

    console.log("🔗 Constructed URL:", fullUrl);
    return fullUrl;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get payment type text
  const getPaymentTypeText = (type) => {
    const types = {
      down_payment: "Uang Muka",
      installment: "Cicilan",
      full_payment: "Pembayaran Penuh",
      company_billing: "Company Billing",
    };
    return types[type] || type;
  };

  // Get user type text
  const getUserTypeText = (type) => {
    const types = {
      individual: "Individual",
      company: "Company",
    };
    return types[type] || type;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Get file extension
  const getFileExtension = (filename) => {
    if (!filename) return "";
    return filename.split(".").pop().toUpperCase();
  };

  // Function untuk download bukti transfer
  const handleDownloadPaymentProof = async (payment) => {
    if (!payment.payment_proof_url) {
      alert("Bukti transfer tidak tersedia");
      return;
    }

    try {
      const imageUrl = getFullImageUrl(payment.payment_proof_url);
      const fileName = `bukti-transfer-${
        payment.transaction_number || payment.id
      }.jpg`;

      console.log("📥 Downloading payment proof:", { imageUrl, fileName });

      // Method 1: Menggunakan fetch + blob (lebih reliable)
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Create temporary link
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(blobUrl);

      console.log("✅ Payment proof downloaded successfully");
    } catch (error) {
      console.error("❌ Error downloading payment proof:", error);

      // Fallback: Buka di tab baru jika download gagal
      const imageUrl = getFullImageUrl(payment.payment_proof_url);
      window.open(imageUrl, "_blank");

      alert("Gagal mengunduh otomatis. Bukti transfer dibuka di tab baru.");
    }
  };

  // Handle download file
  const handleDownloadFile = async (fileUrl, fileName) => {
    if (!fileUrl) {
      alert("File tidak tersedia untuk diunduh");
      return;
    }

    try {
      // Create a temporary link element
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName || "file-3d-printing";
      link.target = "_blank";

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Gagal mengunduh file: " + error.message);
    }
  };

  // Handle image preview
  const handleImagePreview = (imageUrl) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  // Handle close image modal
  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Order #{order.order.order_number}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {formatDateTime(order.order.created_at)} •
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                  order.order.user_type === "company"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {getUserTypeText(order.order.user_type)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-base font-semibold mb-3 text-gray-800">
                Informasi{" "}
                {order.order.user_type === "company"
                  ? "Perusahaan"
                  : "Customer"}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Nama</span>
                  <span className="text-sm font-medium text-gray-900">
                    {order.order.customer_name}
                  </span>
                </div>

                {/* ✅ TAMBAH INI: Nama Perusahaan untuk Company User */}
                {order.order.user_type === "company" &&
                  order.order.company_name && (
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-600">
                        Nama Perusahaan
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.order.company_name}
                      </span>
                    </div>
                  )}

                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Email</span>
                  <span className="text-sm font-medium text-gray-900">
                    {order.order.customer_email}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Tipe Customer</span>
                  <span className="text-sm font-medium text-gray-900">
                    {getUserTypeText(order.order.user_type)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Tanggal Order</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(order.order.created_at)}
                  </span>
                </div>
                {order.order.estimated_completion_date && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-xs text-gray-600">
                      Estimasi Selesai
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(order.order.estimated_completion_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order & Payment Status */}
            <div>
              <h3 className="text-base font-semibold mb-3 text-gray-800">
                Status Order & Pembayaran
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Status Order</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      order.order.order_status === "completed"
                        ? "bg-green-100 text-green-700"
                        : order.order.order_status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : order.order.user_type === "company"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {order.order.order_status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-xs text-gray-600">
                    Status Pembayaran
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      order.order.payment_status === "paid"
                        ? "bg-green-100 text-green-700"
                        : order.order.payment_status === "completed"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.order.payment_status?.toUpperCase()}
                  </span>
                </div>
                {order.order.payment_method && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-xs text-gray-600">Metode Bayar</span>
                    <span className="text-sm font-medium text-gray-900">
                      {order.order.payment_method}
                    </span>
                  </div>
                )}
                {order.order.affiliate_name && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-xs text-gray-600">Affiliate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {order.order.affiliate_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items dengan File Download */}
          <div>
            <h3 className="text-base font-semibold mb-3 text-gray-800">
              Items Order ({order.items.length})
            </h3>
            <div className="space-y-3">
              {order.items.map((item, index) => {
                const itemStatusConfig = getItemStatusBadge(item.item_status);

                return (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {item.file_name}
                            </h4>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {item.original_file_name}
                            </p>

                            {/* File Info & Download Button */}
                            <div className="flex items-center gap-3 mt-1.5">
                              {item.file_url && (
                                <button
                                  onClick={() =>
                                    handleDownloadFile(
                                      getFullImageUrl(item.file_url),
                                      item.original_file_name
                                    )
                                  }
                                  className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded text-xs font-medium hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200"
                                  title="Download File 3D"
                                >
                                  <Download className="w-3 h-3" />
                                  Download File
                                </button>
                              )}
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                {item.file_size && (
                                  <span>{formatFileSize(item.file_size)}</span>
                                )}
                                {item.file_name && (
                                  <span className="px-1 py-0.5 bg-gray-200 rounded text-gray-700 text-xs">
                                    {getFileExtension(item.file_name)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${itemStatusConfig.color}`}
                      >
                        {itemStatusConfig.text}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-gray-600 block text-xs">
                          Material:
                        </span>
                        <p className="font-medium text-gray-900">
                          {item.material_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-xs">
                          Quantity:
                        </span>
                        <p className="font-medium text-gray-900">
                          {item.quantity} pcs
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-xs">
                          Volume:
                        </span>
                        <p className="font-medium text-gray-900">
                          {item.volume} mm³
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-xs">
                          Berat:
                        </span>
                        <p className="font-medium text-gray-900">
                          {item.weight} g
                        </p>
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">
                          Total Harga Item:
                        </span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                      {item.print_notes && (
                        <div className="mt-1.5 p-1.5 bg-yellow-50 rounded text-xs text-yellow-700">
                          <strong>Catatan Print:</strong> {item.print_notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment History */}
          {order.payments && order.payments.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 text-gray-800">
                Riwayat Pembayaran ({order.payments.length})
              </h3>

              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Transaksi
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Jumlah
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Bukti
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Transaction Info */}
                        <td className="px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-900 text-xs">
                              {payment.transaction_number}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDateTime(payment.created_at)}
                            </p>
                            {payment.verified_by_name && (
                              <p className="text-xs text-green-600 mt-0.5">
                                Diverifikasi: {payment.verified_by_name}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-3 py-2 text-right">
                          <span className="font-semibold text-black text-sm">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              payment.status === "verified"
                                ? "bg-green-100 text-green-700"
                                : payment.status === "pending" ||
                                  payment.status === "waiting_verification"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {payment.status?.toUpperCase()}
                          </span>
                        </td>

                        {/* ✅ PERBAIKAN: Payment Proof dengan full URL */}
                        <td className="px-3 py-2 text-center">
                          {payment.payment_proof_url ? (
                            <div className="flex justify-center space-x-1">
                              <button
                                onClick={() =>
                                  handleImagePreview(payment.payment_proof_url)
                                }
                                className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs font-medium"
                                title="Lihat Bukti Transfer"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDownloadPaymentProof(payment)
                                }
                                className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 text-xs font-medium"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 space-y-3"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {payment.transaction_number}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(payment.created_at)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          payment.status === "verified"
                            ? "bg-green-100 text-green-700"
                            : payment.status === "pending" ||
                              payment.status === "waiting_verification"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {payment.status?.toUpperCase()}
                      </span>
                    </div>

                    {/* Amount & Type */}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-black text-base">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    {/* ✅ PERBAIKAN: Payment Proof dengan full URL */}
                    {payment.payment_proof_url && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">
                          Bukti Transfer
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-12 h-12 border border-gray-300 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                            onClick={() =>
                              handleImagePreview(payment.payment_proof_url)
                            }
                          >
                            <img
                              src={getFullImageUrl(payment.payment_proof_url)}
                              alt="Bukti Transfer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src =
                                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MCA0MEM0My4zMTM3IDQwIDQ2IDM3LjMxMzcgNDYgMzRDNDYgMzAuNjg2MyA0My4zMTM3IDI4IDQwIDI4QzM2LjY4NjMgMjggMzQgMzAuNjg2MyAzNCAzNEMzNCAzNy4zMTM3IDM2LjY4NjMgNDAgNDAgNDBaIiBmaWxsPSIjOEM5NkFCIi8+CjxwYXRoIGQ9Ik01MiAzNkM1MiAzOS4zMTM3IDQ5LjMxMzcgNDIgNDYgNDJDMzguNjg2MyA0MiAzMiAzNS4zMTMzIDMyIDI4QzMyIDIwLjY4NjcgMzguNjg2MyAxNCA0NiAxNEM1My4zMTM3IDE0IDYwIDIwLjY4NjcgNjAgMjhDNjAgMzUuMzEzNyA1My4zMTM3IDQyIDQ2IDQyQzQyLjY4NjMgNDIgNDAgMzkuMzEzNyA0MCAzNiIgc3Ryb2tlPSIjOEM5NkFCIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+";
                              }}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() =>
                                handleImagePreview(payment.payment_proof_url)
                              }
                              className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#000000] to-[#212121] text-white rounded-lg hover:from-[#111111] hover:to-[#333333] transition-all duration-200 text-xs font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              Lihat
                            </button>
                            <button
                              onClick={() =>
                                handleDownloadPaymentProof(payment)
                              }
                              className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 text-xs font-medium"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verified By */}
                    {payment.verified_by_name && (
                      <div className="text-xs text-green-600 border-t border-gray-100 pt-2">
                        Diverifikasi oleh: {payment.verified_by_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {order.order.admin_notes && (
            <div>
              <h3 className="text-base font-semibold mb-2 text-gray-800">
                Catatan Admin
              </h3>
              <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
                <p className="text-xs text-yellow-700 whitespace-pre-wrap">
                  {order.order.admin_notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            Update: {formatDateTime(order.order.updated_at)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* ✅ PERBAIKAN: Image Preview Modal dengan full URL */}
      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                Preview Bukti Transfer
              </h3>
              <button
                onClick={handleCloseImageModal}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 flex justify-center items-center overflow-auto">
              <img
                src={getFullImageUrl(selectedImage)}
                alt="Bukti Transfer Preview"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTUwQzIxNi41NjkgMTUwIDIzMCAxMzYuNTY5IDIzMCAxMjBDMjMwIDEwMy40MzEgMjE2LjU2OSA5MCAyMDAgOTBDMTgzLjQzMSA5MCAxNzAgMTAzLjQzMSAxNzAgMTIwQzE3MCAxMzYuNTY5IDE4My40MzEgMTUwIDIwMCAxNTBaIiBmaWxsPSIjOEM5NkFCIi8+CjxwYXRoIGQ9Ik0yNjAgMTgwQzI2MCAyMTYuNTY5IDIzNi41NjkgMjQwIDIwMCAyNDBDMTYzLjQzMSAyNDAgMTQwIDIxNi41NjkgMTQwIDE4MEMxNDAgMTQzLjQzMSAxNjMuNDMxIDEyMCAyMDAgMTIwQzIzNi41NjkgMTIwIDI2MCAxNDMuNDMxIDI2MCAxODBDMjYwIDIxNi41NjkgMjM2LjU2OSAyNDAgMjAwIDI0MEMxNjMuNDMxIDI0MCAxNDAgMjE2LjU2OSAxNDAgMTgwIiBzdHJva2U9IiM4Qzk2QUIiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4=";
                }}
              />
            </div>
            <div className="flex justify-center gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() =>
                  handleDownloadPaymentProof({
                    payment_proof_url: selectedImage,
                    transaction_number: "bukti-transfer",
                  })
                }
                className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handleCloseImageModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DeleteConfirmationModal = ({ order, isOpen, onClose, onConfirm }) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Hapus Order
          </h3>
          <p className="text-gray-600 mb-2">
            Apakah Anda yakin ingin menghapus order{" "}
            <strong className="text-gray-900">#{order.order_number}</strong>?
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-yellow-700">
              <strong>Status:</strong> {order.order_status?.toUpperCase()}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Hanya order dengan status <strong>COMPLETED</strong> atau{" "}
              <strong>CANCELLED</strong> yang dapat dihapus.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium"
            disabled={!["completed", "cancelled"].includes(order.order_status)}
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

const EditOrderModal = ({
  order,
  isOpen,
  onClose,
  onUpdate,
  onStatusUpdate,
  onPaymentUpdate,
}) => {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState(""); // ✅ HANYA SATU FIELD CATATAN
  const [isSaving, setIsSaving] = useState(false);

  // Initialize state when order changes
  useEffect(() => {
    if (order && order.order) {
      setSelectedStatus(order.order.order_status || "under_review");
      setSelectedPaymentStatus(order.order.payment_status || "pending");
      setAdminNotes(""); // <- SELALU KOSONG, TIDAK AMBIL DARI DATA LAMA
    }
  }, [order]);

  if (!isOpen || !order || !order.order) {
    return null;
  }

  const isCompanyOrder = order.order.user_type === "company";

  // Get user type text
  const getUserTypeText = (type) => {
    const types = {
      individual: "Individual",
      company: "Company",
    };
    return types[type] || type;
  };

  // Status options berbeda untuk Company vs Individual
  const getStatusOptions = () => {
    if (isCompanyOrder) {
      return [
        { value: "under_review", label: "Under Review" },
        { value: "printing", label: "Printing" },
        { value: "final_touchup", label: "Final Touchup" },
        { value: "ready_to_ship", label: "Siap Kirim" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ];
    } else {
      return [
        { value: "under_review", label: "Under Review" },
        { value: "waiting_payment", label: "Menunggu Pembayaran" },
        { value: "payment_received", label: "Pembayaran Diterima" },
        { value: "printing", label: "Printing" },
        { value: "final_touchup", label: "Final Touchup" },
        { value: "ready_to_ship", label: "Siap Kirim" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ];
    }
  };

  // Payment status options
  const getPaymentStatusOptions = () => {
    return [
      { value: "pending", label: "Menunggu" },
      { value: "paid", label: "Lunas" },
      { value: "completed", label: "Completed" },
    ];
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    console.log("💾 Saving changes:", {
      orderId: order.order.id,
      selectedStatus,
      selectedPaymentStatus,
      adminNotes,
      userType: order.order.user_type,
      isCompanyOrder,
    });

    try {
      const updates = [];
      let hasChanges = false;

      // ✅ KIRIM ADMIN_NOTES KE updateOrderStatus
      if (selectedStatus !== order.order.order_status) {
        updates.push(
          onStatusUpdate(
            order.order.id,
            selectedStatus,
            adminNotes, // ✅ GUNAKAN adminNotes SEBAGAI CATATAN
            order.order.user_type
          )
        );
        hasChanges = true;
      }

      // ✅ KIRIM ADMIN_NOTES KE updatePaymentStatus
      if (selectedPaymentStatus !== order.order.payment_status) {
        updates.push(
          onPaymentUpdate(
            order.order.id,
            selectedPaymentStatus,
            order.order.user_type,
            adminNotes // ✅ GUNAKAN adminNotes SEBAGAI CATATAN
          )
        );
        hasChanges = true;
      }

      // ✅ JIKA HANYA ADMIN NOTES YANG BERUBAH TANPA PERUBAHAN STATUS
      if (
        adminNotes !== order.order.admin_notes &&
        selectedStatus === order.order.order_status &&
        selectedPaymentStatus === order.order.payment_status
      ) {
        updates.push(updateAdminNotesOnly(order.order.id, adminNotes));
        hasChanges = true;
      }

      // Jalankan semua update secara parallel
      if (updates.length > 0) {
        await Promise.all(updates);
      }

      if (hasChanges) {
        // Panggil onUpdate untuk refresh data parent
        if (onUpdate && typeof onUpdate === "function") {
          await onUpdate();
        }
        onClose();
      } else {
        alert("Tidak ada perubahan yang dilakukan");
        onClose();
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Gagal menyimpan perubahan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FUNGSI UNTUK UPDATE HANYA ADMIN NOTES
  const updateAdminNotesOnly = async (orderId, notes) => {
    try {
      const response = await adminOrderService.updateAdminNotes(orderId, {
        admin_notes: notes,
      });
      return response;
    } catch (error) {
      console.error("Error updating admin notes:", error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Order #{order.order.order_number}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {getUserTypeText(order.order.user_type)} •
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                  order.order.user_type === "company"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {order.order.user_type?.toUpperCase()}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Order Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Order
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              disabled={isSaving}
            >
              {getStatusOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Pembayaran
            </label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              disabled={isSaving}
            >
              {getPaymentStatusOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ SATU FIELD CATATAN ADMIN SAJA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Admin
              <span className="text-xs text-gray-500 ml-1">(Opsional)</span>
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              placeholder={
                selectedStatus !== order.order.order_status ||
                selectedPaymentStatus !== order.order.payment_status
                  ? "Tambahkan catatan untuk perubahan status/pembayaran..."
                  : "Tambahkan catatan internal untuk order ini..."
              }
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Catatan ini akan tersimpan di database dan hanya visible oleh
              admin
            </p>
          </div>

          {/* Current Status Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Status Saat Ini
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-600">Order:</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded font-medium ${
                    order.order.order_status === "completed"
                      ? "bg-green-100 text-green-700"
                      : order.order.order_status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : order.order.user_type === "company"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {order.order.order_status?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Pembayaran:</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded font-medium ${
                    order.order.payment_status === "paid"
                      ? "bg-green-100 text-green-700"
                      : order.order.payment_status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {order.order.payment_status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            Customer: {order.order.customer_name}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;