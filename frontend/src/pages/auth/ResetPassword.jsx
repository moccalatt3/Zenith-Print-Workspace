import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token reset password tidak valid");
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await authService.resetPassword(token, formData.password);
      
      if (response.success) {
        setMessage(response.message);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(response.message || "Gagal reset password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setError(error.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 py-6 sm:py-8 px-5 sm:px-8 shadow-2xl rounded-2xl sm:rounded-2xl text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Token Tidak Valid</h2>
            <p className="text-gray-300 text-xs sm:text-sm mb-4 sm:mb-6">Link reset password tidak valid atau sudah kadaluarsa.</p>
            <Link
              to="/forgot-password"
              className="text-sm text-[#FA812F] hover:text-[#F25912] transition-colors duration-200"
            >
              Minta link reset password baru
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {/* Logo bisa ditambahkan di sini */}
        </div>
      </div>

      <div className="mt-6 sm:mt-8 mx-auto w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 py-6 sm:py-8 px-5 sm:px-8 shadow-2xl rounded-2xl sm:rounded-2xl">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3">
              Reset Password
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm">
              Masukkan password baru untuk akun Anda
            </p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-xs sm:text-sm text-center">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-4 sm:mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-green-400 text-xs sm:text-sm text-center">{message}</p>
              <p className="text-green-400 text-xs sm:text-sm text-center mt-2">
                Mengarahkan ke halaman login...
              </p>
            </div>
          )}

          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password Baru
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  placeholder="Masukkan password baru"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Konfirmasi Password Baru
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  placeholder="Konfirmasi password baru"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !formData.password || !formData.confirmPassword}
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
                  "Reset Password"
                )}
              </button>
            </div>
          </form>

          <div className="text-center pt-5 sm:pt-6 border-t border-white/10 mt-5 sm:mt-6">
            <p className="text-xs sm:text-sm text-gray-300">
              <Link
                to="/login"
                className="font-medium text-[#FA812F] hover:text-[#F25912] transition-colors duration-200"
              >
                Kembali ke halaman login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;