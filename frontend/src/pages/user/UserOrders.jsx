import { useState, useEffect, memo } from "react";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Eye,
  CreditCard,
  DollarSign,
  AlertCircle,
  FileText,
  Calendar,
  User,
  Truck,
  CheckSquare,
  X,
  CheckCircle2,
  Building,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader,
  Trash2,
  Copy,
} from "lucide-react";
import { authService } from "../../services/authService";
import orderService from "../../services/orderService";
import OrderQuotationButton from "../../components/OrderQuotationButton";
import bankService from "../../services/bankService";

const UserOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const [paymentProof, setPaymentProof] = useState(null);
  const [userType, setUserType] = useState("individual");
  const [deletingOrder, setDeletingOrder] = useState(null);

  // ✅ TAMBAHKAN STATE UNTUK MODAL DELETE
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  const fetchBankAccounts = async () => {
    try {
      setLoadingBanks(true);
      const response = await bankService.getAllBanks();
      if (response.success) {
        setBankAccounts(response.data || []);
        console.log("✅ Bank accounts loaded:", response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching bank accounts:", error);
      setBankAccounts([]);
    } finally {
      setLoadingBanks(false);
    }
  };

  // ✅ LOAD BANK ACCOUNTS SAAT KOMPONEN MOUNT
  useEffect(() => {
    fetchBankAccounts();
  }, []);

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

  // Check user type
  useEffect(() => {
    checkUserType();
  }, []);

  // ✅ FUNGSI BARU: Handle delete order dengan modal
  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setShowDeleteModal(true);
  };

  // ✅ FUNGSI BARU: Konfirmasi delete
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;

    try {
      setDeletingOrder(orderToDelete.id);

      const response = await orderService.deleteOrder(orderToDelete.id);

      if (response.success) {
        // Refresh orders list
        fetchUserOrders(pagination.currentPage, itemsPerPage);

        // Tutup modal
        setShowDeleteModal(false);
        setOrderToDelete(null);

        console.log(
          "✅ Order deleted successfully:",
          orderToDelete.order_number
        );
      } else {
        alert(response.message || "Gagal menghapus order.");
      }
    } catch (error) {
      console.error("❌ Error deleting order:", error);
      alert(
        error.response?.data?.message ||
          "Terjadi kesalahan saat menghapus order."
      );
    } finally {
      setDeletingOrder(null);
    }
  };

  // ✅ FUNGSI BARU: Tutup modal delete
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setOrderToDelete(null);
  };

  // ✅ FUNGSI BARU: Cek apakah order bisa dihapus
  const canDeleteOrder = (order) => {
    return (
      order.order_status === "completed" || order.order_status === "cancelled"
    );
  };

  const checkUserType = () => {
    const currentUser = authService.getCurrentUser();
    setUserType(currentUser?.user_type || "individual");
  };

  const shouldShowQuotationButton = (order) => {
    return order.order_status !== "under_review";
  };

  // Di dalam komponen UserOrders, tambahkan state reset yang lebih komprehensif
  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedOrder(null);
    setPaymentProof(null);
    setPaymentAmount("");
    setPaymentMethod("transfer"); // Reset ke default
  };

  const shouldShowDownloadButton = (order) => {
    // Tampilkan tombol download untuk status payment_received dan completed
    return (
      order.order_status === "payment_received" ||
      order.order_status === "completed"
    );
  };

  // ✅ PERUBAHAN: Helper function untuk menentukan tombol - HANYA waiting_payment yang bisa bayar
  const shouldShowPaymentButton = (order) => {
    // Untuk company user, jangan tampilkan tombol pembayaran
    if (userType === "company") {
      return false;
    }

    // ✅ HANYA tampilkan tombol bayar jika status waiting_payment
    return order.order_status === "waiting_payment";
  };

  // Fetch orders dengan pagination
  const fetchUserOrders = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);

      const filters = {
        page: page,
        limit: limit,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : "",
        sortBy: sortBy,
      };

      console.log("📨 Loading orders with filters:", filters);

      const response = await orderService.getUserOrders(filters);

      if (response.success) {
        setOrders(response.data.orders || []);
        setPagination(
          response.data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: response.data.orders?.length || 0,
            itemsPerPage: limit,
            hasNext: false,
            hasPrev: false,
          }
        );

        console.log("✅ Loaded orders:", {
          count: response.data.orders?.length || 0,
          total: response.data.total || 0,
          pagination: response.data.pagination,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUserOrders(1, itemsPerPage);
  }, []);

  // Search effect dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUserOrders(1, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, sortBy]);

  // Handler untuk ganti page
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUserOrders(newPage, itemsPerPage);
    }
  };

  // Handler untuk ganti items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    fetchUserOrders(1, newLimit);
  };

  // ✅ PERUBAHAN: Fungsi untuk mendapatkan status badge - DIPERBARUI
  const getStatusBadge = (status) => {
    const statusConfig = {
      under_review: {
        icon: Clock,
        text: "Under Review",
        iconColor: "text-yellow-400",
      },
      waiting_payment: {
        icon: Clock,
        text: "Waiting Payment",
        iconColor: "text-yellow-400",
      },
      payment_review: {
        icon: Clock,
        text: "Payment Review",
        iconColor: "text-orange-400",
      },
      processing: {
        icon: Clock,
        text: "Processing",
        iconColor: "text-blue-400",
      },
      printing: {
        icon: Clock,
        text: "Printing",
        iconColor: "text-purple-400",
      },
      quality_check: {
        icon: CheckSquare,
        text: "Quality Check",
        iconColor: "text-teal-400",
      },
      shipping: {
        icon: Truck,
        text: "Shipping",
        iconColor: "text-indigo-400",
      },
      completed: {
        icon: CheckCircle,
        text: "Completed",
        iconColor: "text-green-400",
      },
      cancelled: {
        icon: XCircle,
        text: "Cancelled",
        iconColor: "text-red-400",
      },
    };

    const config = statusConfig[status] || {
      icon: Clock,
      text: status,
      iconColor: "text-gray-400",
    };
    const IconComponent = config.icon;

    return (
      <span className="inline-flex items-center gap-1 bg-white/5 text-white px-2 py-1 rounded text-xs font-medium">
        <IconComponent className={`w-3 h-3 ${config.iconColor}`} />
        {config.text}
      </span>
    );
  };

  // ✅ PERUBAHAN: Fungsi untuk mendapatkan payment status badge - DIPERBARUI
  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        icon: Clock,
        text: "Pending",
        iconColor: "text-yellow-400",
      },
      paid: {
        icon: CheckCircle,
        text: "Paid",
        iconColor: "text-green-400",
      },
      failed: {
        icon: XCircle,
        text: "Failed",
        iconColor: "text-red-400",
      },
    };

    const config = statusConfig[status] || {
      icon: Clock,
      text: status,
      iconColor: "text-gray-400",
    };
    const IconComponent = config.icon;

    return (
      <span className="inline-flex items-center gap-1 bg-white/5 text-white px-2 py-1 rounded text-xs font-medium">
        <IconComponent className={`w-3 h-3 ${config.iconColor}`} />
        {config.text}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Handle view order details
  const handleViewDetails = async (order) => {
    try {
      const response = await orderService.getOrderDetail(order.id);
      if (response.success) {
        setSelectedOrder(response.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  // ✅ PERUBAHAN: Handle payment - HANYA untuk waiting_payment status
  const handlePayment = (order) => {
    if (userType === "company") {
      alert(
        "Company orders menggunakan sistem internal billing. Tidak perlu pembayaran manual."
      );
      return;
    }

    if (order.order_status !== "waiting_payment") {
      alert(
        "Pembayaran hanya dapat dilakukan untuk order dengan status Waiting Payment."
      );
      return;
    }

    setSelectedOrder(order);
    // ✅ PERBAIKAN: Set paymentAmount sebagai string dari total_amount
    setPaymentAmount(order.total_amount.toString());
    setShowPaymentModal(true);

    console.log("💰 Setting payment amount:", {
      orderTotal: order.total_amount,
      paymentAmountSet: order.total_amount.toString(),
      type: typeof order.total_amount.toString(),
    });
  };

  const handlePaymentProofUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      const maxSize = 5 * 1024 * 1024; // 5MB

      console.log("📁 File selected:", {
        name: file.name,
        type: file.type,
        size: file.size,
        isValidType: validTypes.includes(file.type),
        isWithinSize: file.size <= maxSize,
      });

      if (!validTypes.includes(file.type)) {
        alert("Hanya file JPG, PNG, atau PDF yang diizinkan");
        return;
      }

      if (file.size > maxSize) {
        alert("Ukuran file maksimal 5MB");
        return;
      }

      setPaymentProof(file);
      console.log("✅ Payment proof file set successfully");
    }
  };

  const submitPayment = async () => {
    if (userType === "company") {
      alert(
        "Company orders menggunakan sistem internal billing. Tidak perlu pembayaran manual."
      );
      return;
    }

    if (!paymentAmount || !paymentMethod || !paymentProof) {
      alert("Harap lengkapi semua data pembayaran");
      return;
    }

    // ✅ PERBAIKAN: Konversi ke number dan handle parsing
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Jumlah pembayaran harus angka yang valid dan lebih dari 0");
      return;
    }

    // ✅ PERBAIKAN: Konversi kedua nilai ke number untuk perbandingan
    const orderTotal = parseFloat(selectedOrder.total_amount);

    console.log("🔍 Validating payment amount:", {
      paymentAmount: amount,
      orderTotal: orderTotal,
      paymentAmountType: typeof amount,
      orderTotalType: typeof orderTotal,
      areEqual: amount === orderTotal,
    });

    // ✅ PERUBAHAN: Validasi harus full payment dengan toleransi kecil
    if (Math.abs(amount - orderTotal) > 0.01) {
      alert(
        `Pembayaran harus full payment sebesar ${formatCurrency(
          orderTotal
        )}. ` + `Anda memasukkan: ${formatCurrency(amount)}`
      );
      return;
    }

    try {
      setUploadingPayment(true);

      console.log("🔄 Starting payment process...", {
        orderId: selectedOrder.id,
        amount: paymentAmount,
        paymentMethod,
        hasProof: !!paymentProof,
      });

      // ✅ SESUAIKAN DENGAN orderService.js
      const paymentData = {
        amount: paymentAmount, // Tetap string seperti dari input
        paymentMethod: paymentMethod,
        paymentProof: paymentProof,
      };

      const response = await orderService.uploadPaymentProof(
        selectedOrder.id,
        paymentData
      );

      if (response.success) {
        alert(
          response.message ||
            "Bukti pembayaran berhasil diupload! Menunggu verifikasi admin."
        );
        setShowPaymentModal(false);
        setPaymentProof(null);
        setPaymentAmount("");
        setPaymentMethod("transfer"); // Reset ke default

        // Refresh orders list
        setTimeout(() => {
          fetchUserOrders(pagination.currentPage, itemsPerPage);
        }, 1000);
      } else {
        alert(
          response.message ||
            "Gagal upload bukti pembayaran. Silakan coba lagi."
        );
      }
    } catch (error) {
      console.error("❌ Error submitting payment:", error);

      // Error handling yang lebih spesifik
      let errorMessage = "Gagal upload bukti pembayaran: ";

      if (error.response) {
        // Server responded with error status
        const serverError = error.response.data;
        errorMessage += serverError.message || `Error ${error.response.status}`;
        console.error("Server error details:", serverError);
      } else if (error.request) {
        // Request was made but no response received
        errorMessage +=
          "Tidak ada respon dari server. Periksa koneksi internet Anda.";
      } else {
        // Something else happened
        errorMessage += error.message;
      }

      alert(errorMessage);
    } finally {
      setUploadingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-20 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FA812F] mx-auto mb-4"></div>
          <p className="text-white">Memuat data orders...</p>
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
            {userType === "company" ? "Company Orders" : "My Orders"}
          </h1>
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
            {userType === "company"
              ? "Track and manage all your company 3D printing orders"
              : "Track and manage all your 3D printing orders in one place"}
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Filter and Sort */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Status Filter */}
              <div className="flex-1 sm:w-48">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status Order
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200"
                >
                  <option value="all" className="bg-gray-800">
                    Semua Status
                  </option>
                  <option value="under_review" className="bg-gray-800">
                    Under Review
                  </option>
                  <option value="waiting_payment" className="bg-gray-800">
                    Waiting Payment
                  </option>
                  <option value="payment_review" className="bg-gray-800">
                    Payment Review
                  </option>
                  <option value="processing" className="bg-gray-800">
                    Processing
                  </option>
                  <option value="printing" className="bg-gray-800">
                    Printing
                  </option>
                  <option value="quality_check" className="bg-gray-800">
                    Quality Check
                  </option>
                  <option value="shipping" className="bg-gray-800">
                    Shipping
                  </option>
                  <option value="completed" className="bg-gray-800">
                    Completed
                  </option>
                  <option value="cancelled" className="bg-gray-800">
                    Cancelled
                  </option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex-1 sm:w-40">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Urutkan
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200"
                >
                  <option value="recent" className="bg-gray-800">
                    Terbaru
                  </option>
                  <option value="oldest" className="bg-gray-800">
                    Terlama
                  </option>
                  <option value="total_high" className="bg-gray-800">
                    Total: Tinggi
                  </option>
                  <option value="total_low" className="bg-gray-800">
                    Total: Rendah
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        {/* Orders Table */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                Daftar Orders ({pagination.totalItems})
              </h2>

              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">Tampilkan:</span>
                <div className="relative">
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
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                <span className="text-sm text-gray-300">per halaman</span>
              </div>
            </div>
          </div>

          <div className="p-0">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {loading ? "Loading..." : "No orders found"}
                </h3>
                <p className="text-gray-400">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Start your first 3D printing project today!"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-12">
                        No
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="text-center py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider w-16">
                        Items
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {orders.map((order, index) => {
                      const showPaymentButton = shouldShowPaymentButton(order);
                      const showDownloadButton =
                        shouldShowDownloadButton(order); // ✅ TAMBAHKAN
                      const isLastRow = index === orders.length - 1;

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-white/5 transition-colors duration-200"
                        >
                          {/* No */}
                          <td
                            className={`py-4 px-4 ${
                              isLastRow ? "rounded-bl-lg" : ""
                            }`}
                          >
                            <div className="text-gray-400 text-sm text-center font-medium">
                              {index + 1}
                            </div>
                          </td>

                          {/* Order Number */}
                          <td className="py-4 px-6">
                            <div>
                              <div className="text-white font-medium text-sm">
                                {order.order_number}
                              </div>
                              <div className="text-gray-400 text-xs mt-1">
                                {formatDate(order.created_at)}
                              </div>
                              {userType === "company" && (
                                <div className="text-gray-400 text-xs mt-1">
                                  Company Order
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Items Count */}
                          <td className="py-4 px-6">
                            <div className="text-white font-medium text-sm text-center">
                              {order.item_count || 0}
                            </div>
                          </td>

                          {/* Total Amount */}
                          <td className="py-4 px-6">
                            <div className="text-white font-medium text-sm">
                              {formatCurrency(order.total_amount)}
                            </div>
                            {showPaymentButton && (
                              <div className="text-orange-400 text-xs mt-1">
                                Full Payment Required
                              </div>
                            )}
                          </td>

                          {/* Order Status */}
                          <td className="py-4 px-6">
                            {getStatusBadge(order.order_status)}
                          </td>

                          {/* Payment Status */}
                          <td className="py-4 px-6">
                            {getPaymentStatusBadge(order.payment_status)}
                          </td>

                          {/* Actions */}
                          <td
                            className={`py-4 px-6 ${
                              isLastRow ? "rounded-br-lg" : ""
                            }`}
                          >
                            <div className="flex flex-col gap-2 min-w-[120px]">
                              <button
                                onClick={() => handleViewDetails(order)}
                                className="bg-white/5 border border-white/10 text-white py-1 px-3 rounded text-xs font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-1"
                              >
                                <Eye className="w-3 h-3 text-orange-400" />
                                Details
                              </button>

                              {/* ✅ PERUBAHAN: Tombol Transfer hanya untuk waiting_payment */}
                              {showPaymentButton && (
                                <button
                                  onClick={() => handlePayment(order)}
                                  className="bg-white/5 border border-white/10 text-white py-1 px-3 rounded text-xs font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3 text-green-400" />
                                  Transfer
                                </button>
                              )}

                              {/* ✅ PERUBAHAN: Tombol Quotation - JANGAN tampilkan untuk under_review */}
                              {shouldShowQuotationButton(order) && (
                                <>
                                  {/* Tombol Download Quotation untuk payment_received dan completed */}
                                  {showDownloadButton && (
                                    <OrderQuotationButton
                                      orderId={order.id}
                                      orderNumber={order.order_number}
                                      type="download"
                                    />
                                  )}

                                  {/* Tombol Preview Quotation untuk status lainnya (kecuali under_review) */}
                                  {!showDownloadButton && (
                                    <OrderQuotationButton
                                      orderId={order.id}
                                      orderNumber={order.order_number}
                                      type="preview"
                                    />
                                  )}
                                </>
                              )}

                              {/* ✅ TAMBAHKAN: Tombol Delete untuk status completed/cancelled */}
                              {canDeleteOrder(order) && (
                                <button
                                  onClick={() => handleDeleteClick(order)}
                                  className="bg-white/5 border border-white/10 text-white py-1 px-3 rounded text-xs font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                  Hapus
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Section */}
            {orders.length > 0 && (
              <div className="bg-white/5 border-t border-white/10 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Pagination info */}
                  <div className="text-sm text-gray-300">
                    Menampilkan{" "}
                    {(pagination.currentPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(
                      pagination.currentPage * itemsPerPage,
                      pagination.totalItems
                    )}{" "}
                    dari {pagination.totalItems} orders
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
                      onClick={() =>
                        handlePageChange(pagination.currentPage - 1)
                      }
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
                      onClick={() =>
                        handlePageChange(pagination.currentPage + 1)
                      }
                      disabled={!pagination.hasNext}
                      className="p-2 border border-white/20 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-200"
                      title="Halaman berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={
                        pagination.currentPage === pagination.totalPages
                      }
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

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          userType={userType}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOrder(null);
          }}
          onPayment={handlePayment}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          paymentAmount={paymentAmount}
          paymentMethod={paymentMethod}
          paymentProof={paymentProof}
          uploadingPayment={uploadingPayment}
          userType={userType}
          bankAccounts={bankAccounts} // ✅ TAMBAHKAN INI
          onPaymentAmountChange={setPaymentAmount}
          onPaymentMethodChange={setPaymentMethod}
          onPaymentProofUpload={handlePaymentProofUpload}
          onSubmitPayment={submitPayment}
          onClose={handleClosePaymentModal}
        />
      )}

      {/* ✅ MODAL BARU: Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        order={orderToDelete}
        formatCurrency={formatCurrency}
        deletingOrder={deletingOrder === orderToDelete?.id}
      />
    </div>
  );
};

// Order Detail Modal Component
const OrderDetailModal = ({ order, userType, isOpen, onClose, onPayment }) => {
  if (!isOpen) return null;

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

  const getStatusBadge = (status) => {
    const statusConfig = {
      under_review: { color: "bg-yellow-500/20 text-yellow-400" },
      waiting_payment: { color: "bg-blue-500/20 text-blue-400" },
      payment_review: { color: "bg-orange-500/20 text-orange-400" },
      processing: { color: "bg-purple-500/20 text-purple-400" },
      printing: { color: "bg-indigo-500/20 text-indigo-400" },
      quality_check: { color: "bg-teal-500/20 text-teal-400" },
      shipping: { color: "bg-blue-500/20 text-blue-400" },
      completed: { color: "bg-green-500/20 text-green-400" },
      cancelled: { color: "bg-red-500/20 text-red-400" },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-500/20 text-gray-400",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}
      >
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  const showPaymentButton =
    userType === "individual" &&
    order.order?.order_status === "waiting_payment";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20 shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">Order Details</h2>
              <p className="text-gray-400 text-sm mt-1">
                {order.order?.order_number}
                {userType === "company" && (
                  <span className="ml-2">• Company Order</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Information */}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                Order Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Status:</span>
                  {getStatusBadge(order.order?.order_status)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Order Date:</span>
                  <span className="text-white">
                    {formatDate(order.order?.created_at)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Est. Completion:</span>
                  <span className="text-white">
                    {formatDate(order.order?.estimated_completion_date) || "-"}
                  </span>
                </div>
                {userType === "company" && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Billing Type:</span>
                    <span className="text-white font-medium">
                      Internal Billing
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                {userType === "company" ? "Billing Summary" : "Payment Summary"}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total:</span>
                  <span className="text-white font-medium">
                    {formatCurrency(order.order?.total_amount)}
                  </span>
                </div>
                {userType === "individual" &&
                  order.order?.order_status === "waiting_payment" && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Payment Required:</span>
                      <span className="text-orange-400 font-medium">
                        {formatCurrency(order.order?.total_amount)}
                      </span>
                    </div>
                  )}
                {userType === "company" && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 mt-2">
                    <p className="text-blue-400 text-xs">
                      Company orders menggunakan sistem internal billing.
                      Pembayaran akan diproses secara otomatis.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white/5 border border-white/10 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm">
                          {item.file_name}
                        </h4>
                        <div className="flex gap-4 text-xs mt-1">
                          <span className="text-gray-300">
                            Material: {item.material_name}
                          </span>
                          <span className="text-gray-300">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium text-sm">
                          {formatCurrency(item.total_price)}
                        </p>
                        <p className="text-gray-300 text-xs mt-1">
                          Status: {item.item_status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment History - Hanya untuk individual */}
          {userType === "individual" &&
            order.payments &&
            order.payments.length > 0 && (
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Payment History
                </h3>
                <div className="space-y-2">
                  {order.payments.map((payment, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0"
                    >
                      <div>
                        <p className="text-white text-sm">
                          {payment.transaction_number}
                        </p>
                        <p className="text-gray-300 text-xs">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium text-sm">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-gray-300 text-xs capitalize">
                          {payment.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Last updated: {formatDate(order.order?.updated_at)}
          </div>
          <div className="flex gap-3">
            {showPaymentButton && (
              <button
                onClick={() => onPayment(order.order)}
                className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white py-2 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
              >
                <CreditCard className="w-4 h-4 inline mr-2" />
                Bayar Sekarang
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-transparent border border-white/30 text-white py-2 px-6 rounded-lg hover:bg-white/10 transition-all duration-200 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({
  order,
  paymentAmount,
  paymentMethod,
  paymentProof,
  uploadingPayment,
  userType,
  bankAccounts,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onPaymentProofUpload,
  onSubmitPayment,
  onClose,
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ✅ FUNGSI BARU: Copy bank account number
  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Nomor rekening berhasil disalin!");
      })
      .catch((err) => {
        console.error("Gagal menyalin: ", err);
      });
  };

  const handleSubmit = () => {
    console.log("🎯 Submitting payment with:", {
      orderNumber: order.order_number,
      amount: paymentAmount,
      method: paymentMethod,
      hasProof: !!paymentProof,
    });
    onSubmitPayment();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-2xl max-w-md w-full border border-white/20 shadow-xl">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">Pembayaran</h2>
              <p className="text-gray-400 text-xs mt-1">{order.order_number}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
              disabled={uploadingPayment}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Amount Section */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Amount */}
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-gray-300 text-xs">Total Order</p>
              <p className="text-white font-semibold text-sm mt-1">
                {formatCurrency(order.total_amount)}
              </p>
            </div>

            {/* Amount to Pay */}
            <div className="bg-orange-500/10 rounded-lg p-3">
              <p className="text-orange-300 text-xs">Harus Dibayar</p>
              <p className="text-white font-bold text-sm mt-1">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
          </div>

          {/* Bank Accounts - hanya tampil untuk transfer */}
          {paymentMethod === "transfer" && bankAccounts.length > 0 && (
            <div className="bg-white/5 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                Transfer ke:
              </h3>
              <div className="space-y-2">
                {bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className="bg-black/20 rounded p-2 border border-white/5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-white font-medium text-xs">
                          {bank.bank_name}
                        </p>
                        <p className="text-gray-300 text-xs mt-0.5">
                          {bank.account_holder}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-white font-semibold text-xs">
                            {bank.account_number}
                          </p>
                          <button
                            onClick={() => copyToClipboard(bank.account_number)}
                            className="text-gray-400 hover:text-white transition-colors p-0.5"
                            title="Salin nomor rekening"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Payment Amount (Read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Jumlah Pembayaran
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                value={formatCurrency(order.total_amount)}
                readOnly
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FA812F] focus:border-transparent cursor-not-allowed"
              />
            </div>
          </div>

          {/* Payment Proof Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Bukti Pembayaran
            </label>
            <div className="border border-dashed border-white/20 rounded-lg p-3 text-center hover:border-white/30 transition-colors cursor-pointer">
              <input
                type="file"
                onChange={onPaymentProofUpload}
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                id="payment-proof"
                disabled={uploadingPayment}
              />
              <label htmlFor="payment-proof" className="cursor-pointer block">
                {paymentProof ? (
                  <div className="text-green-400">
                    <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-sm font-medium">{paymentProof.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Klik untuk mengganti
                    </p>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <FileText className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-sm font-medium">
                      Upload bukti pembayaran
                    </p>
                    <p className="text-xs mt-1">JPG, PNG, PDF (max 5MB)</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-5 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-transparent border border-white/20 text-white py-2 px-3 rounded text-sm hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
            disabled={uploadingPayment}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploadingPayment || !paymentProof}
            className="flex-1 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white py-2 px-3 rounded text-sm font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingPayment ? (
              <>
                <Loader className="w-3 h-3 animate-spin inline mr-1" />
                Memproses...
              </>
            ) : (
              "Konfirmasi"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ MODAL BARU: Konfirmasi Hapus Order
const DeleteConfirmationModal = memo(
  ({ isOpen, onClose, onConfirm, order, formatCurrency, deletingOrder }) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
      onConfirm();
    };

    const handleClose = () => {
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto">
          <div className="text-center">
            {/* Warning Icon */}
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="w-full h-full bg-red-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Hapus Order?</h3>
            <p className="text-gray-300 text-sm mb-2">
              No. Order:{" "}
              <span className="font-semibold text-white">
                {order?.order_number}
              </span>
            </p>
            <p className="text-gray-300 text-sm mb-4">
              Status:{" "}
              <span
                className={`font-semibold ${
                  order?.order_status === "completed"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {order?.order_status === "completed"
                  ? "Completed"
                  : "Cancelled"}
              </span>
            </p>

            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-300">Total Amount:</span>
                <span className="text-white font-semibold">
                  {formatCurrency(order?.total_amount)}
                </span>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-6">
              Order akan dihapus secara permanen dari sistem.
              {order?.order_status === "completed"
                ? " Data order yang sudah selesai akan dihapus."
                : " Order yang dibatalkan akan dihapus dari riwayat."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirm}
                disabled={deletingOrder}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingOrder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Ya, Hapus
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                disabled={deletingOrder}
                className="flex-1 px-6 py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default UserOrders;
