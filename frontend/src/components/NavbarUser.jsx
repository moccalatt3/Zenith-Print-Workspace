// frontend/src/components/NavbarUser.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  Settings,
  Package,
  ClipboardList,
  UserCircle,
  Bell,
  X,
  CheckCircle,
  ShoppingCart,
  MessageSquare,
  AlertCircle,
  Clock,
} from "lucide-react";
import { authService } from "../services/authService";
import notificationService from "../services/notificationService";
import orderService from "../services/orderService";

// Komponen Popup Notifikasi
const NotificationPopup = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const popupRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((notif) => !notif.is_read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-4 h-4 text-blue-400" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      case "system":
        return <Settings className="w-4 h-4 text-orange-400" />;
      case "payment":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return created.toLocaleDateString("en-US");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16">
      <div
        ref={popupRef}
        className="relative w-80 sm:w-96 bg-black/80 backdrop-blur-lg rounded-lg shadow-xl border border-white/20 max-h-[80vh] overflow-hidden mr-6 mt-1"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 bg-black/60">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="w-12 h-12 text-white/30 mb-3" />
              <p className="text-white/60 text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                    !notification.is_read
                      ? "bg-blue-500/10 border-l-2 border-l-blue-400"
                      : ""
                  }`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          !notification.is_read ? "text-white" : "text-white/80"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-sm text-white/70 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-white/40" />
                        <span className="text-xs text-white/50">
                          {formatTime(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 bg-black/60">
            <Link
              to="/notifications"
              onClick={onClose}
              className="block w-full text-center text-sm text-orange-400 hover:text-orange-300 font-medium py-2 transition-colors"
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

const NavbarUser = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationPopupOpen, setIsNotificationPopupOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Nav links — hanya Home, Material, How It Works
  const navLinks = [
    { label: "Home", path: "/", anchor: "#hero" },
    { label: "Material", path: "/", anchor: "#paket" },
    { label: "How It Works", path: "/", anchor: "#cara-kerja" },
  ];

  // Effect untuk handle scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Effect untuk get current user
  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (user) {
      loadNotifications();
      loadOrdersCount();
    }
  }, [location]);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const response = await notificationService.getUserNotifications();
      if (response.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const loadOrdersCount = async () => {
    try {
      const response = await orderService.getActiveOrders();
      if (response.success) {
        const activeOrdersCount = response.data?.length || 0;
        setOrdersCount(activeOrdersCount);
        console.log(`✅ Loaded active orders count: ${activeOrdersCount}`);
      } else {
        console.error("❌ Failed to load active orders count");
        setOrdersCount(0);
      }
    } catch (error) {
      console.error("Error loading active orders count:", error);
      setOrdersCount(0);
    }
  };

  // Check jika route aktif (basic — cocokkan path)
  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // ✅ FUNGSI: Handle navigasi ke section dengan smooth scroll
  const handleNavClick = (e, link) => {
    e.preventDefault();

    const isHomePage = location.pathname === "/";
    const targetId = link.anchor.replace("#", "");

    if (isHomePage) {
      // Jika sudah di home page, langsung scroll ke section
      const element = document.getElementById(targetId);
      if (element) {
        // Hitung offset untuk navbar (tinggi navbar ~64px)
        const navbarHeight = 64;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
      // Tutup mobile menu jika terbuka
      setIsMenuOpen(false);
    } else {
      // Jika di halaman lain, navigate ke home dulu lalu scroll
      navigate("/", { state: { scrollTo: targetId } });
      setIsMenuOpen(false);
    }
  };

  // ✅ FUNGSI: Handle scroll setelah navigasi dari halaman lain
  useEffect(() => {
    if (location.pathname === "/" && location.state?.scrollTo) {
      const targetId = location.state.scrollTo;
      // Delay sedikit untuk memastikan DOM sudah render
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          const navbarHeight = 64;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 100);

      // Clear state setelah scroll
      navigate("/", { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Handle logout
  const handleLogout = () => {
    authService.logout();
    setIsProfileMenuOpen(false);
  };

  // Handle mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Toggle notification popup
  const toggleNotificationPopup = () => {
    setIsNotificationPopupOpen(!isNotificationPopupOpen);
    if (!isNotificationPopupOpen) {
      loadNotifications();
    }
  };

  // Style navbar — transparan, no border bottom
  const getNavbarStyle = () => {
    if (isScrolled) {
      return "bg-black/40 backdrop-blur-md";
    }
    return "bg-transparent";
  };

  // Style text
  const getTextStyle = (path) => {
    return isActiveRoute(path)
      ? "text-white font-semibold"
      : "text-white/80 hover:text-white";
  };

  // Logo
  const getLogo = () => {
    return "/images/logo.png";
  };

  // Divider style
  const getDividerStyle = () => {
    return "bg-white/40";
  };

  // Mobile menu style
  const getMobileMenuStyle = () => {
    return "bg-black/70 backdrop-blur-md";
  };

  // Mobile border
  const getMobileBorderStyle = () => {
    return "border-white/20";
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${getNavbarStyle()}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img
                src={getLogo()}
                alt="Print3D Logo"
                className="w-24 h-28 sm:w-28 sm:h-15 object-contain brightness-0 invert"
              />
            </Link>
          </div>

          {/* Desktop Menu — Nav Links dengan Smooth Scroll */}
          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={`${link.path}${link.anchor}`}
                onClick={(e) => handleNavClick(e, link)}
                className={`text-sl font-medium transition-colors duration-200 cursor-pointer ${getTextStyle(
                  link.path
                )}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons / Profile */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/printing-service">
              <button className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-5 py-2 rounded-lg text-sm font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105 shadow-md">
                START 3D PRINTING
              </button>
            </Link>

            <div className={`h-6 w-px ${getDividerStyle()}`}></div>

            {currentUser ? (
              <>
                {/* Notification Bell */}
                <button
                  onClick={toggleNotificationPopup}
                  className="relative text-white hover:text-white/80 transition-colors duration-200"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Orders */}
                <Link to="/orders" className="relative">
                  <button className="text-white hover:text-white/80 transition-colors duration-200 p-2">
                    <Package className="w-5 h-5" />
                    {ordersCount > 0 && (
                      <span className="absolute -top-0 -right-0 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {ordersCount > 9 ? "9+" : ordersCount}
                      </span>
                    )}
                  </button>
                </Link>

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 text-white hover:text-white/80 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">
                      {currentUser.name}
                    </span>
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-5 w-48 bg-black/70 backdrop-blur-lg rounded-lg shadow-lg border border-white/20 py-1 z-50">
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-sm font-medium text-white">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-white/70">
                          {currentUser.email}
                        </p>
                      </div>

                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <UserCircle className="w-4 h-4 mr-2" />
                        My Profile
                      </Link>

                      <Link
                        to="/orders"
                        className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <ClipboardList className="w-4 h-4 mr-2" />
                        My Orders
                      </Link>

                      <Link
                        to="/notifications"
                        className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </Link>

                      {currentUser.role === "admin" && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors duration-200"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login">
                <button className="bg-gradient-to-r from-[#000000] to-[#212121] text-white px-5 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105 shadow-md">
                  Sign In
                </button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-5">
            {currentUser && (
              <button
                onClick={toggleNotificationPopup}
                className="relative text-white hover:text-white/80 transition-colors duration-200"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}

            {currentUser && (
              <Link
                to="/orders"
                className="relative text-white hover:text-white/80 transition-colors duration-200"
              >
                <Package className="w-5 h-5" />
                {ordersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {ordersCount > 9 ? "9+" : ordersCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-white/80 focus:outline-none transition-colors duration-200"
            >
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className={`px-2 pt-2 pb-3 space-y-1 ${getMobileMenuStyle()}`}>
              {/* Nav Links Mobile dengan Smooth Scroll */}
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={`${link.path}${link.anchor}`}
                  onClick={(e) => handleNavClick(e, link)}
                  className="block px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors duration-200 cursor-pointer"
                >
                  {link.label}
                </a>
              ))}

              <div className={`border-t ${getMobileBorderStyle()} my-2`}></div>

              <Link to="/printing-service" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-3 py-2 rounded-lg text-sm font-bold hover:shadow-lg transition-all duration-300 shadow-md mb-2">
                  START 3D PRINTING
                </button>
              </Link>

              <div className={`border-t ${getMobileBorderStyle()} my-2`}></div>

              {currentUser ? (
                <>
                  <div className="px-3 py-2">
                    <p className="text-sm text-white font-medium">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-white/70">{currentUser.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserCircle className="w-4 h-4 mr-2" />
                    My Profile
                  </Link>

                  <Link
                    to="/orders"
                    className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    My Orders
                    {ordersCount > 0 && (
                      <span className="ml-auto bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {ordersCount > 9 ? "9+" : ordersCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/notifications"
                    className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>

                  {currentUser.role === "admin" && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors duration-200"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <button className="w-full bg-gradient-to-r from-[#000000] to-[#212121] text-white px-3 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300 shadow-md">
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notification Popup */}
      <NotificationPopup
        isOpen={isNotificationPopupOpen}
        onClose={() => setIsNotificationPopupOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </nav>
  );
};

export default NavbarUser;