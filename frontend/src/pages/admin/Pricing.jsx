import { useState, useEffect } from "react";
import {
  DollarSign,
  Package,
  TrendingUp,
  Save,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Percent,
  Receipt,
  Settings,
  Loader,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Users,
  Tag,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import pricingService from "../../services/pricingService";

// Format and Parse Functions untuk Rupiah
const formatRupiah = (number) => {
  if (!number && number !== 0) return "";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

const parseRupiah = (rupiahString) => {
  if (!rupiahString) return 0;
  const cleaned = rupiahString.replace(/[^\d]/g, "");
  return parseInt(cleaned) || 0;
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const Pricing = () => {
  // State untuk pricing configuration
  const [pricingConfig, setPricingConfig] = useState({
    shippingRatePerKg: 500000,
    taxRate: 20,
    packingCost: 10000,
    localShippingRatePerKg: 30000,
    overheadPercentage: 25,
    profitPercentage: 150,
    finalPriceDiscount: 15,
    volumeToCM3: 1000,
    gramToKg: 1000,
  });

  // State untuk pricing rules
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [selectedRule, setSelectedRule] = useState(null);

  // Mobile filter state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Pricing.jsx - Tambahkan state pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [newRule, setNewRule] = useState({
    name: "",
    type: "percentage",
    value: 0,
    description: "",
    imageFile: null,
    imagePreview: null,
    isActive: true,
    minOrderAmount: 0,
    maxDiscountAmount: null,
    startDate: "",
    endDate: "",
    usageLimit: null,
    applicableTo: "all",
  });

  const [editingRule, setEditingRule] = useState(null);

  // Show message function
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // Load data on component mount
  useEffect(() => {
    loadPricingConfig();
    loadPricingRules(1, itemsPerPage);
  }, []);

  // Load pricing configuration
  const loadPricingConfig = async () => {
    try {
      setLoading(true);
      const response = await pricingService.getConfig();
      if (response.success && response.data) {
        setPricingConfig(response.data);
      }
    } catch (error) {
      console.error("Error loading pricing config:", error);
      showMessage("error", "Gagal memuat konfigurasi harga");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive
      ? {
          color: "bg-green-100 text-green-800",
          text: "Aktif",
          icon: CheckCircle,
        }
      : {
          color: "bg-red-100 text-red-800",
          text: "Nonaktif",
          icon: XCircle,
        };
  };

  // Search effect dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPricingRules(1, itemsPerPage); // ✅ Reset ke page 1 saat search/filter
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  // Handler untuk ganti page
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadPricingRules(newPage, itemsPerPage);
    }
  };

  // Handler untuk ganti items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    loadPricingRules(1, newLimit);
  };

  // Load pricing rules dengan pagination
  const loadPricingRules = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);
      const response = await pricingService.getPricingRules({
        search: searchTerm,
        status: statusFilter,
        page: page,
        limit: limit,
      });

      if (response.success) {
        setPricingRules(response.data);
        setPagination(response.pagination); // ✅ SET PAGINATION DATA
      }
    } catch (error) {
      console.error("Error loading pricing rules:", error);
      showMessage("error", "Gagal memuat data diskon");
    } finally {
      setLoading(false);
    }
  };

  // Filter pricing rules
  const filteredRules = pricingRules.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.description &&
        rule.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && rule.is_active) ||
      (statusFilter === "inactive" && !rule.is_active);

    return matchesSearch && matchesStatus;
  });

  // Handler untuk update configuration
  const handleConfigChange = (key, value) => {
    setPricingConfig((prev) => ({
      ...prev,
      [key]: parseFloat(value) || 0,
    }));
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const response = await pricingService.updateConfig(pricingConfig);

      if (response.success) {
        showMessage("success", "Konfigurasi harga berhasil disimpan!");
        setShowConfigModal(false);
        await loadPricingConfig();
      }
    } catch (error) {
      console.error("Error saving config:", error);
      showMessage("error", "Gagal menyimpan konfigurasi harga");
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Rule
  const handleAddRule = async () => {
    try {
      if (!newRule.name || newRule.value === 0) {
        showMessage("error", "Nama dan nilai diskon harus diisi");
        return;
      }

      setLoading(true);

      // Create FormData untuk handle file upload
      const formData = new FormData();

      // Append semua data sebagai string
      formData.append("name", newRule.name);
      formData.append("type", newRule.type);
      formData.append("value", newRule.value.toString());
      formData.append("description", newRule.description);
      formData.append("isActive", newRule.isActive.toString());
      formData.append(
        "minOrderAmount",
        (newRule.minOrderAmount || 0).toString()
      );
      formData.append(
        "maxDiscountAmount",
        newRule.maxDiscountAmount?.toString() || ""
      );
      formData.append("startDate", newRule.startDate || "");
      formData.append("endDate", newRule.endDate || "");
      formData.append("usageLimit", newRule.usageLimit?.toString() || "");
      formData.append("applicableTo", newRule.applicableTo);

      // Append file jika ada
      if (newRule.imageFile) {
        console.log("📁 Appending image file:", newRule.imageFile);
        formData.append("image", newRule.imageFile); // Field name harus 'image'
      } else {
        console.log("📁 No image file to append");
      }

      // Debug: cek isi FormData
      for (let [key, value] of formData.entries()) {
        console.log(`📦 FormData: ${key} =`, value);
      }

      const response = await pricingService.createPricingRule(formData);

      if (response.success) {
        showMessage("success", "Diskon berhasil ditambahkan!");
        setShowAddRuleModal(false);
        setNewRule({
          name: "",
          type: "percentage",
          value: 0,
          description: "",
          imageFile: null,
          imagePreview: null,
          isActive: true,
          minOrderAmount: 0,
          maxDiscountAmount: null,
          startDate: "",
          endDate: "",
          usageLimit: null,
          applicableTo: "all",
        });
        await loadPricingRules();
      }
    } catch (error) {
      console.error("Error adding rule:", error);
      showMessage("error", "Gagal menambahkan diskon");
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;

    // Gunakan BACKEND_URL dari environment variable
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    return `${backendUrl}${imagePath}`;
  };

  // Handle Edit Rule
  const handleEditRule = async () => {
    try {
      if (!editingRule.name || editingRule.value === 0) {
        showMessage("error", "Nama dan nilai diskon harus diisi");
        return;
      }

      setLoading(true);
      console.log("Sending update data:", editingRule);

      // Create FormData untuk handle file upload
      const formData = new FormData();
      formData.append("name", editingRule.name);
      formData.append("type", editingRule.type);
      formData.append("value", editingRule.value.toString());
      formData.append("description", editingRule.description || "");
      formData.append("is_active", editingRule.is_active.toString());
      formData.append(
        "minOrderAmount",
        (editingRule.minOrderAmount || 0).toString()
      );
      formData.append(
        "maxDiscountAmount",
        editingRule.maxDiscountAmount?.toString() || ""
      );
      formData.append("startDate", editingRule.startDate || "");
      formData.append("endDate", editingRule.endDate || "");
      formData.append("usageLimit", editingRule.usageLimit?.toString() || "");

      // PERBAIKI INI: Pastikan applicable_to valid
      const applicableTo = editingRule.applicable_to || "all";
      formData.append("applicableTo", applicableTo);

      // Append file jika ada
      if (editingRule.imageFile) {
        console.log("📁 Appending image file for edit:", editingRule.imageFile);
        formData.append("image", editingRule.imageFile);
      } else {
        console.log("📁 No new image file for edit");
      }

      // Debug: cek isi FormData
      for (let [key, value] of formData.entries()) {
        console.log(`📦 FormData Edit: ${key} =`, value);
      }

      const response = await pricingService.updatePricingRule(
        editingRule.id,
        formData
      );

      if (response.success) {
        showMessage("success", "Diskon berhasil diperbarui!");
        setShowEditRuleModal(false);
        setEditingRule(null);
        await loadPricingRules();
      } else {
        showMessage("error", response.error || "Gagal memperbarui diskon");
      }
    } catch (error) {
      console.error("Error updating rule:", error);
      showMessage("error", "Gagal memperbarui diskon");
    } finally {
      setLoading(false);
    }
  };

  // Handle Image Upload
  const handleImageUpload = (e, isEdit = false) => {
    const file = e.target.files[0];
    console.log("📁 File selected for", isEdit ? "edit" : "add", ":", file);

    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showMessage("error", "File harus berupa gambar");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showMessage("error", "Ukuran gambar maksimal 5MB");
        return;
      }

      console.log("✅ File validated:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        console.log("📸 File preview loaded for", isEdit ? "edit" : "add");
        if (isEdit) {
          setEditingRule({
            ...editingRule,
            imageFile: file,
            imagePreview: e.target.result,
          });
        } else {
          setNewRule({
            ...newRule,
            imageFile: file,
            imagePreview: e.target.result,
          });
        }
      };
      reader.onerror = (error) => {
        console.error("❌ FileReader error:", error);
      };
      reader.readAsDataURL(file);
    } else {
      console.log("❌ No file selected");
    }
  };

  // Handle Remove Image
  const handleRemoveImage = (isEdit = false) => {
    console.log("🗑️ Removing image for", isEdit ? "edit" : "add");
    if (isEdit) {
      setEditingRule({
        ...editingRule,
        imageFile: null,
        imagePreview: null,
        // Jangan reset image_url karena itu gambar existing
      });
    } else {
      setNewRule({
        ...newRule,
        imageFile: null,
        imagePreview: null,
      });
    }
  };

  // Fungsi untuk handle ketika membuka modal edit
  const handleEdit = (rule) => {
    console.log("📝 Opening edit modal for rule:", {
      id: rule.id,
      name: rule.name,
      image_url: rule.image_url,
      fullImageUrl: rule.image_url ? getImageUrl(rule.image_url) : null,
    });

    setEditingRule({
      ...rule,
      imagePreview: null, // Reset preview baru
      imageFile: null, // Reset file baru
      // image_url tetap ada untuk gambar existing
    });
    setShowEditRuleModal(true);
  };

  // Fungsi untuk melihat detail diskon
  const handleViewDetail = (rule) => {
    setSelectedRule(rule);
    setShowDetailModal(true);
  };

  const handleDeleteRule = async (ruleId) => {
    // Buka modal konfirmasi
    const rule = pricingRules.find((r) => r.id === ruleId);
    setRuleToDelete(rule);
    setShowDeleteModal(true);
  };

  // Fungsi untuk konfirmasi hapus
  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;

    try {
      setLoading(true);
      const response = await pricingService.deletePricingRule(ruleToDelete.id);

      if (response.success) {
        showMessage("success", "Diskon berhasil dihapus!");
        setShowDeleteModal(false);
        setRuleToDelete(null);
        await loadPricingRules();
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      showMessage("error", "Gagal menghapus diskon");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (rule) => {
    console.log("Opening edit modal for rule:", rule);
    setEditingRule({
      ...rule,
      is_active: rule.is_active,
    });
    setShowEditRuleModal(true);
  };

  // Format date untuk display
  const formatDate = (dateString) => {
    if (!dateString) return "Tidak terbatas";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Stats data
  const stats = [
    {
      title: "Total Diskon",
      value: pricingRules.length.toString(),
      icon: Percent,
      color: "text-gray-900",
      bgColor: "bg-gray-100",
    },
    {
      title: "Diskon Aktif",
      value: pricingRules.filter((r) => r.is_active).length.toString(),
      icon: TrendingUp,
      color: "text-gray-900",
      bgColor: "bg-gray-100",
    },
    {
      title: "Tax Rate",
      value: `${pricingConfig.taxRate}%`,
      icon: Receipt,
      color: "text-gray-900",
      bgColor: "bg-gray-100",
    },
    {
      title: "Profit Margin",
      value: `${pricingConfig.profitPercentage}%`,
      icon: DollarSign,
      color: "text-gray-900",
      bgColor: "bg-gray-100",
    },
  ];

  const configCategories = [
    {
      title: "Biaya Material & Produksi",
      icon: Package,
      items: [
        {
          key: "shippingRatePerKg",
          label: "Shipping Rate (/Kg)",
          type: "currency",
          value: pricingConfig.shippingRatePerKg,
        },
        {
          key: "taxRate",
          label: "Tax Rate",
          type: "percentage",
          value: pricingConfig.taxRate,
        },
        {
          key: "packingCost",
          label: "Packing Cost",
          type: "currency",
          value: pricingConfig.packingCost,
        },
        {
          key: "localShippingRatePerKg",
          label: "Ongkir Local (/Kg)",
          type: "currency",
          value: pricingConfig.localShippingRatePerKg,
        },
      ],
    },
    {
      title: "Markup & Profit",
      icon: TrendingUp,
      items: [
        {
          key: "overheadPercentage",
          label: "Overhead",
          type: "percentage",
          value: pricingConfig.overheadPercentage,
        },
        {
          key: "profitPercentage",
          label: "Profit Margin",
          type: "percentage",
          value: pricingConfig.profitPercentage,
        },
        // {
        //   key: "finalPriceDiscount",
        //   label: "Final Price Discount",
        //   type: "percentage",
        //   value: pricingConfig.finalPriceDiscount,
        // },
      ],
    },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Message Alert */}
      {message.text && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: "", text: "" })}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Pengaturan Harga
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Kelola semua parameter perhitungan harga dan biaya
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#000000] to-[#333333] text-white rounded-lg hover:from-[#333333] hover:to-[#555555] transition-all duration-200 font-medium text-sm sm:text-base order-2 sm:order-1"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Konfigurasi Harga</span>
            <span className="sm:hidden">Konfigurasi</span>
          </button>
          <button
            onClick={() => setShowAddRuleModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium text-sm sm:text-base order-1 sm:order-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Diskon</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center p-4">
          <Loader className="w-6 h-6 animate-spin text-orange-500" />
          <span className="ml-2 text-gray-600">Memuat data...</span>
        </div>
      )}

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

      {/* Pricing Rules Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Daftar Diskon
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {loading
                ? "Memuat..."
                : `${pagination.totalItems} diskon ditemukan`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari diskon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    loadPricingRules();
                  }
                }}
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
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                    >
                      <option value="all">Semua Status</option>
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
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
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-600 text-sm">
                Memuat data diskon...
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="w-full hidden lg:table">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tl-lg">
                      Nama Diskon
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Nilai
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Deskripsi
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
                  {filteredRules.map((rule, index) => {
                    const isLastRow = index === filteredRules.length - 1;

                    return (
                      <tr
                        key={rule.id}
                        className="hover:bg-gray-50 transition-all duration-150 group"
                      >
                        <td
                          className={`py-4 px-6 ${
                            isLastRow ? "rounded-bl-lg" : ""
                          }`}
                        >
                          <div className="flex items-center">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {rule.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Berlaku:{" "}
                                {rule.applicable_to === "all"
                                  ? "Semua Produk"
                                  : "Spesifik"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {rule.type === "percentage"
                              ? "Percentage"
                              : "Fixed Amount"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-gray-900">
                            {rule.type === "percentage"
                              ? `${rule.value}%`
                              : formatCurrency(rule.value)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 max-w-xs">
                            {rule.description || "-"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {(() => {
                            const statusBadge = getStatusBadge(rule.is_active);
                            const IconComponent = statusBadge.icon;
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                              >
                                <IconComponent className="w-3 h-3" />{" "}
                                {statusBadge.text}
                              </span>
                            );
                          })()}
                        </td>
                        <td
                          className={`py-4 px-6 ${
                            isLastRow ? "rounded-br-lg" : ""
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {/* Tombol Detail */}
                            <button
                              onClick={() => handleViewDetail(rule)}
                              disabled={loading}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* Tombol Edit */}
                            <button
                              onClick={() => openEditModal(rule)}
                              disabled={loading}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                              title="Edit Diskon"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {/* Tombol Hapus */}
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              disabled={loading}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                              title="Hapus Diskon"
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
                {filteredRules.map((rule) => {
                  const statusBadge = getStatusBadge(rule.is_active);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <div
                      key={rule.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {rule.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Berlaku:{" "}
                            {rule.applicable_to === "all"
                              ? "Semua Produk"
                              : "Spesifik"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusBadge.text}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Tipe</p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                            {rule.type === "percentage"
                              ? "Percentage"
                              : "Fixed Amount"}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Nilai</p>
                          <p className="font-bold text-gray-900 text-lg">
                            {rule.type === "percentage"
                              ? `${rule.value}%`
                              : formatCurrency(rule.value)}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {rule.description && (
                        <div>
                          <p className="text-xs text-gray-500">Deskripsi</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {rule.description}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          ID: {rule.id}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewDetail(rule)}
                            disabled={loading}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(rule)}
                            disabled={loading}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                            title="Edit Diskon"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            disabled={loading}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                            title="Hapus Diskon"
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
          {filteredRules.length === 0 && !loading && (
            <div className="text-center py-8 sm:py-12">
              <Percent className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Tidak ada diskon yang ditemukan
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Coba ubah filter pencarian atau tambahkan diskon baru
              </p>
              <button
                onClick={() => setShowAddRuleModal(true)}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium text-sm"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Tambah Diskon
              </button>
            </div>
          )}

          {/* Pagination Section */}
          {!loading && filteredRules.length > 0 && (
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
                  dari {pagination.totalItems} diskon
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

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Sesuai dengan modal order */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Konfigurasi Parameter Harga
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Kelola semua parameter perhitungan harga dan biaya
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {configCategories.map((category, categoryIndex) => {
                  const IconComponent = category.icon;
                  return (
                    <div key={categoryIndex} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {category.title}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {category.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {item.label}
                            </label>
                            <div className="relative">
                              {item.type === "currency" ? (
                                // Input untuk currency (Rupiah)
                                <>
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                    Rp
                                  </span>
                                  <input
                                    type="text"
                                    value={formatRupiah(item.value)}
                                    onChange={(e) => {
                                      const numericValue = parseRupiah(
                                        e.target.value
                                      );
                                      handleConfigChange(
                                        item.key,
                                        numericValue
                                      );
                                    }}
                                    onBlur={(e) => {
                                      const formatted = formatRupiah(
                                        item.value
                                      );
                                      if (formatted !== e.target.value) {
                                        handleConfigChange(
                                          item.key,
                                          item.value
                                        );
                                      }
                                    }}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                                    placeholder="0"
                                    disabled={loading}
                                  />
                                </>
                              ) : (
                                // Input untuk percentage
                                <>
                                  <input
                                    type="number"
                                    value={Math.round(item.value)}
                                    onChange={(e) => {
                                      const numericValue =
                                        parseInt(e.target.value) || 0;
                                      handleConfigChange(
                                        item.key,
                                        numericValue
                                      );
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm pr-12"
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                    disabled={loading}
                                  />
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 text-sm">
                                      %
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer - Sesuai dengan modal order */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                {configCategories.reduce(
                  (total, category) => total + category.items.length,
                  0
                )}{" "}
                parameter
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Konfigurasi"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Tambah Diskon Baru
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Buat aturan diskon untuk pelanggan
                </p>
              </div>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Diskon
                </label>
                <div className="space-y-3">
                  {newRule.imagePreview ? (
                    <div className="relative">
                      <img
                        src={newRule.imagePreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(false)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, false)}
                        className="hidden"
                        id="add-rule-image"
                        disabled={loading}
                      />
                      <label
                        htmlFor="add-rule-image"
                        className="cursor-pointer block"
                      >
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <span className="text-sm text-gray-600">
                            Klik untuk upload gambar
                          </span>
                          <span className="text-xs text-gray-500">
                            PNG, JPG, JPEG (max. 5MB)
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Diskon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) =>
                    setNewRule({ ...newRule, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  placeholder="Contoh: Diskon Member"
                  disabled={loading}
                />
              </div>

              {/* Tipe Diskon - Hanya Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Diskon
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600">
                  Percentage (%)
                </div>
                <input
                  type="hidden"
                  value="percentage"
                  onChange={(e) =>
                    setNewRule({ ...newRule, type: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Saat ini hanya tersedia tipe percentage
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nilai Diskon <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newRule.value === 0 ? "" : newRule.value.toString()}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setNewRule({
                          ...newRule,
                          value: 0,
                        });
                        return;
                      }
                      const numericValue = e.target.value.replace(/[^\d]/g, "");
                      const parsedValue = parseInt(numericValue) || 0;
                      if (parsedValue <= 100) {
                        setNewRule({
                          ...newRule,
                          value: parsedValue,
                        });
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "") {
                        setNewRule({
                          ...newRule,
                          value: 0,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm pr-12"
                    placeholder="10"
                    disabled={loading}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Maksimal 100%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={newRule.description}
                  onChange={(e) =>
                    setNewRule({ ...newRule, description: e.target.value })
                  }
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm resize-none"
                  placeholder="Deskripsi diskon..."
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {newRule.description.length}/200 karakter
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={newRule.isActive}
                  onChange={(e) =>
                    setNewRule({ ...newRule, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                  disabled={loading}
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Aktifkan Diskon
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Diskon akan langsung tersedia untuk digunakan
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                Field dengan tanda <span className="text-red-500">*</span> wajib
                diisi
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={loading || !newRule.name || newRule.value === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Diskon"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Rule Modal */}
      {showEditRuleModal && editingRule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Diskon
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Perbarui aturan diskon
                </p>
              </div>
              <button
                onClick={() => setShowEditRuleModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Image Upload Section - Tanpa tombol hapus */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Diskon
                </label>
                <div className="space-y-3">
                  {editingRule.imagePreview ? (
                    // Preview gambar baru yang diupload
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <img
                          src={editingRule.imagePreview}
                          alt="Preview gambar baru"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-2">
                          Gambar baru
                        </p>
                        <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium cursor-pointer">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          Ganti Gambar
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, true)}
                            className="hidden"
                            disabled={loading}
                          />
                        </label>
                      </div>
                    </div>
                  ) : editingRule.image_url ? (
                    // Gambar existing dari database
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <img
                          src={getImageUrl(editingRule.image_url)}
                          alt="Gambar saat ini"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            console.error(
                              "❌ Error loading image:",
                              editingRule.image_url
                            );
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-2">
                          Gambar saat ini
                        </p>
                        <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium cursor-pointer">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          Ganti Gambar
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, true)}
                            className="hidden"
                            disabled={loading}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    // Tidak ada gambar - upload area
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        className="hidden"
                        id="edit-rule-image"
                        disabled={loading}
                      />
                      <label
                        htmlFor="edit-rule-image"
                        className="cursor-pointer block"
                      >
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <span className="text-sm text-gray-600">
                            Klik untuk upload gambar
                          </span>
                          <span className="text-xs text-gray-500">
                            PNG, JPG, JPEG (max. 5MB)
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Info tambahan */}
                {editingRule.image_url &&
                  !editingRule.imageFile &&
                  !editingRule.imagePreview && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700 text-center">
                        Gambar saat ini akan tetap digunakan jika tidak diganti
                      </p>
                    </div>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Diskon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
                  placeholder="Contoh: Diskon Member"
                  disabled={loading}
                />
              </div>

              {/* Tipe Diskon - Hanya Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Diskon
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600">
                  Percentage (%)
                </div>
                <input
                  type="hidden"
                  value="percentage"
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, type: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Saat ini hanya tersedia tipe percentage
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nilai Diskon <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={
                      editingRule.value === 0
                        ? ""
                        : Math.round(editingRule.value)
                    }
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setEditingRule({
                          ...editingRule,
                          value: 0,
                        });
                        return;
                      }
                      const numericValue = e.target.value.replace(/[^\d]/g, "");
                      const parsedValue = parseInt(numericValue) || 0;
                      if (parsedValue <= 100) {
                        setEditingRule({
                          ...editingRule,
                          value: parsedValue,
                        });
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "") {
                        setEditingRule({
                          ...editingRule,
                          value: 0,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm pr-12"
                    placeholder="15"
                    disabled={loading}
                    min="0"
                    max="100"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Maksimal 100%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={editingRule.description || ""}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm resize-none"
                  placeholder="Deskripsi diskon..."
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingRule.description?.length || 0}/200 karakter
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={editingRule.is_active}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      is_active: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                  disabled={loading}
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Aktifkan Diskon
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Diskon akan langsung tersedia untuk digunakan
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                Field dengan tanda <span className="text-red-500">*</span> wajib
                diisi
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditRuleModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  onClick={handleEditRule}
                  disabled={
                    loading || !editingRule.name || editingRule.value === 0
                  }
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
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

      {/* Detail Diskon Modal */}
      {showDetailModal && selectedRule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Konsisten dengan modal lain */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Detail Diskon
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Informasi lengkap tentang diskon
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Gambar Diskon - Lebih Minimalis */}
              {selectedRule.image_url && (
                <div className="flex justify-center">
                  <div className="w-24 h-24 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <img
                      src={getImageUrl(selectedRule.image_url)}
                      alt={selectedRule.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Tag className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Informasi Utama */}
              <div className="space-y-4">
                {/* Header Info */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedRule.name}
                  </h3>
                  <div className="flex justify-center gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        selectedRule.type === "percentage"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {selectedRule.type === "percentage"
                        ? "Percentage"
                        : "Fixed Amount"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        selectedRule.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedRule.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Nonaktif
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Nilai Diskon - Diubah ke abu-abu yang clean */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Nilai Diskon</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {selectedRule.type === "percentage"
                        ? `${selectedRule.value}%`
                        : formatCurrency(selectedRule.value)}
                    </p>
                  </div>
                </div>

                {/* Deskripsi - Jika Ada */}
                {selectedRule.description && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Deskripsi
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      {selectedRule.description}
                    </p>
                  </div>
                )}

                {/* Informasi Detail */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Informasi Detail
                  </h4>

                  {/* Minimum Order */}
                  {selectedRule.min_order_amount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Minimum Order
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedRule.min_order_amount)}
                      </span>
                    </div>
                  )}

                  {/* Maximum Discount */}
                  {selectedRule.max_discount_amount && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Maksimal Diskon
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedRule.max_discount_amount)}
                      </span>
                    </div>
                  )}

                  {/* Usage Limit */}
                  {selectedRule.usage_limit && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Batas Penggunaan
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedRule.used_count || 0} /{" "}
                        {selectedRule.usage_limit}
                      </span>
                    </div>
                  )}

                  {/* Periode Berlaku */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Periode Berlaku
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-900">
                        {formatDate(selectedRule.start_date)}
                      </div>
                      <div className="text-xs text-gray-500">sampai</div>
                      <div className="text-xs font-medium text-gray-900">
                        {formatDate(selectedRule.end_date)}
                      </div>
                    </div>
                  </div>

                  {/* Berlaku Untuk */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Berlaku Untuk
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedRule.applicable_to === "all"
                        ? "Semua Produk"
                        : selectedRule.applicable_to}
                    </span>
                  </div>

                  {/* Tanggal Dibuat & Diupdate */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Dibuat
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(selectedRule.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Diupdate
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(selectedRule.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && ruleToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-red-600">
                  Hapus Diskon
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Konfirmasi penghapusan diskon
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setRuleToDelete(null);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Konfirmasi Penghapusan
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Apakah Anda yakin ingin menghapus diskon ini?
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded border border-red-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <Percent className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 text-sm">
                      {ruleToDelete.name}
                    </h4>
                    <p className="text-red-600 text-xs">
                      {ruleToDelete.type === "percentage"
                        ? `${ruleToDelete.value}%`
                        : formatCurrency(ruleToDelete.value)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Tindakan ini tidak dapat dibatalkan. Semua data diskon akan
                dihapus secara permanen.
              </p>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setRuleToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                disabled={loading}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {loading ? "Menghapus..." : "Hapus Diskon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
