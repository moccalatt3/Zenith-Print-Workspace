import { Link, useLocation } from "react-router-dom";
import { authService } from "../services/authService";
import {
  LayoutDashboard,
  Package,
  Box,
  Users,
  Settings,
  LogOut,
  Home,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Percent,
  FileText,
  Clock,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import api from "../services/api";

const SidebarAdmin = () => {
  const location = useLocation();
  const user = authService.getCurrentUser();
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load new orders count from dashboard overview
  useEffect(() => {
    loadDashboardOverview();

    // Auto refresh setiap 30 detik
    const interval = setInterval(loadDashboardOverview, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardOverview = async () => {
    try {
      setLoading(true);
      console.log("🔄 Loading dashboard overview for orders count...");

      const response = await api.get("/admin/dashboard/overview");
      console.log("📊 Dashboard overview response:", response.data);

      if (response.data.success) {
        const data = response.data.data;
        // HITUNG HANYA ORDER YANG MASIH PENDING/REVIEW
        // Tidak termasuk yang sudah processing (sudah di-approve admin)
        const newOrders = data.pending_orders || 0;
        console.log(
          `📦 Calculated new orders: ${newOrders} (pending: ${data.pending_orders}, processing: ${data.processing_orders} - TIDAK DIHITUNG)`
        );
        setNewOrdersCount(newOrders);
      }
    } catch (error) {
      console.error("❌ Error loading dashboard overview:", error);
      console.error("Error details:", error.response?.data || error.message);
      setNewOrdersCount(0);
    } finally {
      setLoading(false);
    }
  };

  const menuSections = [
    {
      title: "Utama",
      items: [
        {
          path: "/admin/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          description: "Ringkasan pesanan & analitik",
        },
      ],
    },
    {
      title: "Konten & Produk",
      items: [
        {
          path: "/admin/content",
          label: "Konten Website",
          icon: Home,
          description: "Kelola semua konten website",
        },
        {
          path: "/admin/materials",
          label: "Material",
          icon: Box,
          description: "Kelola material printing",
        },
      ],
    },
    {
      title: "Pesanan & Pelanggan",
      items: [
        {
          path: "/admin/orders",
          label: "Semua Pesanan",
          icon: ShoppingCart,
          description: "Kelola semua pesanan pelanggan",
          badge: newOrdersCount > 0 ? newOrdersCount.toString() : null,
        },
        {
          path: "/admin/customers",
          label: "Pelanggan",
          icon: Users,
          description: "Lihat data pelanggan",
        },
      ],
    },
    {
      title: "Pemasaran & Harga",
      items: [
        {
          path: "/admin/affiliate",
          label: "Program Affiliate",
          icon: TrendingUp,
          description: "Kelola program referral",
        },
        {
          path: "/admin/pricing",
          label: "Pengaturan Harga",
          icon: DollarSign,
          description: "Kelola biaya & harga akhir",
        },
      ],
    },
    {
      title: "Laporan & Sistem",
      items: [
        {
          path: "/admin/report",
          label: "Riwayat",
          icon: FileText,
          description: "Laporan dan riwayat sistem",
        },
        {
          path: "/admin/logs",
          label: "Logs Sistem",
          icon: Clock,
          description: "Aktivitas dan log sistem",
        },
        {
          path: "/admin/settings",
          label: "Pengaturan",
          icon: Settings,
          description: "Konfigurasi sistem",
        },
      ],
    },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    authService.logout();
    window.location.reload();
  };

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg bg-gray-900 text-white shadow-lg"
        >
          {isMobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Overlay - Transparent */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-opacity-30 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        bg-white min-h-screen flex flex-col fixed lg:static z-40
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        w-64 lg:w-64
        h-screen lg:h-auto
        overflow-y-auto
      `}
      >
        {/* Header Sidebar */}
        <div className="p-4 border-b border-gray-200 h-[70px] flex items-center flex-shrink-0">
          <div className="flex items-center space-x-3 lg:ml-0 ml-13">
            <div>
              <h1 className="text-lg font-bold text-gray-800">Panel Admin</h1>
              <p className="text-xs text-gray-500">Zenith Print Labs</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu - Scrollable */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-1">
              {/* Section Title */}
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>

              {/* Section Items */}
              {section.items.map((item, itemIndex) => {
                const IconComponent = item.icon;
                const showBadge = item.badge && parseInt(item.badge) > 0;

                return (
                  <Link
                    key={`${sectionIndex}-${itemIndex}`}
                    to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                      isActive(item.path)
                        ? "bg-gradient-to-r from-[#000000] to-[#212121] text-white shadow-lg"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive(item.path)
                          ? "text-white"
                          : "text-gray-400 group-hover:text-gray-600"
                      }`}
                    />
                    <div className="ml-3 text-left flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.label}
                      </div>
                      <div
                        className={`text-xs leading-tight truncate ${
                          isActive(item.path)
                            ? "text-white opacity-90"
                            : "text-gray-400 group-hover:text-gray-600"
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>

                    {/* Badge untuk notifikasi - SELALU TAMPIL JIKA ADA ORDER PENDING */}
                    {showBadge && (
                      <span
                        className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full min-w-5 h-5 ${
                          isActive(item.path)
                            ? "bg-white text-black"
                            : "bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Loading indicator */}
                    {loading && item.path === "/admin/orders" && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Info & Logout - Fixed at bottom */}
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Keluar
          </button>
        </div>
      </div>
    </>
  );
};

export default SidebarAdmin;