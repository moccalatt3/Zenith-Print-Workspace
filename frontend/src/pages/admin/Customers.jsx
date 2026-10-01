import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Package,
  DollarSign,
  User,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Loader,
  Building,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import adminCustomerService from "../../services/adminCustomerService";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditPasswordModalOpen, setIsEditPasswordModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  // Mobile filter state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  // Fetch customers dengan pagination
  const fetchCustomers = async (page = 1, limit = itemsPerPage) => {
    setLoading(true);
    try {
      const filters = {
        page: page,
        limit: limit,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : "",
        user_type: userTypeFilter !== "all" ? userTypeFilter : "",
        sortBy: sortBy,
      };

      console.log("📨 Sending filters:", filters);

      const response = await adminCustomerService.getAllCustomers(filters);
      if (response.success) {
        setCustomers(response.data.customers);
        setPagination(response.data.pagination);
        console.log(`✅ Loaded ${response.data.customers.length} customers`);
      }
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      alert(error.message || "Gagal mengambil data customers");

      // Fallback ke array kosong jika error
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk ganti page
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchCustomers(newPage, itemsPerPage);
    }
  };

  // Handler untuk ganti items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    fetchCustomers(1, newLimit);
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await adminCustomerService.getCustomerStats();
      if (response.success) {
        const statsData = response.data;

        const formattedStats = [
          {
            title: "Total Customers",
            value: statsData.total_customers?.toString() || "0",
            change: "+8%",
            trend: "up",
            icon: Users,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
            showFromLast: true,
          },
          {
            title: "Active Customers",
            value: statsData.active_customers?.toString() || "0",
            change: "+5",
            trend: "up",
            icon: User,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
            showFromLast: false,
          },
          {
            title: "Individual Customers",
            value: statsData.individual_customers?.toString() || "0",
            change: `${statsData.individual_customers} users`,
            trend: "up",
            icon: User,
            color: "text-green-600",
            bgColor: "bg-green-100",
            showFromLast: false,
          },
          {
            title: "Company Customers",
            value: statsData.company_customers?.toString() || "0",
            change: `${statsData.company_customers} companies`,
            trend: "up",
            icon: Building,
            color: "text-purple-600",
            bgColor: "bg-purple-100",
            showFromLast: false,
          },
        ];

        setStats(formattedStats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Use default stats if API fails
      const activeCustomers = customers.filter(
        (c) => c.status === "active"
      ).length;
      const individualCustomers = customers.filter(
        (c) => c.userType === "individual"
      ).length;
      const companyCustomers = customers.filter(
        (c) => c.userType === "company"
      ).length;

      setStats([
        {
          title: "Total Customers",
          value: customers.length.toString(),
          change: "+8%",
          trend: "up",
          icon: Users,
          color: "text-gray-900",
          bgColor: "bg-gray-100",
          showFromLast: true,
        },
        {
          title: "Active Customers",
          value: activeCustomers.toString(),
          change: "+5",
          trend: "up",
          icon: User,
          color: "text-gray-900",
          bgColor: "bg-gray-100",
          showFromLast: false,
        },
        {
          title: "Individual Customers",
          value: individualCustomers.toString(),
          change: `${individualCustomers} users`,
          trend: "up",
          icon: User,
          color: "text-green-600",
          bgColor: "bg-green-100",
          showFromLast: false,
        },
        {
          title: "Company Customers",
          value: companyCustomers.toString(),
          change: `${companyCustomers} companies`,
          trend: "up",
          icon: Building,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          showFromLast: false,
        },
      ]);
    }
  };

  // Initial load
  useEffect(() => {
    fetchCustomers(1, itemsPerPage);
    fetchStats();
  }, []);

  // Search effect dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCustomers(1, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, userTypeFilter, sortBy]);

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

  // Get user type badge
  const getUserTypeBadge = (userType) => {
    const userTypeConfig = {
      individual: {
        color: "bg-green-100 text-green-800",
        icon: User,
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

  // Handle view detail
  const handleViewDetail = async (customer) => {
    try {
      const response = await adminCustomerService.getCustomerDetail(
        customer.id
      );
      if (response.success) {
        setSelectedCustomer(response.data);
        setIsDetailModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching customer detail:", error);
      alert(error.message || "Gagal mengambil detail customer");
    }
  };

  // Handle delete customer
  const handleDeleteCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete customer
  const confirmDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const response = await adminCustomerService.deleteCustomer(
        selectedCustomer.id
      );
      if (response.success) {
        alert("Customer berhasil dihapus");
        setIsDeleteModalOpen(false);
        setSelectedCustomer(null);
        fetchCustomers(pagination.currentPage, itemsPerPage);
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert(error.message || "Gagal menghapus customer");
    }
  };

  // Update customer status
  const updateCustomerStatus = async (customerId, newStatus) => {
    try {
      const response = await adminCustomerService.updateCustomerStatus(
        customerId,
        {
          status: newStatus,
          reason: `Status diubah oleh admin`,
        }
      );

      if (response.success) {
        alert("Status customer berhasil diperbarui");
        fetchCustomers(pagination.currentPage, itemsPerPage);
      }
    } catch (error) {
      console.error("Error updating customer status:", error);
      alert(error.message || "Gagal memperbarui status customer");
    }
  };

  // Handle edit password
  const handleEditPassword = (customer) => {
    setSelectedCustomer(customer);
    setIsEditPasswordModalOpen(true);
  };

  // Handle update password
  const handleUpdatePassword = async (passwordData) => {
    try {
      const response = await adminCustomerService.updateCustomerPassword(
        selectedCustomer.id,
        passwordData
      );

      if (response.success) {
        alert("Password berhasil diupdate");
        setIsEditPasswordModalOpen(false);
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error("Error updating password:", error);
      alert(error.message || "Gagal mengupdate password");
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Manajemen Pelanggan
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Kelola data pelanggan, riwayat order, dan informasi customer
          </p>
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

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Daftar Pelanggan
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {loading
                ? "Memuat..."
                : `${pagination.totalItems} pelanggan ditemukan`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pelanggan..."
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
                  {/* User Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipe User
                    </label>
                    <select
                      value={userTypeFilter}
                      onChange={(e) => setUserTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                    >
                      <option value="all">Semua Tipe</option>
                      <option value="individual">Individual</option>
                      <option value="company">Company</option>
                    </select>
                  </div>

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

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Urutkan
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                    >
                      <option value="recent">Terbaru</option>
                      <option value="name">Nama A-Z</option>
                      <option value="orders">Paling Banyak Order</option>
                      <option value="spent">Paling Banyak Belanja</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-3">
              {/* User Type Filter */}
              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              >
                <option value="all">Semua Tipe</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>

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

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              >
                <option value="recent">Terbaru</option>
                <option value="name">Nama A-Z</option>
                <option value="orders">Paling Banyak Order</option>
                <option value="spent">Paling Banyak Belanja</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-600 text-sm">
                Memuat data customers...
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="w-full hidden lg:table">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Total Order
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Total Belanja
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((customer, index) => {
                    const statusConfig = getStatusBadge(customer.status);
                    const userTypeConfig = getUserTypeBadge(customer.userType);
                    const StatusIcon = statusConfig.icon;
                    const UserTypeIcon = userTypeConfig.icon;

                    // Check if it's the last row for rounded corners
                    const isLastRow = index === customers.length - 1;

                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-gray-50 transition-all duration-150 group"
                      >
                        {/* Customer Column */}
                        <td className="py-4 px-6">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">
                              {customer.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Bergabung {formatDate(customer.joinDate)}
                            </div>
                          </div>
                        </td>

                        {/* Contact Column */}
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            {customer.email}
                          </div>
                        </td>

                        {/* Type Column */}
                        <td className="py-4 px-6">
                          <div className="space-y-2">
                            {/* User Type Badge */}
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${userTypeConfig.color}`}
                            >
                              {userTypeConfig.text}
                            </span>

                            {/* ✅ Company Name - Hanya tampil jika user_type = company dan ada company_name */}
                            {customer.userType === "company" &&
                              customer.companyName && (
                                <div className="text-xs text-gray-600">
                                  {customer.companyName}
                                </div>
                              )}
                          </div>
                        </td>

                        {/* Total Orders Column */}
                        <td className="py-4 px-6">
                          <div className="text-center">
                            <div className="font-bold text-gray-900 text-lg">
                              {customer.totalOrders}
                            </div>
                            <div className="text-xs text-gray-500">orders</div>
                          </div>
                        </td>

                        {/* Total Spent Column */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="font-bold text-gray-900">
                              {formatCurrency(customer.totalSpent)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Last order: {formatDate(customer.lastOrder)}
                            </div>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.text}
                          </span>
                        </td>

                        {/* Actions Column */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetail(customer)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Detail Customer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleEditPassword(customer)}
                              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                              title="Edit Password"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() =>
                                updateCustomerStatus(
                                  customer.id,
                                  customer.status === "active"
                                    ? "inactive"
                                    : "active"
                                )
                              }
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                              title={
                                customer.status === "active"
                                  ? "Nonaktifkan"
                                  : "Aktifkan"
                              }
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteCustomer(customer)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Hapus Customer"
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
                {customers.map((customer) => {
                  const statusConfig = getStatusBadge(customer.status);
                  const userTypeConfig = getUserTypeBadge(customer.userType);
                  const StatusIcon = statusConfig.icon;
                  const UserTypeIcon = userTypeConfig.icon;

                  return (
                    <div
                      key={customer.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {customer.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {customer.email}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Bergabung {formatDate(customer.joinDate)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.text}
                        </span>
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
                          {customer.userType === "company" &&
                            customer.companyName && (
                              <p className="text-xs text-gray-600 mt-1">
                                {customer.companyName}
                              </p>
                            )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Order</p>
                          <p className="font-bold text-gray-900 text-lg">
                            {customer.totalOrders}
                          </p>
                        </div>
                      </div>

                      {/* Spending & Last Order */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Total Belanja</p>
                          <p className="font-bold text-gray-900">
                            {formatCurrency(customer.totalSpent)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Order Terakhir</p>
                          <p className="text-xs text-gray-900">
                            {formatDate(customer.lastOrder)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          ID: {customer.id}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewDetail(customer)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Detail Customer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditPassword(customer)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                            title="Edit Password"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              updateCustomerStatus(
                                customer.id,
                                customer.status === "active"
                                  ? "inactive"
                                  : "active"
                              )
                            }
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title={
                              customer.status === "active"
                                ? "Nonaktifkan"
                                : "Aktifkan"
                            }
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Hapus Customer"
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
          {!loading && customers.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Tidak ada pelanggan yang ditemukan
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Coba ubah filter pencarian atau periksa kembali
              </p>
            </div>
          )}

          {/* Pagination Section */}
          {!loading && customers.length > 0 && (
            <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-700">
                    Tampilkan:
                  </span>
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
                  dari {pagination.totalItems} pelanggan
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
      {isDetailModalOpen && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedCustomer && (
        <DeleteConfirmationModal
          customer={selectedCustomer}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedCustomer(null);
          }}
          onConfirm={confirmDeleteCustomer}
        />
      )}

      {/* Edit Password Modal */}
      {isEditPasswordModalOpen && selectedCustomer && (
        <EditPasswordModal
          customer={selectedCustomer}
          isOpen={isEditPasswordModalOpen}
          onClose={() => {
            setIsEditPasswordModalOpen(false);
            setSelectedCustomer(null);
          }}
          onConfirm={handleUpdatePassword}
        />
      )}
    </div>
  );
};

// Customer Detail Modal Component
const CustomerDetailModal = ({ customer, isOpen, onClose }) => {
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Detail Customer
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {customer.customer.name} •{" "}
              {customer.customer.userType?.toUpperCase()}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-semibold mb-3 text-gray-800">
                Informasi Customer
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Nama</span>
                  <span className="text-sm font-medium text-gray-900">
                    {customer.customer.name}
                  </span>
                </div>

                {/* ✅ TAMBAH INI: Nama Perusahaan untuk Company User */}
                {customer.customer.userType === "company" &&
                  customer.customer.companyName && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        Nama Perusahaan
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {customer.customer.companyName}
                      </span>
                    </div>
                  )}

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium text-gray-900">
                    {customer.customer.email}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Tipe</span>
                  <span
                    className={`text-sm font-medium px-2 py-1 rounded ${
                      customer.customer.userType === "company"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {customer.customer.userType?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Status</span>
                  <span
                    className={`text-sm font-medium px-2 py-1 rounded ${
                      customer.customer.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {customer.customer.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-3 text-gray-800">
                Statistik Order
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Orders</span>
                  <span className="text-sm font-medium text-gray-900">
                    {customer.customer.totalOrders}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Belanja</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(customer.customer.totalSpent)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Bergabung</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(customer.customer.joinDate)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Order Terakhir</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(customer.customer.lastOrder)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          {customer.recentOrders && customer.recentOrders.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 text-gray-800">
                Order Terbaru ({customer.recentOrders.length})
              </h3>
              <div className="space-y-2">
                {customer.recentOrders.map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {order.order_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.item_count} items
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          order.order_status === "completed"
                            ? "bg-green-100 text-green-700"
                            : order.order_status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {order.order_status?.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          order.payment_status === "paid"
                            ? "bg-green-100 text-green-700"
                            : order.payment_status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {order.payment_status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affiliate Info */}
          {customer.customer.referralCode && (
            <div>
              <h3 className="text-base font-semibold mb-3 text-gray-800">
                Informasi Affiliate
              </h3>
              <div className="bg-blue-50 rounded p-3 border border-blue-200">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Kode Referral</span>
                    <span className="text-sm font-medium text-gray-900">
                      {customer.customer.referralCode}
                    </span>
                  </div>
                  {customer.customer.affiliateId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Affiliate ID
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {customer.customer.affiliateId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ customer, isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Hapus Customer
          </h3>
          <p className="text-gray-600">
            Apakah Anda yakin ingin menghapus customer{" "}
            <strong className="text-gray-900">{customer.name}</strong>? Tindakan
            ini tidak dapat dibatalkan.
          </p>
          {customer.totalOrders > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                Customer ini memiliki {customer.totalOrders} order. Data order
                akan tetap tersimpan di sistem.
              </p>
            </div>
          )}
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
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Password Modal Component
const EditPasswordModal = ({ customer, isOpen, onClose, onConfirm }) => {
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!passwordData.newPassword) {
      newErrors.newPassword = "Password baru harus diisi";
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = "Password minimal 6 karakter";
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password harus diisi";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Password tidak cocok";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await onConfirm({
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword,
      });
      // Reset form
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setErrors({});
    } catch (error) {
      console.error("Error updating password:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Password
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {customer?.name} • {customer?.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Baru
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ${
                errors.newPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Masukkan password baru"
              disabled={loading}
            />
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konfirmasi Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Konfirmasi password baru"
              disabled={loading}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 font-medium"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all duration-200 font-medium"
          >
            {loading ? "Menyimpan..." : "Simpan Password"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Customers;