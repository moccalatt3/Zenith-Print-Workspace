// frontend/src/pages/user/ReviewStep.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import orderService from "../../services/orderService";
import QuotationButton from "../../components/QuotationButton";

const ReviewStep = ({
  currentStep,
  setCurrentStep,
  selectedFiles,
  orderStatus,
  setOrderStatus,
  orderNumber,
  setOrderNumber,
  orderData,
  setOrderData,
  orderId,
  setOrderId,
  formatCurrency,
  getTotalPrice,
  handleBackToStep1,
  getUserType,
  isCompanyUser,
}) => {
  const navigate = useNavigate();
  const [localFiles, setLocalFiles] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCancelledModal, setShowCancelledModal] = useState(false);
  const [showCompanySuccessModal, setShowCompanySuccessModal] = useState(false);
  const intervalRef = useRef(null);

  // Optimasi computed values dengan useMemo
  const displayFiles = useMemo(
    () => (selectedFiles.length > 0 ? selectedFiles : localFiles),
    [selectedFiles, localFiles]
  );

  const displayTotal = useMemo(
    () =>
      selectedFiles.length > 0
        ? getTotalPrice()
        : localFiles.reduce(
            (total, file) => total + (file.pricing?.totalPrice || 0),
            0
          ),
    [selectedFiles, localFiles, getTotalPrice]
  );

  const isCompany = useMemo(() => getUserType() === "company", [getUserType]);

  // ReviewStep.jsx - Enhanced save function dengan authService
  const saveOrderToStorage = useCallback(
    (step, additionalData = {}) => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      const filesToSave = selectedFiles.length > 0 ? selectedFiles : localFiles;
      const totalAmount = getTotalPrice();

      const orderDataToSave = {
        orderId: orderId || orderData?.id,
        orderNumber: orderNumber,
        orderStatus: orderStatus,
        selectedFiles: filesToSave,
        totalAmount: totalAmount,
        step: step,
        userId: currentUser.id,
        userEmail: currentUser.email,
        timestamp: new Date().toISOString(),
        ...additionalData,
      };

      console.log("💾 Saving to localStorage:", {
        filesCount: filesToSave.length,
        totalAmount: totalAmount,
        step: step,
      });

      // ✅ ENHANCED: Gunakan authService untuk save
      authService.saveOrderData(orderDataToSave);
    },
    [
      selectedFiles,
      localFiles,
      getTotalPrice,
      orderId,
      orderData,
      orderNumber,
      orderStatus,
    ]
  );

  // ReviewStep.jsx - Enhanced load function dengan authService
  const loadOrderFromStorage = useCallback(() => {
    // ✅ ENHANCED: Gunakan authService untuk load dengan validation
    const validatedOrderData = authService.validateAndCleanOrderData();

    if (validatedOrderData) {
      console.log("🔄 ReviewStep: Loading validated order data");
      return validatedOrderData;
    }
    return null;
  }, []);

  // ReviewStep.jsx - Enhanced cancelled order handler
  const handleCancelledOrder = useCallback(() => {
    // ✅ ENHANCED: Clear menggunakan authService
    authService.clearOrderData();

    setCurrentStep(1);
    setOrderStatus("");
    setOrderNumber("");
    setOrderData(null);
    setOrderId(null);
    setShowCancelledModal(false);
  }, [
    setCurrentStep,
    setOrderStatus,
    setOrderNumber,
    setOrderData,
    setOrderId,
  ]);

    useEffect(() => {
    const loadData = () => {
      const orderData = loadOrderFromStorage();

      if (orderData && orderData.selectedFiles) {
        // ✅ GUNAKAN DATA DARI LOCALSTORAGE JIKA selectedFiles KOSONG
        if (selectedFiles.length === 0 && orderData.selectedFiles.length > 0) {
          setLocalFiles(orderData.selectedFiles);
        }
      }
    };

    // Delay sedikit untuk memastikan user context sudah loaded
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [selectedFiles.length, loadOrderFromStorage]);

  // ReviewStep.jsx - Enhanced checkOrderStatus function
  const checkOrderStatus = useCallback(async () => {
    if (!orderId) return;

    try {
      const response = await orderService.getOrderStatus(orderId);

      if (response.success && response.data) {
        const currentOrder = response.data.order;
        const newStatus = currentOrder.order_status;

        // Handle status cancelled
        if (newStatus === "cancelled" && orderStatus !== "cancelled") {
          setOrderStatus("cancelled");
          setOrderData(currentOrder);
          setShowCancelledModal(true);

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        // Handle status changes
        if (newStatus !== orderStatus) {
          setOrderStatus(newStatus);
          setOrderData(currentOrder);

          // ✅ ENHANCED: Update menggunakan authService
          authService.saveOrderData({
            orderId: orderId,
            orderNumber: orderNumber,
            orderStatus: newStatus,
            orderData: currentOrder,
            step: currentStep,
            timestamp: new Date().toISOString(),
          });

          // Show modal berdasarkan status change
          if (isCompany) {
            if (orderStatus === "under_review" && newStatus === "printing") {
              setShowCompanySuccessModal(true);
            }
          } else {
            if (
              orderStatus === "under_review" &&
              newStatus === "waiting_payment"
            ) {
              setShowSuccessModal(true);
            }
          }

          // Clear interval untuk status yang tidak perlu monitoring lagi
          if (
            (!isCompany && newStatus === "waiting_payment") ||
            (isCompany && newStatus === "printing")
          ) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking order status:", error);
    }
  }, [
    orderId,
    orderStatus,
    setOrderStatus,
    setOrderData,
    isCompany,
    orderNumber,
    currentStep,
  ]);

  // Optimasi event handlers dengan useCallback
  const handleCompanyProceedToStep4 = useCallback(() => {
    // ✅ SIMPAN DATA SEBELUM PINDAH STEP
    saveOrderToStorage(4, {
      orderStatus: "printing", // Untuk company, status langsung ke printing
    });
    setCurrentStep(4);
  }, [setCurrentStep, saveOrderToStorage]);

  // ✅ PERBAIKAN KRITIS: Simpan data ke localStorage sebelum pindah ke payment
  const handleIndividualProceedToPayment = useCallback(() => {
    if (!orderId && orderData?.id) {
      setOrderId(orderData.id);
    }

    // ✅ SIMPAN DATA LENGKAP KE LOCALSTORAGE SEBELUM PINDAH KE PAYMENT
    saveOrderToStorage(4, {
      orderStatus: "waiting_payment", // Pastikan status konsisten
    });

    setCurrentStep(4);
    setShowSuccessModal(false);
  }, [orderId, orderData, setOrderId, setCurrentStep, saveOrderToStorage]);

  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
  }, []);

  const handleCloseCompanySuccessModal = useCallback(() => {
    setShowCompanySuccessModal(false);
  }, []);

  const handleCloseCancelledModal = useCallback(() => {
    setShowCancelledModal(false);
  }, []);

  useEffect(() => {
    // Hanya jalankan checker jika kondisi tertentu terpenuhi
    const shouldCheckStatus =
      ((orderStatus === "under_review" || orderStatus === "waiting_payment") &&
        currentStep === 3 &&
        orderId) ||
      (isCompany && orderId);

    if (shouldCheckStatus) {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Check immediately
      checkOrderStatus();

      // Set up interval untuk real-time checking (setiap 45 detik untuk mengurangi load)
      intervalRef.current = setInterval(checkOrderStatus, 45000);

      // Cleanup function
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [orderStatus, currentStep, orderId, isCompany, checkOrderStatus]);

  // Cleanup interval ketika component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // ✅ PERBAIKAN: Simpan data ke localStorage ketika ada perubahan penting
  useEffect(() => {
    if (selectedFiles.length > 0 || localFiles.length > 0) {
      saveOrderToStorage(currentStep);
    }
  }, [selectedFiles, localFiles, currentStep, saveOrderToStorage]);

  // Success Modal Component untuk Individual - DESIGN KONSISTEN
  const SuccessModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto">
        {/* Tombol Tutup */}
        <button
          onClick={handleCloseSuccessModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="text-center">
          {/* Animated Checkmark */}
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="w-full h-full bg-green-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-400 animate-checkmark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                  className="animate-draw"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Order Approved</h3>
          <p className="text-gray-300 text-sm mb-2">
            Order Number:{" "}
            <span className="font-semibold text-white">{orderNumber}</span>
          </p>
          <p className="text-gray-300 text-sm mb-6">
            Status:{" "}
            <span className="font-semibold text-green-400">
              Ready for Payment
            </span>
          </p>

          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">Total Amount:</span>
              <span className="text-white font-semibold">
                {formatCurrency(orderData?.totalAmount || displayTotal)}
              </span>
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-6">
            Your order has been approved! Please proceed to payment to start the
            printing process.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleIndividualProceedToPayment}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300"
            >
              Proceed to Payment
            </button>
            <button
              onClick={handleCloseSuccessModal}
              className="w-full px-6 py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const CompanySuccessModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto">
        {/* Tombol Tutup */}
        <button
          onClick={handleCloseCompanySuccessModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="text-center">
          {/* Animated Checkmark */}
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="w-full h-full bg-green-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-400 animate-checkmark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                  className="animate-draw"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            Company Order Approved
          </h3>
          <p className="text-gray-300 text-sm mb-2">
            Order Number:{" "}
            <span className="font-semibold text-white">{orderNumber}</span>
          </p>
          <p className="text-gray-300 text-sm mb-6">
            Status:{" "}
            <span className="font-semibold text-green-400">Confirmed</span>
          </p>

          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">Total Amount:</span>
              <span className="text-white font-semibold">
                {formatCurrency(orderData?.totalAmount || displayTotal)}
              </span>
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-6">
            Your company order has been confirmed and approved! Please proceed
            to final confirmation.
          </p>

          <div className="flex flex-col gap-3">
            {/* ✅ TOMBOL CONTINUE YANG MENYIMPAN DATA */}
            <button
              onClick={handleCompanyProceedToStep4}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300"
            >
              Continue to Order Confirmation
            </button>
            <button
              onClick={handleCloseCompanySuccessModal}
              className="w-full px-6 py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  // Cancelled Modal Component - DESIGN KONSISTEN
  const CancelledModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto">
        <div className="text-center">
          {/* Icon X */}
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="w-full h-full bg-red-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Order Rejected</h3>
          <p className="text-gray-300 text-sm mb-2">
            Order Number:{" "}
            <span className="font-semibold text-white">{orderNumber}</span>
          </p>
          <p className="text-gray-300 text-sm mb-6">
            Status:{" "}
            <span className="font-semibold text-red-400">Cancelled</span>
          </p>

          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">Total Amount:</span>
              <span className="text-white font-semibold">
                {formatCurrency(displayTotal)}
              </span>
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-6">
            We're sorry, your order cannot be processed because the submitted
            files cannot be handled by our team.
          </p>

          {/* Alasan penolakan dari admin notes jika ada */}
          {orderData?.admin_notes && (
            <div className="mb-6 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-red-300 text-sm">
                <strong>Admin Notes:</strong> {orderData.admin_notes}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleCancelledOrder}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300"
            >
              Create New Order
            </button>
            <button
              onClick={handleCloseCancelledModal}
              className="w-full px-6 py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ TAMPILAN KHUSUS UNTUK ORDER YANG DIBATALKAN (CANCELLED)
  if (orderStatus === "cancelled") {
    return (
      <>
        {showCancelledModal && <CancelledModal />}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            {/* Icon X / Cancelled */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 bg-red-400/20 border border-red-400/30">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Order Rejected
            </h2>

            <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
              We're sorry, your order <strong>cannot be processed</strong>{" "}
              because the submitted files cannot be handled by our team.
            </p>

            {/* Order Details */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6">
              <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">
                Rejected Order Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Order Number:</span>
                  <span className="font-medium text-white">{orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Files Count:</span>
                  <span className="font-medium text-white">
                    {displayFiles.length} file
                    {displayFiles.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Amount:</span>
                  <span className="font-medium text-white">
                    {formatCurrency(displayTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className="font-medium text-red-400">
                    Rejected (Cancelled)
                  </span>
                </div>

                {/* Alasan penolakan dari admin notes jika ada */}
                {orderData?.admin_notes && (
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Admin Notes:</span>
                    </div>
                    <p className="text-red-300 text-xs mt-1 bg-red-500/10 p-2 rounded">
                      {orderData.admin_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons untuk order yang dibatalkan */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={handleCancelledOrder}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
              >
                Create New Order
              </button>
              <button
                onClick={() => navigate("/orders")}
                className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
              >
                View Other Orders
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render main component
  return (
    <>
      {/* Success Modals */}
      {showSuccessModal && <SuccessModal />}
      {showCompanySuccessModal && <CompanySuccessModal />}
      {showCancelledModal && <CancelledModal />}

      <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
        <div className="text-center">
          {/* Conditional rendering berdasarkan user type dan status */}
          {isCompany ? (
            <CompanyOrderView
              orderStatus={orderStatus}
              orderNumber={orderNumber}
              orderId={orderId}
              orderData={orderData}
              onProceed={handleCompanyProceedToStep4}
            />
          ) : (
            <IndividualOrderView
              orderStatus={orderStatus}
              orderNumber={orderNumber}
              orderId={orderId}
              orderData={orderData}
            />
          )}

          {/* Order Details (SAMA UNTUK SEMUA) */}
          <OrderDetails
            orderNumber={orderNumber}
            displayFiles={displayFiles}
            displayTotal={displayTotal}
            orderStatus={orderStatus}
            isCompany={isCompany}
            formatCurrency={formatCurrency}
          />

          {/* Action Buttons */}
          <ActionButtons
            orderStatus={orderStatus}
            isCompany={isCompany}
            onCompanyProceed={handleCompanyProceedToStep4}
            onIndividualProceed={handleIndividualProceedToPayment}
            onBackToStep1={handleBackToStep1}
            onViewOrders={() => navigate("/orders")}
          />
        </div>
      </div>

      {/* CSS untuk animasi checkmark */}
      <style jsx>{`
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-checkmark {
          animation: checkmark 0.6s ease-in-out;
        }

        .animate-draw {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw 0.6s ease-in-out 0.3s forwards;
        }
      `}</style>
    </>
  );
};

// Sub-components untuk better organization
const CompanyOrderView = ({
  orderStatus,
  orderNumber,
  orderId,
  orderData,
  onProceed,
}) => {
  if (orderStatus === "under_review") {
    return (
      <>
        {/* Icon jam dengan warna abu-abu transparan */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 bg-gray-400/10 border border-gray-400/20">
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Company Order - Under Review
        </h2>
        <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
          Your company order is under internal review process. Our team will
          verify the order details and will change the status to "Confirmed"
          when approved.
        </p>
      </>
    );
  }

  if (orderStatus === "printing") {
    return (
      <>
        <div className="w-16 h-16 sm:w-20 sm:h-20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 bg-green-400/20 border border-green-400/30">
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Company Order - Confirmed!
        </h2>
        <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
          Your company order has been confirmed and approved! Click the button
          below to proceed to final confirmation.
        </p>
        <div className="mb-6 space-y-4">
          {(orderId || orderData?.id) && (
            <div className="flex justify-center">
              <QuotationButton
                orderId={orderId || orderData?.id}
                orderNumber={orderNumber}
                type="download"
              />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="w-16 h-16 sm:w-20 sm:h-20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 bg-blue-400/20 border border-blue-400/30">
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
        Company Order - {orderStatus}
      </h2>
      <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
        Your company order status: <strong>{orderStatus}</strong>
      </p>
      {orderStatus !== "under_review" && (orderId || orderData?.id) && (
        <div className="mb-6">
          <div className="flex justify-center">
            <QuotationButton
              orderId={orderId || orderData?.id}
              orderNumber={orderNumber}
              type="download"
            />
          </div>
        </div>
      )}
    </>
  );
};

const IndividualOrderView = ({
  orderStatus,
  orderNumber,
  orderId,
  orderData,
}) => {
  const isWaitingPayment = orderStatus === "waiting_payment";

  return (
    <>
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ${
          isWaitingPayment
            ? "bg-green-400/20 border border-green-400/30"
            : "bg-gray-400/10 border border-gray-400/20"
        }`}
      >
        {isWaitingPayment ? (
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
        {isWaitingPayment ? "Ready for Payment!" : "Order Under Review"}
      </h2>
      <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
        {isWaitingPayment
          ? "Your order has been approved! Please proceed to payment to start the printing process."
          : "Your order is under review by our team. We will check your files and printing specifications."}
      </p>
      {isWaitingPayment && (orderId || orderData?.id) && (
        <div className="mb-6">
          <div className="flex justify-center">
            <QuotationButton
              orderId={orderId || orderData?.id}
              orderNumber={orderNumber}
              type="download"
            />
          </div>
        </div>
      )}
    </>
  );
};

const OrderDetails = ({
  orderNumber,
  displayFiles,
  displayTotal,
  orderStatus,
  isCompany,
  formatCurrency,
}) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6">
    <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">
      Order Details
    </h3>
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-300">Order Number:</span>
        <span className="font-medium text-white">{orderNumber}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-300">Files:</span>
        <span className="font-medium text-white">
          {displayFiles.length} file{displayFiles.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-300">Total Amount:</span>
        <span className="font-medium text-white">
          {formatCurrency(displayTotal)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-300">Current Status:</span>
        <span className="font-medium text-white">
          {orderStatus === "printing" && isCompany ? "Confirmed" : orderStatus}
        </span>
      </div>
      {isCompany ? (
        <div className="flex justify-between">
          <span className="text-gray-300">Payment Method:</span>
          <span className="font-medium text-purple-400">Internal Billing</span>
        </div>
      ) : (
        orderStatus === "under_review" && (
          <div className="flex justify-between">
            <span className="text-gray-300">Estimated Review Time:</span>
            <span className="font-medium text-white">1-2 hours</span>
          </div>
        )
      )}
    </div>
  </div>
);

const ActionButtons = ({
  orderStatus,
  isCompany,
  onCompanyProceed,
  onIndividualProceed,
  onBackToStep1,
  onViewOrders,
}) => {
  if (isCompany) {
    if (orderStatus === "printing") {
      return (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={onViewOrders}
            className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
          >
            View Order Details
          </button>
          <button
            onClick={onCompanyProceed}
            className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
          >
            Continue to Order Confirmation
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        <button
          onClick={onViewOrders}
          className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
        >
          Check Order Status
        </button>
        <button
          onClick={onBackToStep1}
          className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
        >
          Print More Files
        </button>
      </div>
    );
  }

  // Individual user buttons
  if (orderStatus === "waiting_payment") {
    return (
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        <button
          onClick={onViewOrders}
          className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
        >
          View Order Details
        </button>
        <button
          onClick={onIndividualProceed}
          className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
        >
          Proceed to Payment
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
      <button
        onClick={onViewOrders}
        className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
      >
        Check Status & Continue
      </button>
      <button
        onClick={onBackToStep1}
        className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
      >
        Print More Files
      </button>
    </div>
  );
};

export default ReviewStep;
