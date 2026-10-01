import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { Loader, CheckCircle, XCircle } from "lucide-react";

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [referralValid, setReferralValid] = useState(null);
  const [validatingReferral, setValidatingReferral] = useState(false);
  
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "",
    referralCode: "",
    companyName: "" // TAMBAH INI
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear errors when user types
    if (error) setError("");
    if (success) setSuccess("");
  };

  // Validate referral code
  const validateReferralCode = async () => {
    if (!formData.referralCode.trim()) {
      setReferralValid(null);
      return;
    }

    try {
      setValidatingReferral(true);
      setError("");
      const response = await authService.validateReferralCode(formData.referralCode);
      
      if (response.success) {
        setReferralValid(true);
        setSuccess(`Kode referral valid! Anda akan mendapatkan bonus dari ${response.data.affiliate.name}`);
      }
    } catch (err) {
      setReferralValid(false);
      setError(err.message || "Kode referral tidak valid");
    } finally {
      setValidatingReferral(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasi sebelum submit
    if (!formData.name || !formData.email || !formData.password || !formData.userType) {
      setError("Semua field wajib diisi");
      return;
    }

    // Validasi khusus untuk company
    if (formData.userType === 'company' && !formData.companyName) {
      setError("Nama perusahaan harus diisi untuk tipe company");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    // Validasi kode referral jika diisi
    if (formData.referralCode && referralValid === false) {
      setError("Kode referral tidak valid. Silakan periksa kembali.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Pastikan data yang dikirim sesuai dengan yang diharapkan backend
      const registerData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        userType: formData.userType,
        referralCode: formData.referralCode.trim() || null,
        companyName: formData.userType === 'company' ? formData.companyName.trim() : null // TAMBAH INI
      };

      console.log("Register data being sent:", registerData); // Debug

      const response = await authService.register(registerData);
      
      if (response.success) {
        setSuccess("Registrasi berhasil! Mengarahkan ke halaman utama...");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (err) {
      console.error("Register error in component:", err);
      setError(err.message || "Terjadi kesalahan saat registrasi");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !formData.name) {
      setError("Nama lengkap harus diisi");
      return;
    }
    
    if (currentStep === 2 && (!formData.email || !formData.userType)) {
      setError("Email dan tipe akun harus diisi");
      return;
    }

    // Validasi khusus untuk company di step 2
    if (currentStep === 2 && formData.userType === 'company' && !formData.companyName) {
      setError("Nama perusahaan harus diisi untuk tipe company");
      return;
    }

    // Validasi email format di step 2
    if (currentStep === 2 && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Format email tidak valid");
        return;
      }
    }

    setError("");
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setError("");
    setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        {/* <div className="flex justify-center mb-8">
          <img
            src="/images/logo.png"
            alt="Print3D Logo"
            className="w-40 h-15 object-contain"
          />
        </div> */}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 py-6 sm:py-8 px-4 sm:px-6 shadow-2xl rounded-2xl">
          {/* Notifications */}
          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 px-3 sm:px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button 
                onClick={() => setError("")}
                className="ml-2 text-red-300 hover:text-red-100 flex-shrink-0"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-200 px-3 sm:px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{success}</span>
            </div>
          )}

          {/* Title inside card */}
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
              {currentStep === 1 ? "Informasi Dasar" : currentStep === 2 ? "Detail Akun" : "Verifikasi"}
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm">
              {currentStep === 1 
                ? "Lengkapi informasi dasar untuk memulai" 
                : currentStep === 2
                ? "Lengkapi detail akun Anda"
                : "Selesaikan pendaftaran akun Anda"}
            </p>
          </div>

          {/* Progress Bar - 3 Steps */}
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center px-2 sm:px-4">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 ${
                  currentStep >= 1 
                    ? 'bg-[#FA812F] border-[#FA812F] text-white' 
                    : 'border-white/30 text-white/30'
                } transition-all duration-300 text-xs sm:text-sm`}>
                  1
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 ${
                  currentStep >= 2 
                    ? 'bg-[#FA812F] border-[#FA812F] text-white' 
                    : 'border-white/30 text-white/30'
                } transition-all duration-300 text-xs sm:text-sm`}>
                  2
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 ${
                  currentStep >= 3 
                    ? 'bg-[#FA812F] border-[#FA812F] text-white' 
                    : 'border-white/30 text-white/30'
                } transition-all duration-300 text-xs sm:text-sm`}>
                  3
                </div>
              </div>
            </div>
            <div className="relative mt-2 sm:mt-3">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2"></div>
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-[#FA812F] -translate-y-1/2 transition-all duration-300"
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
              ></div>
            </div>
          </div>

          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            {/* Step 1: Referral Code & Full Name */}
            {currentStep === 1 && (
              <div className="space-y-4 sm:space-y-6">
                {/* Referral Code Input */}
                <div>
                  <label htmlFor="referralCode" className="block text-sm font-medium text-gray-300 mb-2">
                    Kode Referral (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      id="referralCode"
                      name="referralCode"
                      type="text"
                      value={formData.referralCode}
                      onChange={handleChange}
                      onBlur={validateReferralCode}
                      disabled={validatingReferral || loading}
                      className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
                      placeholder="Masukkan kode referral jika ada"
                    />
                    {validatingReferral && (
                      <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white animate-spin" />
                    )}
                    {referralValid === true && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400" />
                    )}
                    {referralValid === false && (
                      <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Dapatkan bonus khusus dengan kode referral yang valid
                  </p>
                </div>

                {/* Full Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Nama Lengkap *
                  </label>
                  <div className="mt-1">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      disabled={loading}
                      className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
                      placeholder="Masukkan nama lengkap Anda"
                    />
                  </div>
                </div>

                {/* Next Button */}
                <div>
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!formData.name || loading || (formData.referralCode && referralValid === false)}
                    className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-[#F25912] to-[#FA812F] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FA812F] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <>
                        Lanjutkan
                        <svg 
                          className="w-4 h-4 sm:w-5 sm:h-5 ml-2" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M9 5l7 7-7 7" 
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Email, User Type & Conditional Company Name */}
            {currentStep === 2 && (
              <div className="space-y-4 sm:space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Alamat Email *
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
                      disabled={loading}
                      className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
                      placeholder="Masukkan alamat email Anda"
                    />
                  </div>
                </div>

                {/* User Type Dropdown */}
                <div>
                  <label htmlFor="userType" className="block text-sm font-medium text-gray-300 mb-2">
                    Saya Mendaftar Sebagai *
                  </label>
                  <div className="mt-1">
                    <select
                      id="userType"
                      name="userType"
                      required
                      value={formData.userType}
                      onChange={handleChange}
                      disabled={loading}
                      className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
                    >
                      <option value="" className="bg-gray-800">Pilih tipe akun</option>
                      <option value="individual" className="bg-gray-800">Perorangan</option>
                      <option value="company" className="bg-gray-800">Perusahaan</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Company Name Input - HANYA MUNCUL JIKA company DIPILIH */}
                {formData.userType === 'company' && (
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
                      Nama Perusahaan *
                    </label>
                    <div className="mt-1">
                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        required={formData.userType === 'company'}
                        value={formData.companyName}
                        onChange={handleChange}
                        disabled={loading}
                        className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
                        placeholder="Masukkan nama perusahaan"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 sm:space-x-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="flex-1 flex justify-center items-center py-2.5 sm:py-3 px-3 sm:px-4 border border-white/20 rounded-xl shadow-sm text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
                  >
                    <svg 
                      className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 19l-7-7 7-7" 
                      />
                    </svg>
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!formData.email || !formData.userType || (formData.userType === 'company' && !formData.companyName) || loading}
                    className="flex-1 flex justify-center items-center py-2.5 sm:py-3 px-3 sm:px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-[#F25912] to-[#FA812F] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FA812F] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <>
                        Lanjutkan
                        <svg 
                          className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M9 5l7 7-7 7" 
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Authentication (Password & Terms) */}
            {currentStep === 3 && (
              <div className="space-y-4 sm:space-y-6">
                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password *
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
                      placeholder="Buat password Anda"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Minimal 6 karakter
                  </p>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Konfirmasi Password *
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/20 rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
                      placeholder="Konfirmasi password Anda"
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start space-x-3 bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    disabled={loading}
                    className="h-4 w-4 text-[#FA812F] focus:ring-[#FA812F] border-white/20 bg-white/5 rounded mt-1 flex-shrink-0 disabled:opacity-50"
                  />
                  <label htmlFor="terms" className="block text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Saya setuju dengan{' '}
                    <a href="#" className="text-[#FA812F] hover:text-[#F25912] transition-colors duration-200 font-medium">
                      Syarat dan Ketentuan
                    </a>{' '}
                    serta{' '}
                    <a href="#" className="text-[#FA812F] hover:text-[#F25912] transition-colors duration-200 font-medium">
                      Kebijakan Privasi
                    </a>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 sm:space-x-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="flex-1 flex justify-center items-center py-2.5 sm:py-3 px-3 sm:px-4 border border-white/20 rounded-xl shadow-sm text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
                  >
                    <svg 
                      className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 19l-7-7 7-7" 
                      />
                    </svg>
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword}
                    className="flex-1 flex justify-center items-center py-2.5 sm:py-3 px-3 sm:px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-[#F25912] to-[#FA812F] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FA812F] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-1 sm:mr-2" />
                        Memproses...
                      </>
                    ) : (
                      "Buat Akun"
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Sign In Link - Only show on first step */}
          {currentStep === 1 && (
            <div className="text-center pt-4 sm:pt-6 border-t border-white/10 mt-4 sm:mt-6">
              <p className="text-xs sm:text-sm text-gray-300">
                Sudah punya akun?{' '}
                <Link
                  to="/login"
                  className="font-medium text-[#FA812F] hover:text-[#F25912] transition-colors duration-200"
                >
                  Masuk di sini
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-6 sm:mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 group"
          >
            <svg 
              className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 transform group-hover:-translate-x-1 transition-transform duration-200" 
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
    </div>
  );
};

export default Register;