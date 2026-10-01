import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Filter,
  Calendar,
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Eye,
  CheckCircle,
  Clock,
  Truck,
  Printer,
  XCircle,
  Building,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import adminHistoryService from "../../services/adminHistoryService";

const Report = () => {
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [reportType, setReportType] = useState("all");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  });

  // Mobile filter state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const handleDownloadAllReports = async () => {
    try {
      // Show loading state
      setLoading(true);

      // Call export service
      await adminHistoryService.exportHistoryToExcel();

      // Optional: Show success message
      alert("Data berhasil diunduh dalam format Excel");
    } catch (error) {
      console.error("❌ Error downloading Excel:", error);
      alert(error.message || "Gagal mengunduh data Excel");
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        text: "SELESAI",
      },
    };
    return statusConfig[status] || statusConfig.completed;
  };

  // Get payment status badge
  const getPaymentBadge = (status) => {
    const paymentConfig = {
      paid: { color: "bg-green-100 text-green-800", text: "LUNAS" },
      completed: { color: "bg-blue-100 text-blue-800", text: "COMPLETED" },
    };
    return paymentConfig[status] || paymentConfig.paid;
  };

  // Get user type badge
  const getUserTypeBadge = (userType) => {
    const userTypeConfig = {
      individual: {
        color: "bg-green-100 text-green-800",
        text: "INDIVIDUAL",
      },
      company: {
        color: "bg-purple-100 text-purple-800",
        text: "COMPANY",
      },
    };
    return userTypeConfig[userType] || userTypeConfig.individual;
  };

  // Calculate stats
  const calculateStats = (history) => {
    const totalRevenue = history.reduce(
      (sum, record) => sum + parseFloat(record.total_amount),
      0
    );
    const individualOrders = history.filter(
      (record) => record.user_type === "individual"
    ).length;
    const companyOrders = history.filter(
      (record) => record.user_type === "company"
    ).length;
    const totalOrders = history.length;

    return [
      {
        title: "Total Revenue",
        value: formatCurrency(totalRevenue),
        change: "+8.2%",
        trend: "up",
        icon: DollarSign,
        color: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        title: "Total Orders",
        value: totalOrders.toString(),
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
    ];
  };

  const fetchHistory = async (page = 1, limit = itemsPerPage) => {
    setLoading(true);
    try {
      const response = await adminHistoryService.getAllHistory({
        page: page,
        limit: limit,
        user_type: reportType !== "all" ? reportType : "",
        search: "", // Tambahkan jika ada fitur search
      });

      if (response.success) {
        setReports(response.data.history);
        setPagination(response.data.pagination);
        setStats(calculateStats(response.data.history));
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      alert(error.message || "Gagal mengambil data riwayat");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk ganti page
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchHistory(newPage, itemsPerPage);
    }
  };

  // Update useEffect untuk itemsPerPage
  useEffect(() => {
    fetchHistory(1, itemsPerPage);
  }, [reportType, itemsPerPage]);

  // Handler untuk ganti items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    fetchHistory(1, newLimit);
  };
  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await adminHistoryService.getHistoryStats();
      if (response.success) {
        const statsData = response.data.overview;

        const formattedStats = [
          {
            title: "Total Revenue",
            value: formatCurrency(statsData.total_revenue),
            change: "+8.2%",
            trend: "up",
            icon: DollarSign,
            color: "text-green-600",
            bgColor: "bg-green-100",
          },
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
        ];

        setStats(formattedStats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchHistory(1);
    fetchStats();
  }, []);

  // Effect ketika reportType berubah
  useEffect(() => {
    fetchHistory(1);
  }, [reportType]);

  const reportTypes = {
    all: { label: "Semua Laporan", color: "bg-gray-100 text-gray-700" },
    individual: { label: "Individual", color: "bg-green-100 text-green-700" },
    company: { label: "Company", color: "bg-purple-100 text-purple-700" },
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadReport = async (record) => {
    try {
      console.log("📥 Downloading report for:", record.order_number);

      // Panggil service untuk download Excel individual
      const response = await adminHistoryService.exportSingleHistoryToExcel(
        record.id
      );

      if (response.success) {
        console.log("✅ Download individual report successful");
      }
    } catch (error) {
      console.error("❌ Error downloading individual report:", error);
      alert(error.message || "Gagal mengunduh laporan");
    }
  };

  // Handle delete from history
  const handleDeleteFromHistory = async (historyId, orderNumber) => {
    if (!confirm(`Yakin ingin menghapus riwayat order ${orderNumber}?`)) {
      return;
    }

    try {
      const response = await adminHistoryService.deleteFromHistory(historyId);
      if (response.success) {
        alert("Riwayat order berhasil dihapus");
        fetchHistory(pagination.currentPage);
      }
    } catch (error) {
      console.error("Error deleting from history:", error);
      alert(error.message || "Gagal menghapus riwayat");
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Riwayat Transaksi
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Data order yang sudah complete dan dipindahkan dari halaman Orders
          </p>
        </div>
        <button
          onClick={handleDownloadAllReports}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          {loading ? "Mengunduh..." : "Download All Reports"}
        </button>
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
                <div className="p-2 sm:p-3 rounded-lg bg-gray-100">
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Search */}
        <div className="relative w-full lg:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
          />
        </div>

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden w-full">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200"
          >
            <span className="font-medium text-gray-900 text-sm">
              Filter Laporan
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
                    Tipe Laporan
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  >
                    {Object.entries(reportTypes).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Report Type Filter */}
        <div className="hidden lg:block">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
          >
            {Object.entries(reportTypes).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Daftar Riwayat Transaksi ({pagination.totalItems})
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Menampilkan order yang sudah dipindahkan ke riwayat
          </p>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-6 sm:w-8 sm:h-8 border-b-2 border-orange-500"></div>
              <span className="ml-2 text-gray-600 text-sm">Memuat data riwayat...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Tidak ada riwayat transaksi yang ditemukan
              </h3>
              <p className="text-gray-500 text-sm">
                Order yang sudah complete akan muncul di sini setelah dipindahkan dari halaman Orders
              </p>
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
                  {reports.map((report, index) => {
                    const statusConfig = getStatusBadge(report.order_status);
                    const paymentConfig = getPaymentBadge(
                      report.payment_status
                    );
                    const userTypeConfig = getUserTypeBadge(report.user_type);
                    const StatusIcon = statusConfig.icon;

                    const isLastRow = index === reports.length - 1;

                    return (
                      <tr
                        key={report.id}
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
                                {report.order_number}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {formatDate(report.original_created_at)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {report.customer_name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {report.customer_email}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-2">
                            {/* User Type Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${userTypeConfig.color}`}
                            >
                              {userTypeConfig.text}
                            </span>

                            {/* ✅ Company Name - Hanya tampil jika user_type = company dan ada company_name */}
                            {report.user_type === "company" &&
                              report.company_name && (
                                <div className="text-xs text-gray-600">
                                  {report.company_name}
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="font-bold text-gray-900">
                              {formatCurrency(report.total_amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {report.item_count} items
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
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.text}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Selesai: {formatDate(report.completed_at)}
                          </div>
                        </td>
                        <td
                          className={`py-4 px-6 ${
                            isLastRow ? "rounded-br-lg" : ""
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDownloadReport(report)}
                              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
                              title="Download Laporan"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteFromHistory(
                                  report.id,
                                  report.order_number
                                )
                              }
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Hapus dari Riwayat"
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
                {reports.map((report) => {
                  const statusConfig = getStatusBadge(report.order_status);
                  const paymentConfig = getPaymentBadge(report.payment_status);
                  const userTypeConfig = getUserTypeBadge(report.user_type);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={report.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {report.order_number}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(report.original_created_at)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.text}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {report.customer_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {report.customer_email}
                        </p>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Tipe User</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${userTypeConfig.color}`}
                            >
                              {userTypeConfig.text}
                            </span>
                          </div>
                          {report.user_type === "company" &&
                            report.company_name && (
                              <p className="text-xs text-gray-600 mt-1">
                                {report.company_name}
                              </p>
                            )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-gray-900">
                            {formatCurrency(report.total_amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {report.item_count} items
                          </p>
                        </div>
                      </div>

                      {/* Payment & Completion */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Pembayaran</p>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${paymentConfig.color}`}
                          >
                            {paymentConfig.text}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Selesai</p>
                          <p className="text-xs text-gray-900">
                            {formatDate(report.completed_at)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          ID: {report.id}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownloadReport(report)}
                            className="flex items-center gap-1 px-2 py-1 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 text-xs font-medium"
                            title="Download Laporan"
                          >
                            <Download className="w-3 h-3" />
                            Unduh
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteFromHistory(report.id, report.order_number)
                            }
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Hapus dari Riwayat"
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
          {!loading && reports.length > 0 && (
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
                  <span className="text-xs sm:text-sm text-gray-700">per halaman</span>
                </div>

                {/* Pagination info */}
                <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                  Menampilkan {(pagination.currentPage - 1) * itemsPerPage + 1}{" "}
                  -{" "}
                  {Math.min(
                    pagination.currentPage * itemsPerPage,
                    pagination.totalItems
                  )}{" "}
                  dari {pagination.totalItems} riwayat
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
                      } else if (pagination.currentPage >= pagination.totalPages - 1) {
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
    </div>
  );
};

export default Report;