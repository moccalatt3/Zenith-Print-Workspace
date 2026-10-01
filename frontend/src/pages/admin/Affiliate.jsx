import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Percent,
  Calendar,
  CheckCircle,
  XCircle,
  User,
  BarChart3,
  Mail,
  Phone,
  X,
  Save,
  Loader,
  AlertCircle,
  Settings,
  Grid,
  Table,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import affiliateService from "../../services/affiliateService";

const Marketing = () => {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // State baru untuk view mode
  const [viewMode, setViewMode] = useState("card"); // 'card' atau 'table'

  // State untuk modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [affiliateSettings, setAffiliateSettings] = useState({
    relationship_expiry_months: 6, // Default value
  });

  // Tambahkan state baru
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [sortFilter, setSortFilter] = useState("default");

  const [jobInfo, setJobInfo] = useState(null);

  // Mobile filter state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fungsi helper untuk deskripsi schedule
  const getScheduleDescription = (schedule) => {
    const schedules = {
      "*/1 * * * *": "1 menit sekali",
      "0 */1 * * *": "1 jam sekali",
      "0 2 * * *": "Setiap hari 02:00",
      "0 2 * * 1": "Setiap Senin 02:00",
      "0 2 * * 1,4": "Senin & Kamis 02:00",
      "0 2 1 * *": "Tanggal 1 setiap bulan 02:00",
    };
    return schedules[schedule] || schedule;
  };

  const runManualCleanup = async () => {
    try {
      const response = await affiliateService.manualCleanup();
      if (response.success) {
        alert(
          `Cleanup berhasil: ${response.data.cleaned} relationships dibersihkan`
        );
        fetchAffiliates();
      }
    } catch (error) {
      console.error("Error running manual cleanup:", error);
      alert("Gagal menjalankan cleanup: " + error.message);
    }
  };
  const saveAffiliateSettings = async () => {
    try {
      setConfigLoading(true);

      const settingsData = {
        relationship_expiry_months:
          affiliateSettings.relationship_expiry_months,
        cleanup_schedule:
          affiliateSettings.cleanup_schedule === "custom"
            ? affiliateSettings.custom_schedule
            : affiliateSettings.cleanup_schedule,
        cleanup_timezone: affiliateSettings.cleanup_timezone,
        cleanup_job_enabled: "true",
      };

      console.log("💾 Saving affiliate settings:", settingsData);

      const response = await affiliateService.updateAffiliateSettings(
        settingsData
      );

      if (response.success) {
        console.log("✅ Settings saved successfully!");
        setShowConfigModal(false);
        await fetchJobInfo();
      }
    } catch (error) {
      console.error("❌ Error saving affiliate settings:", error);
      alert("Gagal menyimpan pengaturan: " + error.message);
    } finally {
      setConfigLoading(false);
    }
  };
  // Fungsi untuk fetch job info
  const fetchJobInfo = async () => {
    try {
      const response = await affiliateService.getCleanupJobInfo();
      if (response.success) {
        setJobInfo(response.data);
      }
    } catch (error) {
      console.error("Error fetching job info:", error);
    }
  };

  // Panggil fetchJobInfo saat modal dibuka
  useEffect(() => {
    if (showConfigModal) {
      fetchJobInfo();
    }
  }, [showConfigModal]);

  // State untuk form baru
  const [newAffiliate, setNewAffiliate] = useState({
    name: "",
    email: "",
    phone: "",
    commission_rate: 10,
    status: "active",
  });

  // Loading state untuk operasi
  const [operationLoading, setOperationLoading] = useState(false);

  // ✅ STATE PAGINATION BARU
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadAffiliateSettings = async () => {
    try {
      setConfigLoading(true);
      console.log("🔄 Loading affiliate settings...");

      const response = await affiliateService.getAffiliateSettings();

      if (response.success) {
        console.log("✅ Settings loaded:", response.data);

        // Format settings untuk state
        const formattedSettings = {};
        if (response.data.relationship_expiry_months) {
          formattedSettings.relationship_expiry_months =
            parseInt(response.data.relationship_expiry_months.value) || 6;
        }

        setAffiliateSettings(formattedSettings);
      }
    } catch (err) {
      console.error("❌ Error loading settings:", err);
      setError("Gagal memuat pengaturan affiliate");
    } finally {
      setConfigLoading(false);
    }
  };

  // ✅ EFFECT BARU: Load settings on component mount
  useEffect(() => {
    loadAffiliateSettings();
  }, []);

  const handleWithdrawCommission = async () => {
    if (!selectedAffiliate) return;

    try {
      setWithdrawLoading(true);
      console.log(
        `🔄 Withdrawing commission for affiliate: ${selectedAffiliate.id}`
      );

      const response = await affiliateService.withdrawCommission(
        selectedAffiliate.id
      );

      if (response.success) {
        setSuccess(response.message);
        setShowWithdrawModal(false);
        setSelectedAffiliate(null);

        // Refresh data affiliates
        fetchAffiliates();

        console.log(`✅ Withdrawal successful:`, response.data);
      }
    } catch (err) {
      console.error("❌ Withdrawal error:", err);
      setError(err.message || "Gagal mencairkan komisi");
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Tambahkan handler untuk buka modal cairkan
  const handleOpenWithdraw = (affiliate) => {
    // Cek apakah ada pending earnings
    const pendingEarnings = affiliate.pending_earnings || 0;
    if (pendingEarnings <= 0) {
      setError("Tidak ada komisi pending yang bisa dicairkan");
      return;
    }

    setSelectedAffiliate(affiliate);
    setShowWithdrawModal(true);
  };

  // ✅ FUNGSI BARU: Fetch affiliates dengan pagination
  const fetchAffiliates = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);
      setError("");
      console.log("🔄 Fetching affiliates data with pagination...");

      const filters = {
        page: page,
        limit: limit,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : "",
        sortBy: mapSortFilterToBackend(sortFilter),
      };

      const response = await affiliateService.getAllAffiliatesPaginated(
        filters
      );
      console.log("📨 API Response:", response);

      if (response.success) {
        console.log(
          "✅ Success - Total affiliates:",
          response.data.affiliates.length
        );
        console.log("📊 Pagination info:", response.data.pagination);

        setAffiliates(response.data.affiliates);
        setPagination(response.data.pagination);
      } else {
        console.error("❌ API Error:", response.message);
        setError(response.message || "Gagal memuat data affiliates");
      }
    } catch (err) {
      console.error("💥 Fetch error:", err);
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNGSI BARU: Map frontend sort filter ke backend sortBy
  const mapSortFilterToBackend = (filter) => {
    const mapping = {
      default: "recent",
      pending_high: "pending_high",
      pending_low: "pending_low",
      earnings_high: "earnings_high",
      earnings_low: "earnings_low",
      referrals_high: "referrals_high",
      referrals_low: "referrals_low",
      name_asc: "name",
      name_desc: "name", // Backend akan handle ASC/DESC
      join_date_new: "join_date_new",
      join_date_old: "join_date_old",
    };
    return mapping[filter] || "recent";
  };

  // ✅ FUNGSI BARU: Handler untuk ganti page
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchAffiliates(newPage, itemsPerPage);
    }
  };

  // ✅ FUNGSI BARU: Handler untuk ganti items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    fetchAffiliates(1, newLimit);
  };

  // Initial load
  useEffect(() => {
    fetchAffiliates(1, itemsPerPage);
  }, []);

  // Search effect dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAffiliates(1, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, sortFilter]);

  // Format currency
  const formatCurrency = (amount) => {
    const numericAmount =
      typeof amount === "number" ? amount : parseFloat(amount) || 0;

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  };

  const formatCommissionRate = (rate) => {
    const numericRate = typeof rate === "number" ? rate : parseFloat(rate) || 0;
    return `${Math.round(numericRate)}%`;
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

  // Get status badge configuration
  const getStatusBadge = (status) => {
    return status === "active"
      ? {
          color: "bg-green-100 text-green-800",
          text: "Aktif",
          icon: CheckCircle,
        }
      : { color: "bg-red-100 text-red-800", text: "Nonaktif", icon: XCircle };
  };

  // Get performance badge configuration
  const getPerformanceBadge = (performance) => {
    const performanceConfig = {
      excellent: {
        color: "bg-emerald-100 text-emerald-800",
        text: "Excellent",
      },
      good: { color: "bg-blue-100 text-blue-800", text: "Good" },
      average: { color: "bg-yellow-100 text-yellow-800", text: "Average" },
      poor: { color: "bg-orange-100 text-orange-800", text: "Poor" },
    };
    return performanceConfig[performance] || performanceConfig.average;
  };

  // Copy referral code to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess(`Kode ${text} berhasil disalin!`);
    setTimeout(() => setSuccess(""), 3000);
  };

  // Handler untuk modal
  const handleViewDetail = async (affiliate) => {
    try {
      setOperationLoading(true);
      const response = await affiliateService.getAffiliateById(affiliate.id);
      if (response.success) {
        setSelectedAffiliate(response.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      setError(err.message || "Gagal memuat detail affiliate");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEdit = (affiliate) => {
    setSelectedAffiliate({ ...affiliate });
    setShowEditModal(true);
  };

  const handleDelete = (affiliate) => {
    setSelectedAffiliate(affiliate);
    setShowDeleteModal(true);
  };

  const handleAddAffiliate = async () => {
    if (!newAffiliate.name || !newAffiliate.email) {
      setError("Nama dan email harus diisi");
      return;
    }

    try {
      setOperationLoading(true);
      const response = await affiliateService.createAffiliate(newAffiliate);
      if (response.success) {
        setSuccess("Affiliate berhasil ditambahkan");
        setShowAddModal(false);
        setNewAffiliate({
          name: "",
          email: "",
          phone: "",
          commission_rate: 10,
          status: "active",
        });
        fetchAffiliates(pagination.currentPage, itemsPerPage);
      }
    } catch (err) {
      setError(err.message || "Gagal menambahkan affiliate");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedAffiliate.name || !selectedAffiliate.email) {
      setError("Nama dan email harus diisi");
      return;
    }

    try {
      setOperationLoading(true);
      const response = await affiliateService.updateAffiliate(
        selectedAffiliate.id,
        {
          name: selectedAffiliate.name,
          email: selectedAffiliate.email,
          phone: selectedAffiliate.phone,
          commission_rate: selectedAffiliate.commission_rate,
          status: selectedAffiliate.status,
        }
      );

      if (response.success) {
        setSuccess("Affiliate berhasil diperbarui");
        setShowEditModal(false);
        setSelectedAffiliate(null);
        fetchAffiliates(pagination.currentPage, itemsPerPage);
      }
    } catch (err) {
      setError(err.message || "Gagal memperbarui affiliate");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setOperationLoading(true);
      const response = await affiliateService.deleteAffiliate(
        selectedAffiliate.id
      );
      if (response.success) {
        setSuccess("Affiliate berhasil dihapus");
        setShowDeleteModal(false);
        setSelectedAffiliate(null);
        fetchAffiliates(pagination.currentPage, itemsPerPage);
      }
    } catch (err) {
      setError(err.message || "Gagal menghapus affiliate");
    } finally {
      setOperationLoading(false);
    }
  };

  const stats = [
    {
      title: "Total Affiliates",
      value: pagination.totalItems.toString(),
      change: "+15%",
      trend: "up",
      icon: Users,
      color: "text-gray-900",
      bgColor: "bg-gray-100",
      showFromLast: true,
    },
    {
      title: "Active Affiliates",
      value: affiliates.filter((a) => a.status === "active").length.toString(),
      change: "+8",
      trend: "up",
      icon: User,
      color: "text-gray-900",
      bgColor: "bg-gray-100",
      showFromLast: false,
    },
    {
      title: "Total Referrals",
      value: affiliates
        .reduce((sum, affiliate) => sum + (affiliate.total_referrals || 0), 0)
        .toString(),
      change: "+42%",
      trend: "up",
      icon: TrendingUp,
      color: "text-gray-900",
      bgColor: "bg-gray-100",
      showFromLast: true,
    },
    {
      title: "Total Komisi",
      value: formatCurrency(
        affiliates.reduce(
          (sum, affiliate) => sum + (affiliate.total_earnings || 0),
          0
        )
      ),
      change: "+38%",
      trend: "up",
      icon: DollarSign,
      color: "text-gray-900",
      bgColor: "bg-gray-100",
      showFromLast: true,
    },
  ];
  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowDetailModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedAffiliate(null);
  };

  // Komponen untuk tampilan Card
  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {affiliates.map((affiliate) => {
        const statusConfig = getStatusBadge(affiliate.status);
        const performanceConfig = getPerformanceBadge(affiliate.performance);
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={affiliate.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group"
          >
            {/* Header dengan gradient hitam */}
            <div className="bg-gradient-to-r from-[#000000] to-[#212121] p-4 sm:p-6 text-white relative">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <User className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm sm:text-lg truncate">{affiliate.name}</h3>
                    <p className="text-white/80 text-xs sm:text-sm truncate">{affiliate.email}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.text}
                </span>
              </div>

              {/* Referral Code */}
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-white/80 text-xs">Kode Referral</p>
                    <p className="font-mono font-bold text-sm sm:text-lg truncate">
                      {affiliate.referral_code}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(affiliate.referral_code)}
                    className="p-1 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 flex-shrink-0 ml-2"
                    title="Salin Kode"
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {/* Commission Rate */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="text-xl sm:text-3xl font-bold text-gray-900">
                  {formatCommissionRate(affiliate.commission_rate)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Komisi per Referral</div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="text-center">
                  <div className="font-bold text-gray-900 text-lg sm:text-xl">
                    {affiliate.total_referrals || 0}
                  </div>
                  <div className="text-xs text-gray-500">Total Referral</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900 text-lg sm:text-xl">
                    {affiliate.referral_stats?.active ||
                      affiliate.active_referrals ||
                      0}
                  </div>
                  <div className="text-xs text-gray-500">Aktif</div>
                </div>
              </div>

              {/* Earnings */}
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Total Komisi:</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">
                    {formatCurrency(affiliate.total_earnings || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Pending:</span>
                  <span className="font-bold text-orange-600 text-sm sm:text-base">
                    {formatCurrency(affiliate.pending_earnings || 0)}
                  </span>
                </div>
              </div>

              {/* Date Only */}
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Bergabung {formatDate(affiliate.join_date)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 sm:gap-2 pt-3 sm:pt-4 border-t border-gray-100 mt-3 sm:mt-4">
                <button
                  onClick={() => handleViewDetail(affiliate)}
                  disabled={operationLoading}
                  className="flex-1 p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Detail Affiliate"
                >
                  {operationLoading ? (
                    <Loader className="w-3 h-3 sm:w-4 sm:h-4 inline animate-spin" />
                  ) : (
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 inline" />
                  )}
                </button>

                {affiliate.pending_earnings > 0 && (
                  <button
                    onClick={() => handleOpenWithdraw(affiliate)}
                    disabled={operationLoading}
                    className="flex-1 p-1.5 sm:p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Cairkan Komisi"
                  >
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 inline" />
                  </button>
                )}

                <button
                  onClick={() => handleEdit(affiliate)}
                  disabled={operationLoading}
                  className="flex-1 p-1.5 sm:p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Edit Affiliate"
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 inline" />
                </button>
                <button
                  onClick={() => handleDelete(affiliate)}
                  disabled={operationLoading}
                  className="flex-1 p-1.5 sm:p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Hapus Affiliate"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 inline" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Komponen Pagination untuk Card View
  const CardPagination = () => (
    <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4 mt-4 sm:mt-6">
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
        <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
          Menampilkan {(pagination.currentPage - 1) * itemsPerPage + 1} -{" "}
          {Math.min(
            pagination.currentPage * itemsPerPage,
            pagination.totalItems
          )}{" "}
          dari {pagination.totalItems} affiliate
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
  );

  // Komponen untuk tampilan Table
  const TableView = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full hidden lg:table">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tl-lg">
                Affiliate
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Kontak
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Kode Referral
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Komisi
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Referral
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Pendapatan
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
            {affiliates.map((affiliate, index) => {
              const statusConfig = getStatusBadge(affiliate.status);
              const StatusIcon = statusConfig.icon;
              const isLastRow = index === affiliates.length - 1;

              return (
                <tr
                  key={affiliate.id}
                  className="hover:bg-gray-50 transition-all duration-150 group"
                >
                  <td
                    className={`py-4 px-6 ${isLastRow ? "rounded-bl-lg" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          {affiliate.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Bergabung {formatDate(affiliate.join_date)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {affiliate.email}
                      </div>
                      {affiliate.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {affiliate.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {affiliate.referral_code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(affiliate.referral_code)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Salin Kode"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-center">
                      <div className="font-bold text-gray-900 text-lg">
                        {formatCommissionRate(affiliate.commission_rate)}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold text-gray-900">
                          {affiliate.total_referrals || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Aktif:</span>
                        <span className="font-medium text-green-600">
                          {affiliate.referral_stats?.active ||
                            affiliate.active_referrals ||
                            0}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(affiliate.total_earnings || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Pending:</span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(affiliate.pending_earnings || 0)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.text}
                    </span>
                  </td>
                  <td
                    className={`py-4 px-6 ${isLastRow ? "rounded-br-lg" : ""}`}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewDetail(affiliate)}
                        disabled={operationLoading}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Detail Affiliate"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {affiliate.pending_earnings > 0 && (
                        <button
                          onClick={() => handleOpenWithdraw(affiliate)}
                          disabled={operationLoading}
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                          title="Cairkan Komisi"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleEdit(affiliate)}
                        disabled={operationLoading}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                        title="Edit Affiliate"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(affiliate)}
                        disabled={operationLoading}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Hapus Affiliate"
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

      {/* Mobile Table View */}
      <div className="lg:hidden space-y-3 p-4">
        {affiliates.map((affiliate) => {
          const statusConfig = getStatusBadge(affiliate.status);
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={affiliate.id}
              className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {affiliate.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {affiliate.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Bergabung {formatDate(affiliate.join_date)}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.text}
                </span>
              </div>

              {/* Referral Code */}
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-xs text-gray-600">Kode Referral</p>
                  <p className="font-mono font-medium text-gray-900 text-sm">
                    {affiliate.referral_code}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(affiliate.referral_code)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Salin Kode"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Komisi</p>
                  <p className="font-bold text-gray-900">
                    {formatCommissionRate(affiliate.commission_rate)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Referral</p>
                  <p className="font-bold text-gray-900">
                    {affiliate.total_referrals || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Aktif</p>
                  <p className="font-bold text-green-600">
                    {affiliate.referral_stats?.active ||
                      affiliate.active_referrals ||
                      0}
                  </p>
                </div>
              </div>

              {/* Earnings */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Total Komisi</p>
                  <p className="font-bold text-gray-900">
                    {formatCurrency(affiliate.total_earnings || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="font-bold text-orange-600">
                    {formatCurrency(affiliate.pending_earnings || 0)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  ID: {affiliate.id}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewDetail(affiliate)}
                    disabled={operationLoading}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Detail Affiliate"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {affiliate.pending_earnings > 0 && (
                    <button
                      onClick={() => handleOpenWithdraw(affiliate)}
                      disabled={operationLoading}
                      className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                      title="Cairkan Komisi"
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(affiliate)}
                    disabled={operationLoading}
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                    title="Edit Affiliate"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(affiliate)}
                    disabled={operationLoading}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Hapus Affiliate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ PAGINATION SECTION */}
      {!loading && affiliates.length > 0 && (
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
              Menampilkan {(pagination.currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(
                pagination.currentPage * itemsPerPage,
                pagination.totalItems
              )}{" "}
              dari {pagination.totalItems} affiliate
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
  );

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="flex-1 text-sm">{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span className="flex-1 text-sm">{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Program Affiliate
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Kelola affiliate marketers dan program referral
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* ✅ TOMBOL KONFIGURASI BARU */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#000000] to-[#333333] text-white rounded-lg hover:from-[#333333] hover:to-[#555555] transition-all duration-200 font-medium text-sm sm:text-base order-2 sm:order-1"
            title="Konfigurasi Affiliate"
          >
            <Settings className="w-4 h-4" />
            Konfigurasi
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium text-sm sm:text-base order-1 sm:order-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Affiliate
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
                <div className="p-2 sm:p-3 rounded-lg bg-gray-100">
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters dan View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari affiliate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                Filter & Urutkan
              </span>
              {isMobileFilterOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {isMobileFilterOpen && (
              <div className="mt-2 bg-white border border-gray-300 rounded-lg shadow-sm space-y-3 p-3">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urutkan
                  </label>
                  <select
                    value={sortFilter}
                    onChange={(e) => setSortFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  >
                    <option value="default">Default</option>
                    <option value="pending_high">Pending Tertinggi</option>
                    <option value="pending_low">Pending Terendah</option>
                    <option value="earnings_high">Komisi Tertinggi</option>
                    <option value="earnings_low">Komisi Terendah</option>
                    <option value="referrals_high">Referral Terbanyak</option>
                    <option value="referrals_low">Referral Terendah</option>
                    <option value="name_asc">Nama A-Z</option>
                    <option value="name_desc">Nama Z-A</option>
                    <option value="join_date_new">Bergabung Terbaru</option>
                    <option value="join_date_old">Bergabung Terlama</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value="default">Urutkan</option>
              <option value="pending_high">Pending Tertinggi</option>
              <option value="pending_low">Pending Terendah</option>
              <option value="earnings_high">Komisi Tertinggi</option>
              <option value="earnings_low">Komisi Terendah</option>
              <option value="referrals_high">Referral Terbanyak</option>
              <option value="referrals_low">Referral Terendah</option>
              <option value="name_asc">Nama A-Z</option>
              <option value="name_desc">Nama Z-A</option>
              <option value="join_date_new">Bergabung Terbaru</option>
              <option value="join_date_old">Bergabung Terlama</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("card")}
            className={`p-2 rounded-md transition-all duration-200 ${
              viewMode === "card"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Tampilan Card"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-md transition-all duration-200 ${
              viewMode === "table"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Tampilan Tabel"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8 sm:py-12">
          <Loader className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 animate-spin" />
          <span className="ml-2 text-gray-600 text-sm">Memuat data affiliates...</span>
        </div>
      )}

      {/* Affiliates View - Card atau Table */}
      {!loading && viewMode === "card" && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            <CardView />
          </div>
          {/* Pagination untuk Card View */}
          {affiliates.length > 0 && <CardPagination />}
        </div>
      )}
      {!loading && viewMode === "table" && <TableView />}

      {/* Empty State */}
      {!loading && affiliates.length === 0 && (
        <div className="text-center py-8 sm:py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            Tidak ada affiliate yang ditemukan
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Coba ubah filter pencarian atau tambahkan affiliate baru
          </p>
        </div>
      )}

      {/* Modal Backdrop */}
      {(showAddModal ||
        showDetailModal ||
        showEditModal ||
        showDeleteModal) && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModals}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal content will be inserted here based on state */}
          </div>
        </div>
      )}

      {/* Add Affiliate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Sesuai dengan modal lainnya */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Tambah Affiliate Baru
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Buat akun affiliate untuk program referral
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={operationLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAffiliate.name}
                  onChange={(e) =>
                    setNewAffiliate({ ...newAffiliate, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  placeholder="Masukkan nama lengkap"
                  disabled={operationLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newAffiliate.email}
                  onChange={(e) =>
                    setNewAffiliate({ ...newAffiliate, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  placeholder="email@contoh.com"
                  disabled={operationLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  value={newAffiliate.phone}
                  onChange={(e) =>
                    setNewAffiliate({ ...newAffiliate, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  placeholder="+62 812-3456-7890"
                  disabled={operationLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tingkat Komisi (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      newAffiliate.commission_rate === 0
                        ? ""
                        : newAffiliate.commission_rate.toString()
                    }
                    onChange={(e) => {
                      // Biarkan user menghapus semua karakter
                      if (e.target.value === "") {
                        setNewAffiliate({
                          ...newAffiliate,
                          commission_rate: 0,
                        });
                        return;
                      }

                      // Hanya terima angka
                      const numericValue = e.target.value.replace(/[^\d]/g, "");
                      const parsedValue = parseInt(numericValue) || 0;

                      // Batasi maksimal 50%
                      if (parsedValue <= 50) {
                        setNewAffiliate({
                          ...newAffiliate,
                          commission_rate: parsedValue,
                        });
                      }
                    }}
                    onBlur={(e) => {
                      // Jika kosong, set ke default 10
                      if (e.target.value === "") {
                        setNewAffiliate({
                          ...newAffiliate,
                          commission_rate: 10,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm pr-12"
                    placeholder="10"
                    disabled={operationLoading}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Maksimal 50%</p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={newAffiliate.status === "active"}
                  onChange={(e) =>
                    setNewAffiliate({
                      ...newAffiliate,
                      status: e.target.checked ? "active" : "inactive",
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                  disabled={operationLoading}
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Aktifkan Affiliate
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Affiliate akan langsung aktif dan bisa mulai mereferensikan
                  </p>
                </div>
              </div>
            </div>

            {/* Footer - Sesuai dengan modal lainnya */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                Field dengan tanda <span className="text-red-500">*</span> wajib
                diisi
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={operationLoading}
                >
                  Batal
                </button>
                <button
                  onClick={handleAddAffiliate}
                  disabled={
                    operationLoading ||
                    !newAffiliate.name ||
                    !newAffiliate.email ||
                    newAffiliate.commission_rate === 0
                  }
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {operationLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Affiliate"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Affiliate Modal */}
      {showDetailModal && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Konsisten dengan modal lain */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Detail Affiliate
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedAffiliate.name} • {selectedAffiliate.email}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Profile Section */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-[#000000] to-[#212121] rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedAffiliate.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {selectedAffiliate.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedAffiliate.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedAffiliate.status === "active"
                        ? "Aktif"
                        : "Nonaktif"}
                    </span>
                    <span className="text-xs text-gray-500">
                      Bergabung {formatDate(selectedAffiliate.join_date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informasi Utama */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-800">
                    Informasi Kontak
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Email</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAffiliate.email}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Telepon</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAffiliate.phone || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        Kode Referral
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {selectedAffiliate.referral_code}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(selectedAffiliate.referral_code)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Salin Kode"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-800">
                    Informasi Komisi
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        Tingkat Komisi
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCommissionRate(
                          selectedAffiliate.commission_rate
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Status</span>
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded ${
                          selectedAffiliate.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {selectedAffiliate.status === "active"
                          ? "AKTIF"
                          : "NONAKTIF"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Bergabung</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(selectedAffiliate.join_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistik */}
              <div>
                <h3 className="text-base font-semibold mb-3 text-gray-800">
                  Statistik Performa
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {selectedAffiliate.total_referrals || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Total Referral
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {selectedAffiliate.active_referrals || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Aktif</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(selectedAffiliate.total_earnings || 0)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Total Komisi
                    </div>
                  </div>
                  <div className="bg-white border border-orange-200 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(selectedAffiliate.pending_earnings || 0)}
                    </div>
                    <div className="text-xs text-orange-500 mt-1">Pending</div>
                  </div>
                </div>
              </div>

              {selectedAffiliate.referrals &&
                selectedAffiliate.referrals.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3 text-gray-800">
                      Daftar Referral ({selectedAffiliate.referrals.length}{" "}
                      user)
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Total: {selectedAffiliate.referral_stats?.total}{" "}
                        transaksi)
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {selectedAffiliate.referrals.map((userReferral) => {
                        const calculateProgressPercentage = (
                          referral,
                          expiryMonths = 6
                        ) => {
                          if (referral.remaining_time.status !== "active")
                            return 0;

                          const totalDays = expiryMonths * 30;
                          const remainingDays =
                            referral.remaining_time.remaining_days;

                          if (
                            !totalDays ||
                            !remainingDays ||
                            remainingDays <= 0
                          )
                            return 100;
                          if (remainingDays >= totalDays) return 0;

                          const usedDays = totalDays - remainingDays;
                          const percentage = (usedDays / totalDays) * 100;

                          return Math.max(0, Math.min(100, percentage));
                        };

                        const expiryMonths =
                          selectedAffiliate.relationship_settings
                            ?.expiry_months || 6;
                        const progressPercentage = calculateProgressPercentage(
                          userReferral,
                          expiryMonths
                        );

                        const formatExpiryDate = (dateString) => {
                          if (!dateString) return null;
                          const date = new Date(dateString);
                          return date.toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          });
                        };

                        const expiryDateFormatted = formatExpiryDate(
                          userReferral.remaining_time.expiry_date
                        );

                        return (
                          <div
                            key={userReferral.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-gray-900 text-sm">
                                        {userReferral.referred_email}
                                      </p>
                                      {userReferral.referral_count > 1 && (
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                          {userReferral.referral_count}{" "}
                                          transaksi
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {userReferral.user_info?.user_name ||
                                        "Nama tidak tersedia"}
                                    </p>

                                    {/* INFORMASI STATUS DAN WAKTU */}
                                    <div className="mt-3">
                                      <div
                                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                                          userReferral.remaining_time.status ===
                                          "active"
                                            ? "bg-green-100 text-green-800 border border-green-200"
                                            : userReferral.remaining_time
                                                .status === "not_joined"
                                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                                            : "bg-gray-100 text-gray-800 border border-gray-200"
                                        }`}
                                      >
                                        {userReferral.remaining_time.status ===
                                          "active" && (
                                          <Calendar className="w-3 h-3 mr-1" />
                                        )}
                                        {userReferral.remaining_time.status ===
                                          "not_joined" && (
                                          <User className="w-3 h-3 mr-1" />
                                        )}
                                        {userReferral.remaining_time.message}
                                        {userReferral.remaining_time
                                          .using_stored_expiry && (
                                          <span className="ml-1 text-xs">
                                            (stored)
                                          </span>
                                        )}
                                      </div>

                                      {/* PROGRESS BAR untuk status active */}
                                      {userReferral.remaining_time.status ===
                                        "active" && (
                                        <div className="mt-2">
                                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Sisa waktu hubungan</span>
                                            <span className="font-medium">
                                              {
                                                userReferral.remaining_time
                                                  .remaining_days
                                              }{" "}
                                              hari
                                              {userReferral.remaining_time
                                                .remaining_months > 0 &&
                                                ` (${userReferral.remaining_time.remaining_months} bulan ${userReferral.remaining_time.remaining_days_in_month} hari)`}
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                              style={{
                                                width: `${progressPercentage}%`,
                                              }}
                                            ></div>
                                          </div>
                                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>
                                              Masa berlaku: {expiryMonths} bulan
                                              {expiryDateFormatted && (
                                                <span className="ml-1">
                                                  (hingga {expiryDateFormatted})
                                                </span>
                                              )}
                                            </span>
                                            <span>
                                              {Math.round(progressPercentage)}%
                                              terpakai
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* STATUS DAN TOTAL KOMISI */}
                                  <div className="text-right ml-4">
                                    <span
                                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                        userReferral.status === "active"
                                          ? "bg-green-100 text-green-700"
                                          : userReferral.status === "completed"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-yellow-100 text-yellow-700"
                                      }`}
                                    >
                                      {userReferral.status === "active"
                                        ? "AKTIF"
                                        : userReferral.status === "completed"
                                        ? "SELESAI"
                                        : "PENDING"}
                                    </span>

                                    <div className="mt-2">
                                      <p className="font-semibold text-gray-900 text-sm">
                                        {formatCurrency(
                                          userReferral.total_commission || 0
                                        )}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Total Komisi
                                        {userReferral.referral_count > 1 && (
                                          <span className="block">
                                            dari {userReferral.referral_count}{" "}
                                            transaksi
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* INFORMASI REFERRAL EXPIRED */}
                    {selectedAffiliate.referral_stats?.expired > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 text-center">
                          {selectedAffiliate.referral_stats.expired} referral
                          telah expired dan tidak ditampilkan
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Empty State untuk Referrals */}
              {(!selectedAffiliate.referrals ||
                selectedAffiliate.referrals.length === 0) && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Belum ada referral yang terdaftar
                  </p>
                </div>
              )}
            </div>

            {/* Footer - Konsisten dengan modal lain */}
            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Affiliate Modal */}
      {showEditModal && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Sesuai dengan modal lainnya */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Affiliate
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Ubah informasi affiliate
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={operationLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={selectedAffiliate.name}
                  onChange={(e) =>
                    setSelectedAffiliate({
                      ...selectedAffiliate,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  disabled={operationLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={selectedAffiliate.email}
                  onChange={(e) =>
                    setSelectedAffiliate({
                      ...selectedAffiliate,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  disabled={operationLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telepon
                </label>
                <input
                  type="tel"
                  value={selectedAffiliate.phone || ""}
                  onChange={(e) =>
                    setSelectedAffiliate({
                      ...selectedAffiliate,
                      phone: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  disabled={operationLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tingkat Komisi (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      // PERBAIKAN: Konversi ke integer dan handle nilai 0
                      selectedAffiliate.commission_rate === 0 ||
                      selectedAffiliate.commission_rate === null ||
                      selectedAffiliate.commission_rate === undefined
                        ? ""
                        : Math.floor(
                            selectedAffiliate.commission_rate
                          ).toString()
                    }
                    onChange={(e) => {
                      // Biarkan user menghapus semua karakter
                      if (e.target.value === "") {
                        setSelectedAffiliate({
                          ...selectedAffiliate,
                          commission_rate: 0,
                        });
                        return;
                      }

                      // Hanya terima angka
                      const numericValue = e.target.value.replace(/[^\d]/g, "");
                      const parsedValue = parseInt(numericValue) || 0;

                      // Batasi maksimal 50%
                      if (parsedValue <= 50) {
                        setSelectedAffiliate({
                          ...selectedAffiliate,
                          commission_rate: parsedValue,
                        });
                      }
                    }}
                    onBlur={(e) => {
                      // Jika kosong, set ke nilai sebelumnya atau default 10
                      if (e.target.value === "") {
                        const currentValue = selectedAffiliate.commission_rate;
                        setSelectedAffiliate({
                          ...selectedAffiliate,
                          commission_rate:
                            currentValue && currentValue > 0
                              ? Math.floor(currentValue)
                              : 10,
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow: backspace, delete, tab, escape, enter, numbers
                      if (
                        [46, 8, 9, 27, 13, 110].includes(e.keyCode) ||
                        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                        (e.keyCode === 65 && e.ctrlKey === true) ||
                        (e.keyCode === 67 && e.ctrlKey === true) ||
                        (e.keyCode === 86 && e.ctrlKey === true) ||
                        (e.keyCode === 88 && e.ctrlKey === true) ||
                        // Allow: home, end, left, right
                        (e.keyCode >= 35 && e.keyCode <= 39) ||
                        // Allow: numbers
                        (e.keyCode >= 48 && e.keyCode <= 57) ||
                        (e.keyCode >= 96 && e.keyCode <= 105)
                      ) {
                        return;
                      }
                      // Prevent default for other keys
                      e.preventDefault();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm pr-12"
                    placeholder="10"
                    disabled={operationLoading}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Maksimal 50%</p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedAffiliate.status === "active"}
                  onChange={(e) =>
                    setSelectedAffiliate({
                      ...selectedAffiliate,
                      status: e.target.checked ? "active" : "inactive",
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                  disabled={operationLoading}
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Aktifkan Affiliate
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Affiliate akan langsung aktif dan bisa mulai mereferensikan
                  </p>
                </div>
              </div>
            </div>

            {/* Footer - Sesuai dengan modal lainnya */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                Field dengan tanda <span className="text-red-500">*</span> wajib
                diisi
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={operationLoading}
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={
                    operationLoading ||
                    !selectedAffiliate.name ||
                    !selectedAffiliate.email ||
                    selectedAffiliate.commission_rate === 0
                  }
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {operationLoading ? (
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-red-600">
                Hapus Affiliate
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200 text-gray-500 hover:text-gray-700"
                disabled={operationLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Konfirmasi Penghapusan
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Apakah Anda yakin ingin menghapus affiliate ini?
                  </p>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#000000] to-[#212121] rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 text-sm">
                      {selectedAffiliate.name}
                    </h4>
                    <p className="text-red-600 text-xs">
                      {selectedAffiliate.email}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Tindakan ini tidak dapat dibatalkan. Semua data affiliate akan
                dihapus secara permanen.
              </p>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                disabled={operationLoading}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={operationLoading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium disabled:opacity-50"
              >
                {operationLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {operationLoading ? "Menghapus..." : "Hapus Affiliate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Commission Modal */}
      {showWithdrawModal && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Cairkan Komisi
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Konfirmasi pencairan komisi pending
                </p>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                disabled={withdrawLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#000000] to-[#212121] rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedAffiliate.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedAffiliate.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    Kode: {selectedAffiliate.referral_code}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 text-sm">
                      Konfirmasi Pencairan
                    </h4>
                    <p className="text-yellow-700 text-xs mt-1">
                      Anda akan mencairkan komisi pending menjadi total komisi.
                      Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">
                    Komisi Pending:
                  </span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatCurrency(selectedAffiliate.pending_earnings || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">
                    Total Komisi Saat Ini:
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(selectedAffiliate.total_earnings || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-sm font-medium text-green-800">
                    Total Komisi Setelah Cair:
                  </span>
                  <span className="text-lg font-bold text-green-700">
                    {formatCurrency(
                      (selectedAffiliate.total_earnings || 0) +
                        (selectedAffiliate.pending_earnings || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                disabled={withdrawLoading}
              >
                Batal
              </button>
              <button
                onClick={handleWithdrawCommission}
                disabled={withdrawLoading}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Cairkan Komisi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Konfigurasi Affiliate
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Atur pengaturan program affiliate & cleanup otomatis
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={configLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Section Masa Berlaku Relationship */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Masa Berlaku Relationship{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={affiliateSettings.relationship_expiry_months || "1"}
                    onChange={(e) =>
                      setAffiliateSettings({
                        ...affiliateSettings,
                        relationship_expiry_months: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    disabled={configLoading}
                  >
                    <option value="1">1 Bulan</option>
                    <option value="2">2 Bulan</option>
                    <option value="3">3 Bulan</option>
                    <option value="4">4 Bulan</option>
                    <option value="5">5 Bulan</option>
                    <option value="6">6 Bulan</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Relationship akan otomatis expired setelah jangka waktu ini
                  </p>
                </div>

                {/* Preview Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 text-sm mb-2">
                    Contoh Perhitungan:
                  </h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <p>
                      • User bergabung: <strong>1 Januari 2024</strong>
                    </p>
                    <p>
                      • Relationship expired:{" "}
                      <strong>
                        {(() => {
                          const joinDate = new Date();
                          const expiryMonths =
                            affiliateSettings.relationship_expiry_months || 1;
                          const expiryDate = new Date(joinDate);
                          expiryDate.setMonth(
                            expiryDate.getMonth() + parseInt(expiryMonths)
                          );
                          return expiryDate.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          });
                        })()}
                      </strong>
                    </p>
                    <p>
                      • Total durasi:{" "}
                      <strong>
                        {affiliateSettings.relationship_expiry_months || 1}{" "}
                        bulan
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Section Jadwal Cleanup Otomatis */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 text-sm mb-3">
                  Jadwal Cleanup Otomatis
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frekuensi Cleanup <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={
                        affiliateSettings.cleanup_schedule || "*/1 * * * *"
                      }
                      onChange={(e) =>
                        setAffiliateSettings({
                          ...affiliateSettings,
                          cleanup_schedule: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      disabled={configLoading}
                    >
                      <option value="*/1 * * * *">
                        1 Menit Sekali (Testing)
                      </option>
                      <option value="0 */1 * * *">1 Jam Sekali</option>
                      <option value="0 2 * * *">Setiap Hari (02:00)</option>
                      <option value="0 2 * * 1">Setiap Senin (02:00)</option>
                      <option value="0 2 * * 1,4">Senin & Kamis (02:00)</option>
                      <option value="0 2 1 * *">
                        Tanggal 1 Setiap Bulan (02:00)
                      </option>
                      <option value="custom">Custom Cron</option>
                    </select>

                    {affiliateSettings.cleanup_schedule === "custom" && (
                      <input
                        type="text"
                        placeholder="* * * * *"
                        value={affiliateSettings.custom_schedule || ""}
                        onChange={(e) =>
                          setAffiliateSettings({
                            ...affiliateSettings,
                            custom_schedule: e.target.value,
                          })
                        }
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-xs"
                        disabled={configLoading}
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Sistem akan otomatis reset relationships yang sudah
                      expired sesuai jadwal
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={
                        affiliateSettings.cleanup_timezone || "Asia/Jakarta"
                      }
                      onChange={(e) =>
                        setAffiliateSettings({
                          ...affiliateSettings,
                          cleanup_timezone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      disabled={configLoading}
                    >
                      <option value="Asia/Jakarta">WIB (Jakarta)</option>
                      <option value="Asia/Makassar">WITA (Makassar)</option>
                      <option value="Asia/Jayapura">WIT (Jayapura)</option>
                    </select>
                  </div>

                  {/* Manual Cleanup Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={runManualCleanup}
                      disabled={configLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Jalankan Cleanup Sekarang
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={configLoading}
                >
                  Batal
                </button>
                <button
                  onClick={saveAffiliateSettings}
                  disabled={
                    configLoading ||
                    !affiliateSettings.relationship_expiry_months ||
                    !affiliateSettings.cleanup_schedule
                  }
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {configLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Pengaturan"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketing;