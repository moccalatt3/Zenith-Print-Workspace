import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Package,
  Tag,
  Percent,
  X,
  Eye,
  Search,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
import materialService from "../../services/materialService";

const MaterialsAdmin = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    description: "",
    density: "",
    density_display: "",
    price_per_gram: "",
    price_per_gram_formatted: "",
    image_file: null,
    image_preview: null,
    status: "active",
  });

  // Format number to Rupiah string
  const formatRupiah = (number) => {
    if (!number && number !== 0) return "";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  // Parse Rupiah string to number
  const parseRupiah = (rupiahString) => {
    if (!rupiahString) return 0;
    const cleaned = rupiahString.replace(/[^\d]/g, "");
    return parseInt(cleaned) || 0;
  };

  // Format for display with currency symbol
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Density format functions
  const parseDensityInput = (input) => {
    if (!input) return "";

    let cleaned = input.replace(/[^\d,.]/g, "");

    if (cleaned.includes(",") && !cleaned.includes(".")) {
      cleaned = cleaned.replace(",", ".");
    }

    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    return cleaned;
  };

  const formatDensityDisplay = (value) => {
    if (!value && value !== 0) return "";
    return value.toString().replace(".", ",");
  };

  const validateDensity = (value) => {
    if (!value) return false;
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  };

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch materials data dengan pagination
  const fetchMaterials = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);
      setError("");

      const response = await materialService.getAllMaterialsWithPagination({
        page: page,
        limit: limit,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : "",
      });

      if (response.success) {
        setMaterials(response.data);
        setPagination(response.pagination);
      } else {
        setError("Gagal memuat data materials");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk ganti page
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchMaterials(newPage, itemsPerPage);
    }
  };

  // Handler untuk ganti items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    fetchMaterials(1, newLimit);
  };

  // Fetch material stats
  const [stats, setStats] = useState([]);
  const fetchStats = async () => {
    try {
      const response = await materialService.getMaterialStats();
      if (response.success) {
        const statsData = response.data;
        setStats([
          {
            title: "Total Material",
            value: statsData.total_materials?.toString() || "0",
            icon: Package,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
          },
          {
            title: "Material Aktif",
            value: `${statsData.active_materials || 0} / ${
              statsData.total_materials || 0
            }`,
            icon: Tag,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
          },
          {
            title: "Material Tersedia",
            value: `${statsData.active_materials || 0}`,
            icon: Percent,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMaterials(1, itemsPerPage);
    fetchStats();
  }, []);

  // Search effect dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMaterials(1, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  // Handler untuk upload gambar
  const handleImageUpload = (event, isEdit = false) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Hanya file gambar (JPG, PNG, GIF, WebP) yang diizinkan");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Ukuran file maksimal 5MB");
        return;
      }

      if (isEdit) {
        setSelectedMaterial({
          ...selectedMaterial,
          image_file: file,
          image_preview: URL.createObjectURL(file),
        });
      } else {
        setNewMaterial({
          ...newMaterial,
          image_file: file,
          image_preview: URL.createObjectURL(file),
        });
      }

      setError("");
    }
  };

  const handleAddMaterial = async () => {
    if (
      !newMaterial.name ||
      !newMaterial.density ||
      !newMaterial.price_per_gram
    ) {
      setError("Nama, density, dan harga per gram harus diisi");
      return;
    }

    if (!validateDensity(newMaterial.density)) {
      setError("Format density tidak valid. Contoh: 4,5 atau 1.75");
      return;
    }

    try {
      setOperationLoading(true);
      setError("");

      const materialData = new FormData();
      materialData.append("name", newMaterial.name);
      materialData.append("description", newMaterial.description);
      materialData.append("density", parseFloat(newMaterial.density));
      materialData.append(
        "price_per_gram",
        parseFloat(newMaterial.price_per_gram)
      );
      materialData.append("status", newMaterial.status);

      if (newMaterial.image_file) {
        materialData.append("material_image", newMaterial.image_file);
      }

      const response = await materialService.createMaterial(materialData);

      if (response.success) {
        setSuccess("Material berhasil ditambahkan");
        setShowAddModal(false);
        setNewMaterial({
          name: "",
          description: "",
          density: "",
          density_display: "",
          price_per_gram: "",
          price_per_gram_formatted: "",
          image_file: null,
          image_preview: null,
          status: "active",
        });
        fetchMaterials(pagination.currentPage, itemsPerPage);
        fetchStats();
      }
    } catch (err) {
      setError(err.message || "Gagal menambahkan material");
    } finally {
      setOperationLoading(false);
    }
  };

  // Handler untuk edit material
  const handleEditMaterial = (material) => {
    setSelectedMaterial({
      ...material,
      status: material.isActive ? "active" : "inactive",
      original_image_url: material.image_url,
      image_preview: null,
      image_file: null,
      price_per_gram_formatted: formatRupiah(material.price_per_gram),
      density_display: formatDensityDisplay(material.density),
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (
      !selectedMaterial.name ||
      !selectedMaterial.density ||
      !selectedMaterial.price_per_gram
    ) {
      setError("Nama, density, dan harga per gram harus diisi");
      return;
    }

    if (!validateDensity(selectedMaterial.density)) {
      setError("Format density tidak valid. Contoh: 4,5 atau 1.75");
      return;
    }

    try {
      setOperationLoading(true);
      setError("");

      const materialData = new FormData();
      materialData.append("name", selectedMaterial.name);
      materialData.append("description", selectedMaterial.description);
      materialData.append("density", parseFloat(selectedMaterial.density));
      materialData.append(
        "price_per_gram",
        parseFloat(selectedMaterial.price_per_gram)
      );
      materialData.append("status", selectedMaterial.status);

      if (selectedMaterial.image_file) {
        materialData.append("material_image", selectedMaterial.image_file);
      }

      const response = await materialService.updateMaterial(
        selectedMaterial.id,
        materialData
      );

      if (response.success) {
        setSuccess("Material berhasil diperbarui");
        setShowEditModal(false);
        setSelectedMaterial(null);
        fetchMaterials(pagination.currentPage, itemsPerPage);
        fetchStats();
      }
    } catch (err) {
      setError(err.message || "Gagal memperbarui material");
    } finally {
      setOperationLoading(false);
    }
  };

  // Handler for price per gram input (Add Material)
  const handlePricePerGramChange = (value, isEdit = false) => {
    const numericValue = parseRupiah(value);

    if (isEdit) {
      setSelectedMaterial({
        ...selectedMaterial,
        price_per_gram: numericValue,
        price_per_gram_formatted: value,
      });
    } else {
      setNewMaterial({
        ...newMaterial,
        price_per_gram: numericValue,
        price_per_gram_formatted: value,
      });
    }
  };

  // Handler for density input
  const handleDensityChange = (value, isEdit = false) => {
    const parsedValue = parseDensityInput(value);

    if (isEdit) {
      setSelectedMaterial({
        ...selectedMaterial,
        density: parsedValue,
        density_display: value,
      });
    } else {
      setNewMaterial({
        ...newMaterial,
        density: parsedValue,
        density_display: value,
      });
    }
  };

  const handleDeleteMaterial = (material) => {
    setSelectedMaterial(material);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setOperationLoading(true);
      const response = await materialService.deleteMaterial(
        selectedMaterial.id
      );

      if (response.success) {
        setSuccess("Material berhasil dihapus");
        setShowDeleteModal(false);
        setSelectedMaterial(null);
        fetchMaterials(pagination.currentPage, itemsPerPage);
        fetchStats();
      }
    } catch (err) {
      setError(err.message || "Gagal menghapus material");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleViewDetail = (material) => {
    setSelectedMaterial(material);
    setShowDetailModal(true);
  };

  // Get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    return `${
      process.env.REACT_APP_API_URL || "http://localhost:5000"
    }${imagePath}`;
  };

  // Close all modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowDetailModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedMaterial(null);
    setError("");
  };

  // Get status badge configuration
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
            Manajemen Material
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Kelola material printing
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Tambah Material
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                  <IconComponent
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Daftar Material
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {pagination.totalItems} material ditemukan
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>

        <div className="p-0">
          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <Loader className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 animate-spin" />
              <span className="ml-2 text-gray-600 text-sm">
                Memuat data materials...
              </span>
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="w-full hidden lg:table">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tl-lg">
                      Material
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Density
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Harga/Gram
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
                  {materials.map((material, index) => {
                    const statusConfig = getStatusBadge(material.isActive);
                    const StatusIcon = statusConfig.icon;
                    const isLastRow = index === materials.length - 1;

                    return (
                      <tr
                        key={material.id}
                        className="hover:bg-gray-50 transition-all duration-150 group"
                      >
                        <td
                          className={`py-4 px-6 ${
                            isLastRow ? "rounded-bl-lg" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                              {material.image_url ? (
                                <img
                                  src={getImageUrl(material.image_url)}
                                  alt={material.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 text-sm">
                                {material.name}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                {material.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-gray-900 text-sm">
                            {material.density
                              ? `${formatDensityDisplay(
                                  material.density
                                )} gr/cm³`
                              : "-"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-gray-900 text-sm">
                            {material.price_per_gram
                              ? formatCurrency(material.price_per_gram)
                              : "-"}
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
                          className={`py-4 px-6 ${
                            isLastRow ? "rounded-br-lg" : ""
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetail(material)}
                              disabled={operationLoading}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                              title="Detail Material"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditMaterial(material)}
                              disabled={operationLoading}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                              title="Edit Material"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(material)}
                              disabled={operationLoading}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                              title="Hapus Material"
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
                {materials.map((material) => {
                  const statusConfig = getStatusBadge(material.isActive);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={material.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                            {material.image_url ? (
                              <img
                                src={getImageUrl(material.image_url)}
                                alt={material.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {material.name}
                            </h3>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {material.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Density</p>
                          <p className="font-medium text-gray-900">
                            {material.density
                              ? `${formatDensityDisplay(
                                  material.density
                                )} gr/cm³`
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Harga/Gram</p>
                          <p className="font-bold text-gray-900">
                            {material.price_per_gram
                              ? formatCurrency(material.price_per_gram)
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.text}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewDetail(material)}
                            disabled={operationLoading}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                            title="Detail Material"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditMaterial(material)}
                            disabled={operationLoading}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                            title="Edit Material"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMaterial(material)}
                            disabled={operationLoading}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                            title="Hapus Material"
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
          {!loading && materials.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Tidak ada material yang ditemukan
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Coba ubah filter pencarian atau tambahkan material baru
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Material
              </button>
            </div>
          )}

          {/* Pagination Section */}
          {!loading && materials.length > 0 && (
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
                  dari {pagination.totalItems} material
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

      {/* Modals - Tetap sama seperti sebelumnya */}
      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Tambah Material Baru
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Lengkapi informasi material baru
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={operationLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column - Basic Information */}
                <div className="space-y-4">
                  {/* Material Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Material <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newMaterial.name}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                      placeholder="Contoh: PLA Filament Premium"
                      disabled={operationLoading}
                    />
                  </div>

                  {/* Density & Price Per Gram */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Density (gr/cm³) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newMaterial.density_display || ""}
                        onChange={(e) =>
                          handleDensityChange(e.target.value, false)
                        }
                        onBlur={(e) => {
                          const formatted = formatDensityDisplay(
                            newMaterial.density
                          );
                          if (formatted !== e.target.value) {
                            handleDensityChange(formatted, false);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                        placeholder="4,5"
                        disabled={operationLoading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Harga Per Gram <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={newMaterial.price_per_gram_formatted}
                          onChange={(e) => {
                            const formattedValue = formatRupiah(
                              parseRupiah(e.target.value)
                            );
                            handlePricePerGramChange(formattedValue, false);
                          }}
                          onBlur={(e) => {
                            const formattedValue = formatRupiah(
                              parseRupiah(e.target.value)
                            );
                            handlePricePerGramChange(formattedValue, false);
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                          placeholder="0"
                          disabled={operationLoading}
                        />
                      </div>
                      {newMaterial.price_per_gram > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Nilai: {formatCurrency(newMaterial.price_per_gram)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={newMaterial.status === "active"}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          status: e.target.checked ? "active" : "inactive",
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                      disabled={operationLoading}
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Material Aktif
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Material akan tersedia untuk dipilih pelanggan
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Image & Description */}
                <div className="space-y-4">
                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gambar Material
                    </label>

                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors bg-gray-50/50">
                      {newMaterial.image_preview ? (
                        <div className="space-y-3">
                          <div className="relative inline-block">
                            <img
                              src={newMaterial.image_preview}
                              alt="Preview"
                              className="w-32 h-32 object-cover rounded-lg border border-gray-200 mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setNewMaterial({
                                  ...newMaterial,
                                  image_file: null,
                                  image_preview: null,
                                })
                              }
                              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              disabled={operationLoading}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600">
                            Preview gambar material
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg flex items-center justify-center mx-auto">
                            <Upload className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              Upload gambar material
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              Format: JPG, PNG, GIF, WebP (Maks. 5MB)
                            </p>
                            <label className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium cursor-pointer">
                              <Upload className="w-3 h-3" />
                              Pilih File
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, false)}
                                className="hidden"
                                disabled={operationLoading}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi Material
                    </label>
                    <textarea
                      value={newMaterial.description}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          description: e.target.value,
                        })
                      }
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm resize-none"
                      placeholder="Deskripsikan karakteristik, keunggulan, dan penggunaan material..."
                      disabled={operationLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newMaterial.description.length}/500 karakter
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-gray-200 bg-gray-50 gap-3">
              <div className="text-xs text-gray-500">
                Field dengan tanda <span className="text-red-500">*</span> wajib
                diisi
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={closeModals}
                  className="flex-1 sm:flex-none px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={operationLoading}
                >
                  Batal
                </button>
                <button
                  onClick={handleAddMaterial}
                  disabled={
                    operationLoading ||
                    !newMaterial.name ||
                    !newMaterial.density ||
                    !newMaterial.price_per_gram
                  }
                  className="flex-1 sm:flex-none flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {operationLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Material"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Detail Material
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedMaterial.name} •{" "}
                  {selectedMaterial.isActive ? "AKTIF" : "NONAKTIF"}
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Material Information */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                  {selectedMaterial.image_url ? (
                    <img
                      src={getImageUrl(selectedMaterial.image_url)}
                      alt={selectedMaterial.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {selectedMaterial.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedMaterial.description || "Tidak ada deskripsi"}
                  </p>
                </div>
              </div>

              {/* Material Details */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800">
                  Informasi Material
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      Density (gr/cm³)
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedMaterial.density
                        ? `${formatDensityDisplay(
                            selectedMaterial.density
                          )} gr/cm³`
                        : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      Harga Per Gram
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedMaterial.price_per_gram
                        ? formatCurrency(selectedMaterial.price_per_gram)
                        : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Status</span>
                    <span
                      className={`text-sm font-medium px-2 py-1 rounded ${
                        selectedMaterial.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {selectedMaterial.isActive ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {selectedMaterial.note && (
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-800">
                    Catatan Tambahan
                  </h3>
                  <div className="bg-gray-50 rounded p-3 border border-gray-200">
                    <p className="text-sm text-gray-700">
                      {selectedMaterial.note}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {showEditModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Material
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Perbarui informasi material
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={operationLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column - Basic Information */}
                <div className="space-y-4">
                  {/* Material Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Material <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={selectedMaterial.name}
                      onChange={(e) =>
                        setSelectedMaterial({
                          ...selectedMaterial,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                      placeholder="Contoh: PLA Filament Premium"
                      disabled={operationLoading}
                    />
                  </div>

                  {/* Density & Price Per Gram */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Density (gr/cm³) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={selectedMaterial.density_display || ""}
                        onChange={(e) =>
                          handleDensityChange(e.target.value, true)
                        }
                        onBlur={(e) => {
                          const formatted = formatDensityDisplay(
                            selectedMaterial.density
                          );
                          if (formatted !== e.target.value) {
                            handleDensityChange(formatted, true);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                        placeholder="4,5"
                        disabled={operationLoading}
                      />
                      {selectedMaterial.density && (
                        <p className="text-xs text-gray-500 mt-1">
                          Nilai: {selectedMaterial.density} gr/cm³
                          {!validateDensity(selectedMaterial.density) && (
                            <span className="text-red-500 ml-2">
                              Format tidak valid
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Harga Per Gram <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={
                            selectedMaterial.price_per_gram_formatted || ""
                          }
                          onChange={(e) => {
                            const formattedValue = formatRupiah(
                              parseRupiah(e.target.value)
                            );
                            handlePricePerGramChange(formattedValue, true);
                          }}
                          onBlur={(e) => {
                            const formattedValue = formatRupiah(
                              parseRupiah(e.target.value)
                            );
                            handlePricePerGramChange(formattedValue, true);
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                          placeholder="0"
                          disabled={operationLoading}
                        />
                      </div>
                      {selectedMaterial.price_per_gram > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Nilai:{" "}
                          {formatCurrency(selectedMaterial.price_per_gram)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedMaterial.status === "active"}
                      onChange={(e) =>
                        setSelectedMaterial({
                          ...selectedMaterial,
                          status: e.target.checked ? "active" : "inactive",
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                      disabled={operationLoading}
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Material Aktif
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Material akan tersedia untuk dipilih pelanggan
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Image & Description */}
                <div className="space-y-4">
                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gambar Material
                    </label>

                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors bg-gray-50/50">
                      {selectedMaterial.image_preview ||
                      selectedMaterial.image_url ? (
                        <div className="space-y-3">
                          <div className="relative inline-block">
                            <img
                              src={
                                selectedMaterial.image_preview ||
                                getImageUrl(selectedMaterial.image_url)
                              }
                              alt="Preview"
                              className="w-32 h-32 object-cover rounded-lg border border-gray-200 mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedMaterial({
                                  ...selectedMaterial,
                                  image_file: null,
                                  image_preview: null,
                                  image_url: selectedMaterial.image_file
                                    ? selectedMaterial.original_image_url
                                    : "",
                                })
                              }
                              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              disabled={operationLoading}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600 mb-2">
                              {selectedMaterial.image_file
                                ? "Gambar baru"
                                : "Gambar saat ini"}
                            </p>
                            <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium cursor-pointer">
                              <Upload className="w-3 h-3" />
                              Ganti Gambar
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, true)}
                                className="hidden"
                                disabled={operationLoading}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg flex items-center justify-center mx-auto">
                            <Upload className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              Upload gambar material
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              Format: JPG, PNG, GIF, WebP (Maks. 5MB)
                            </p>
                            <label className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-colors text-sm font-medium cursor-pointer">
                              <Upload className="w-3 h-3" />
                              Pilih File
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, true)}
                                className="hidden"
                                disabled={operationLoading}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Current Image Info */}
                    {selectedMaterial.image_url &&
                      !selectedMaterial.image_file && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-700 text-center">
                            Gambar saat ini akan tetap digunakan jika tidak
                            diganti
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi Material
                    </label>
                    <textarea
                      value={selectedMaterial.description}
                      onChange={(e) =>
                        setSelectedMaterial({
                          ...selectedMaterial,
                          description: e.target.value,
                        })
                      }
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm resize-none"
                      placeholder="Deskripsikan karakteristik, keunggulan, dan penggunaan material..."
                      disabled={operationLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedMaterial.description?.length || 0}/500 karakter
                    </p>
                  </div>
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
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={operationLoading}
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={
                    operationLoading ||
                    !selectedMaterial.name ||
                    !selectedMaterial.density ||
                    !selectedMaterial.price_per_gram
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
      {showDeleteModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-red-600">
                Hapus Material
              </h2>
              <button
                onClick={closeModals}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200 text-gray-500 hover:text-gray-700"
                disabled={operationLoading}
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
                    Apakah Anda yakin ingin menghapus material ini?
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded border border-red-200 overflow-hidden flex-shrink-0">
                    {selectedMaterial.image_url ? (
                      <img
                        src={getImageUrl(selectedMaterial.image_url)}
                        alt={selectedMaterial.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Package className="w-3 h-3 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 text-sm">
                      {selectedMaterial.name}
                    </h4>
                    <p className="text-red-600 text-xs">
                      {selectedMaterial.description}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Tindakan ini tidak dapat dibatalkan. Semua data material akan
                dihapus secara permanen.
              </p>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeModals}
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
                {operationLoading ? "Menghapus..." : "Hapus Material"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsAdmin;
