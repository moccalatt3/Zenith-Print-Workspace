import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../services/authService";

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await authService.login(formData.email, formData.password);
      
      if (response.success) {
        // Store token and user data
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        
        // Redirect based on user role or to dashboard
        window.location.href = "/admin/dashboard";
      } else {
        setError(response.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.response?.data?.message || 
        "Login failed. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo - Same as register page */}
        <div className="flex justify-center">
          {/* <img
            src="/images/logo.png"
            alt="Print3D Logo"
            className="w-40 h-15 object-contain"
          /> */}
        </div>
      </div>

      <div className="mt-6 sm:mt-8 mx-auto w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 py-6 sm:py-8 px-5 sm:px-8 shadow-2xl rounded-2xl sm:rounded-2xl">
          {/* Title inside card - Consistent with register */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3">
              Masuk ke Akun Anda
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm">
              Selamat datang kembali! Silakan masuk ke akun Anda
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-xs sm:text-sm text-center">{error}</p>
            </div>
          )}

          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Alamat Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  placeholder="Masukkan alamat email Anda"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#FA812F] hover:text-[#F25912] transition-colors duration-200"
                >
                  Lupa Password?
                </Link>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  placeholder="Masukkan password Anda"
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#FA812F] focus:ring-[#FA812F] border-white/20 bg-white/5 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-300">
                  Ingat saya
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || !formData.email || !formData.password}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-[#F25912] to-[#FA812F] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FA812F] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="text-center pt-5 sm:pt-6 border-t border-white/10 mt-5 sm:mt-6">
            <p className="text-xs sm:text-sm text-gray-300">
              Belum punya akun?{' '}
              <Link
                to="/register"
                className="font-medium text-[#FA812F] hover:text-[#F25912] transition-colors duration-200"
              >
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home - Consistent with register */}
        <div className="mt-6 sm:mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 group"
          >
            <svg 
              className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform duration-200" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Kembali ke Beranda
          </Link>
        </div>
      </div>

      {/* Custom CSS for animations - Same as register */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SignIn;