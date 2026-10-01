import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  User,
  Package,
  ShoppingCart,
  Settings,
  RefreshCw,
  Loader,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import logService from "../../services/logService";

// Constants moved outside component to prevent re-renders
const ACTION_TYPE_MAP = {
  created: "Dibuat",
  updated: "Diupdate",
  deleted: "Dihapus",
  danger: "Berbahaya",
  login: "Login",
  logout: "Logout",
};

const RESOURCE_TYPE_MAP = {
  material: "Material",
  order: "Order",
  user: "User",
  bank: "Bank",
  affiliate: "Affiliate",
  payment: "Payment",
};

const MODULE_ICONS = {
  user: User,
  material: Package,
  order: ShoppingCart,
  payment: ShoppingCart,
  bank: Settings,
  affiliate: Settings,
};

const LOG_LEVELS = {
  all: {
    label: "Semua Level",
    color: "bg-gray-100 text-gray-700",
    icon: Info,
  },
  info: { label: "Info", color: "bg-blue-100 text-blue-700", icon: Info },
  success: {
    label: "Success",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  warning: {
    label: "Warning",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertCircle,
  },
  error: {
    label: "Error",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Custom hook untuk debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Mobile filter state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    search: "",
    action_type: "",
    resource_type: "",
    start_date: "",
    end_date: "",
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 300);

  // Format functions dengan useCallback
  const formatActionType = useCallback((actionType) => {
    return ACTION_TYPE_MAP[actionType] || actionType;
  }, []);

  const formatResourceType = useCallback((resourceType) => {
    return RESOURCE_TYPE_MAP[resourceType] || resourceType;
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getLogLevel = useCallback((actionType) => {
    if (actionType.includes("created") || actionType === "login") {
      return "success";
    } else if (actionType.includes("updated")) {
      return "info";
    } else if (actionType.includes("deleted") || actionType === "danger") {
      return "error";
    } else {
      return "info";
    }
  }, []);

  const getModuleIcon = useCallback((resourceType) => {
    return MODULE_ICONS[resourceType] || Info;
  }, []);

  // Fetch logs data dengan useCallback
  const fetchLogs = useCallback(
    async (page = 1, limit = itemsPerPage, filterParams = filters) => {
      setLoading(true);
      try {
        console.log("🔄 Fetching logs with:", { page, limit, filterParams });
        
        const response = await logService.getAllLogs({
          page: page,
          limit: limit,
          search: filterParams.search || "",
          action_type: filterParams.action_type || "",
          resource_type: filterParams.resource_type || "",
          start_date: filterParams.start_date || "",
          end_date: filterParams.end_date || "",
        });

        if (response.success) {
          setLogs(response.data.logs);
          setPagination(response.data.pagination);
          console.log("✅ Logs loaded:", {
            logsCount: response.data.logs.length,
            pagination: response.data.pagination
          });
        }
      } catch (error) {
        console.error("❌ Error fetching logs:", error);
        alert(error.message || "Gagal mengambil data logs");
        setLogs([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [itemsPerPage]
  );

  // Fetch stats dengan useCallback
  const fetchStats = useCallback(async () => {
    try {
      const response = await logService.getLogStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const handleResetLogs = useCallback(async () => {
    if (
      !window.confirm(
        "⚠️  PERINGATAN!\n\nAnda akan menghapus SEMUA data logs.\nTindakan ini tidak dapat dibatalkan.\n\nApakah Anda yakin ingin melanjutkan?"
      )
    ) {
      return;
    }

    const finalConfirmation =
      process.env.NODE_ENV === "production" ? "RESET_ALL_LOGS_CONFIRM" : null;

    setResetting(true);
    try {
      await logService.resetAllLogs(finalConfirmation);
      alert("✅ Semua data logs berhasil direset!");
      
      // Refresh data setelah reset
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
      fetchLogs(1, itemsPerPage);
      fetchStats();
      
    } catch (error) {
      console.error("❌ Error resetting logs:", error);
      alert(`Gagal mereset logs: ${error.message}`);
    } finally {
      setResetting(false);
    }
  }, [fetchLogs, fetchStats, itemsPerPage]);

  // Initial load dengan dependencies yang proper
  useEffect(() => {
    fetchLogs(1, itemsPerPage, filters);
    fetchStats();
  }, [fetchLogs, fetchStats, itemsPerPage]);

  // Auto-apply filters ketika debounced search berubah
  useEffect(() => {
    if (debouncedSearch !== undefined) {
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
      fetchLogs(1, itemsPerPage, { ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch, fetchLogs, itemsPerPage]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs(pagination.currentPage, itemsPerPage, filters);
    fetchStats();
  }, [fetchLogs, fetchStats, pagination.currentPage, itemsPerPage, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchLogs(1, itemsPerPage, filters);
  }, [fetchLogs, itemsPerPage, filters]);

  // Reset filters
  const resetFilters = useCallback(() => {
    const resetFilterState = {
      search: "",
      action_type: "",
      resource_type: "",
      start_date: "",
      end_date: "",
    };
    setFilters(resetFilterState);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchLogs(1, itemsPerPage, resetFilterState);
  }, [fetchLogs, itemsPerPage]);

  // Handler untuk ganti page
  const handlePageChange = useCallback(
    (newPage) => {
      console.log("🔄 Changing page to:", newPage);
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        fetchLogs(newPage, itemsPerPage, filters);
      }
    },
    [fetchLogs, itemsPerPage, filters, pagination.totalPages]
  );

  // Handler untuk ganti items per page
  const handleItemsPerPageChange = useCallback(
    (newLimit) => {
      console.log("🔄 Changing items per page to:", newLimit);
      setItemsPerPage(newLimit);
      fetchLogs(1, newLimit, filters);
    },
    [fetchLogs, filters]
  );

  // Pre-process logs data untuk menghindari perhitungan berulang di render
  const processedLogs = useMemo(() => {
    return logs.map((log) => {
      const level = getLogLevel(log.action_type);
      const LevelIcon = LOG_LEVELS[level].icon;
      const ModuleIcon = getModuleIcon(log.resource_type);
      const levelConfig = LOG_LEVELS[level];

      return {
        ...log,
        level,
        LevelIcon,
        ModuleIcon,
        levelConfig,
        formattedResourceType: formatResourceType(log.resource_type),
        formattedActionType: formatActionType(log.action_type),
        formattedDate: formatDate(log.created_at),
      };
    });
  }, [
    logs,
    getLogLevel,
    getModuleIcon,
    formatResourceType,
    formatActionType,
    formatDate,
  ]);

  // Stats data untuk ditampilkan dengan useMemo
  const statsData = useMemo(
    () => [
      {
        title: "Total Aktivitas",
        value: stats.total_activities?.toString() || "0",
        icon: Clock,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        title: "Dibuat",
        value: stats.total_created?.toString() || "0",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        title: "Diupdate",
        value: stats.total_updated?.toString() || "0",
        icon: Info,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        title: "Dihapus",
        value: stats.total_deleted?.toString() || "0",
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
      },
    ],
    [stats]
  );

  // Pagination component dengan useMemo untuk menghindari re-render tidak perlu
  const PaginationControls = useMemo(() => {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.currentPage;
    const totalItems = pagination.totalItems;

    console.log("📄 Rendering pagination:", { totalPages, currentPage, totalItems, itemsPerPage });

    // ✅ SELALU TAMPILKAN PAGINATION MESKIPUN HANYA 1 HALAMAN
    // Hanya sembunyikan jika benar-benar tidak ada data
    if (totalItems === 0) {
      console.log("ℹ️ Hiding pagination - no items");
      return null;
    }

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;

      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= maxVisiblePages; i++) {
            pages.push(i);
          }
        } else if (currentPage >= totalPages - 2) {
          for (let i = totalPages - 4; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          for (let i = currentPage - 2; i <= currentPage + 2; i++) {
            pages.push(i);
          }
        }
      }
      return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Items per page selector - SELALU TAMPILKAN */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">Tampilkan:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="px-2 sm:px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-xs sm:text-sm"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-xs sm:text-sm text-gray-700">data per halaman</span>
        </div>

        {/* Pagination info - SELALU TAMPILKAN */}
        <div className="text-xs sm:text-sm text-gray-700 text-center">
          Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
          {Math.min(currentPage * itemsPerPage, totalItems)} dari{" "}
          {totalItems} logs
        </div>

        {/* Pagination controls - SELALU TAMPILKAN MESKIPUN 1 HALAMAN */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm transition-colors duration-200"
            title="Halaman Pertama"
          >
            ««
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm transition-colors duration-200"
            title="Halaman Sebelumnya"
          >
            «
          </button>

          {/* Page numbers - TAMPILKAN MESKIPUN HANYA 1 NOMOR */}
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-2 sm:px-3 py-1.5 border rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 ${
                currentPage === pageNum
                  ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm transition-colors duration-200"
            title="Halaman Selanjutnya"
          >
            »
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm transition-colors duration-200"
            title="Halaman Terakhir"
          >
            »»
          </button>
        </div>
      </div>
    );
  }, [pagination, itemsPerPage, handleItemsPerPageChange, handlePageChange]);

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Logs Sistem</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Pantau aktivitas dan error sistem
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#000000] to-[#333333] text-white rounded-lg hover:from-[#333333] hover:to-[#555555] transition-all duration-200 font-medium disabled:opacity-50 text-sm w-full sm:w-auto justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {/* Tombol Reset Data */}
          <button
            onClick={handleResetLogs}
            disabled={resetting || loading}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium disabled:opacity-50 text-sm w-full sm:w-auto justify-center"
          >
            <Trash2 className="w-4 h-4" />
            {resetting ? "Resetting..." : "Reset Data"}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsData.map((stat, index) => {
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
      <div className="bg-white p-4 rounded-lg space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari logs..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
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
              Filter Lanjutan
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
                {/* Action Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Tindakan
                  </label>
                  <select
                    value={filters.action_type}
                    onChange={(e) => handleFilterChange("action_type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  >
                    <option value="">Semua Tindakan</option>
                    <option value="created">Dibuat</option>
                    <option value="updated">Diupdate</option>
                    <option value="deleted">Dihapus</option>
                    <option value="danger">Berbahaya</option>
                    <option value="login">Login</option>
                  </select>
                </div>

                {/* Resource Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Resource
                  </label>
                  <select
                    value={filters.resource_type}
                    onChange={(e) => handleFilterChange("resource_type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  >
                    <option value="">Semua Resource</option>
                    <option value="material">Material</option>
                    <option value="order">Order</option>
                    <option value="user">User</option>
                    <option value="bank">Bank</option>
                    <option value="affiliate">Affiliate</option>
                    <option value="payment">Payment</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rentang Tanggal
                  </label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => handleFilterChange("start_date", e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => handleFilterChange("end_date", e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={applyFilters}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium text-sm"
                  >
                    <Filter className="w-4 h-4" />
                    Terapkan
                  </button>
                  <button
                    onClick={resetFilters}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#000000] to-[#333333] text-white rounded-lg hover:from-[#333333] hover:to-[#555555] transition-all duration-200 font-medium text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center flex-1">
            {/* Action Type Filter */}
            <select
              value={filters.action_type}
              onChange={(e) => handleFilterChange("action_type", e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value="">Semua Tindakan</option>
              <option value="created">Dibuat</option>
              <option value="updated">Diupdate</option>
              <option value="deleted">Dihapus</option>
              <option value="danger">Berbahaya</option>
              <option value="login">Login</option>
            </select>

            {/* Resource Type Filter */}
            <select
              value={filters.resource_type}
              onChange={(e) => handleFilterChange("resource_type", e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value="">Semua Resource</option>
              <option value="material">Material</option>
              <option value="order">Order</option>
              <option value="user">User</option>
              <option value="bank">Bank</option>
              <option value="affiliate">Affiliate</option>
              <option value="payment">Payment</option>
            </select>

            {/* Date Range */}
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange("start_date", e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                />
              </div>
              <span className="flex items-center text-gray-500">s/d</span>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange("end_date", e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium text-sm"
            >
              <Filter className="w-4 h-4" />
              Terapkan Filter
            </button>
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#000000] to-[#333333] text-white rounded-lg hover:from-[#333333] hover:to-[#555555] transition-all duration-200 font-medium text-sm"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Daftar Aktivitas ({pagination.totalItems})
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {loading
                ? "Memuat..."
                : `${processedLogs.length} logs ditampilkan`}
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <Loader className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          )}
        </div>

        <div className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-600 text-sm">Memuat data logs...</span>
            </div>
          ) : processedLogs.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Tidak ada logs yang ditemukan
              </h3>
              <p className="text-gray-500 text-sm px-4">
                Coba ubah filter pencarian atau refresh logs
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <table className="w-full hidden lg:table">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tl-lg">
                        Level
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Deskripsi
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Tipe & Resource
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tr-lg">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {processedLogs.map((log, index) => {
                      const isLastRow = index === processedLogs.length - 1;

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 transition-all duration-150 group"
                        >
                          <td
                            className={`py-4 px-6 ${
                              isLastRow ? "rounded-bl-lg" : ""
                            }`}
                          >
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${log.levelConfig.color}`}
                            >
                              <log.LevelIcon className="w-3 h-3" />
                              {log.levelConfig.label}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-medium text-gray-900 text-sm">
                              {log.description}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2 mb-1">
                              <log.ModuleIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {log.formattedResourceType}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.formattedActionType}
                              {log.resource_id && ` • ID: ${log.resource_id}`}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm text-gray-900">
                              {log.user_name || "System"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.user_email || "N/A"}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm text-gray-900 font-mono">
                              {log.ip_address || "N/A"}
                            </div>
                          </td>
                          <td
                            className={`py-4 px-6 ${
                              isLastRow ? "rounded-br-lg" : ""
                            }`}
                          >
                            <div className="text-sm text-gray-500">
                              {log.formattedDate}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3 p-4">
                  {processedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${log.levelConfig.color} mb-2`}
                          >
                            <log.LevelIcon className="w-3 h-3" />
                            {log.levelConfig.label}
                          </span>
                          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                            {log.description}
                          </h3>
                        </div>
                      </div>

                      {/* Module & Action */}
                      <div className="flex items-center gap-2">
                        <log.ModuleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 truncate">
                            {log.formattedResourceType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.formattedActionType}
                            {log.resource_id && ` • ID: ${log.resource_id}`}
                          </p>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">User</p>
                          <p className="text-sm text-gray-900 truncate">
                            {log.user_name || "System"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {log.user_email || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">IP Address</p>
                          <p className="text-sm text-gray-900 font-mono truncate">
                            {log.ip_address || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Timestamp</p>
                        <p className="text-sm text-gray-900">{log.formattedDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination Section - Selalu tampilkan info, tapi kontrol hanya jika perlu */}
              {!loading && processedLogs.length > 0 && (
                <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
                  {PaginationControls}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logs;