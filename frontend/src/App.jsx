import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LayoutsUser from "./layouts/LayoutsUser";
import Home from "./pages/user/Home";
import PrintingService from "./pages/user/PrintingService";
import UserOrders from "./pages/user/UserOrders";
import Profile from "./pages/user/Profile";
import UserNotifications from "./pages/user/UserNotifications";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/admin/Dashboard";
import LayoutsAdmin from "./layouts/LayoutsAdmin";
import { authService } from "./services/authService";

// Import halaman admin
import Content from "./pages/admin/Content";
import Customers from "./pages/admin/Customers";
import Affiliate from "./pages/admin/Affiliate";
import MaterialsAdmin from "./pages/admin/Materials";
import Orders from "./pages/admin/Orders";
import Settings from "./pages/admin/Settings";
import Pricing from "./pages/admin/Pricing";
import Notification from "./pages/admin/Notification";

// Import halaman baru
import Report from "./pages/admin/Report";
import Logs from "./pages/admin/Logs";

// Import step components untuk PrintingService
import ProcessingStep from "./pages/user/ProcessingStep";
import CheckoutStep from "./pages/user/CheckoutStep";
import ReviewStep from "./pages/user/ReviewStep";
import PaymentStep from "./pages/user/PaymentStep";

// Protected Route Component untuk route yang membutuhkan auth
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !authService.isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Auth Route Component untuk halaman auth (login, register) - redirect jika sudah login
const AuthRoute = ({ children }) => {
  if (authService.isAuthenticated()) {
    // Jika sudah login, redirect berdasarkan role
    const user = authService.getCurrentUser();
    if (user?.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
};

// Public Route Component untuk halaman umum yang boleh diakses siapa saja
const PublicRoute = ({ children }) => {
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes - Bisa diakses siapa saja (logged in atau tidak) */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LayoutsUser>
                <Home />
              </LayoutsUser>
            </PublicRoute>
          }
        />
        <Route
          path="/printing-service"
          element={
            <PublicRoute>
              <LayoutsUser>
                <PrintingService />
              </LayoutsUser>
            </PublicRoute>
          }
        />

        {/* Protected Routes - Butuh authentication (user biasa) */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <LayoutsUser>
                <UserOrders />
              </LayoutsUser>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <LayoutsUser>
                <Profile />
              </LayoutsUser>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <LayoutsUser>
                <UserNotifications />
              </LayoutsUser>
            </ProtectedRoute>
          }
        />

        {/* Auth Routes - Redirect jika sudah login */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <Register />
            </AuthRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthRoute>
              <ForgotPassword />
            </AuthRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AuthRoute>
              <ResetPassword />
            </AuthRoute>
          }
        />

        {/* Admin Routes - Butuh authentication dan role admin */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Dashboard />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Content />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Customers />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/affiliate"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Affiliate />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/materials"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <MaterialsAdmin />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Orders />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Settings />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pricing"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Pricing />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Report />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Logs />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute requireAdmin>
              <LayoutsAdmin>
                <Notification />
              </LayoutsAdmin>
            </ProtectedRoute>
          }
        />

        {/* ✅ ROUTES UNTUK STEP COMPONENTS (Protected) */}
        <Route
          path="/printing-service/processing"
          element={
            <ProtectedRoute>
              <LayoutsUser>
                <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-25 pb-20 sm:pb-12">
                  <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <ProcessingStep />
                  </div>
                </div>
              </LayoutsUser>
            </ProtectedRoute>
          }
        />
        <Route
          path="/printing-service/checkout"
          element={
            <ProtectedRoute>
              <LayoutsUser>
                <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-25 pb-20 sm:pb-12">
                  <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <CheckoutStep />
                  </div>
                </div>
              </LayoutsUser>
            </ProtectedRoute>
          }
        />
        <Route
          path="/printing-service/review"
          element={
            <ProtectedRoute>
              <LayoutsUser>
                <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-25 pb-20 sm:pb-12">
                  <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <ReviewStep />
                  </div>
                </div>
              </LayoutsUser>
            </ProtectedRoute>
          }
        />
        <Route
          path="/printing-service/payment"
          element={
            <ProtectedRoute>
              <LayoutsUser>
                <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-25 pb-20 sm:pb-12">
                  <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <PaymentStep />
                  </div>
                </div>
              </LayoutsUser>
            </ProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;