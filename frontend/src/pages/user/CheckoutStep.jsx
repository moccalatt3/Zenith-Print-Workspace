// frontend/src/pages/user/CheckoutStep.jsx
import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import orderService from "../../services/orderService";
import userAffiliateService from "../../services/userAffiliateService";
import EfficientModelViewer from "../../components/EfficientModelViewer";

// Success Modal Component
const SuccessModal = memo(
  ({ isOpen, onClose, orderData, formatCurrency, userType }) => {
    if (!isOpen) return null;

    const handleContinue = () => {
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto">
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
              Order Created Successfully
            </h3>
            <p className="text-gray-300 text-sm mb-2">
              No. Order:{" "}
              <span className="font-semibold text-white">
                {orderData.orderNumber}
              </span>
            </p>
            <p className="text-gray-300 text-sm mb-6">
              Status:{" "}
              <span className="font-semibold text-green-400">Under Review</span>
            </p>

            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Total Amount:</span>
                <span className="text-white font-semibold">
                  {formatCurrency(orderData.totalAmount)}
                </span>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-6">
              {userType === "company"
                ? "Your company order has been submitted for internal review and billing approval. You will be notified once it's processed."
                : "Your order is currently under review. Our team will verify the details and contact you shortly for payment confirmation."}
            </p>

            <button
              onClick={handleContinue}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 mb-3"
            >
              Continue to Order Details
            </button>
          </div>
        </div>
      </div>
    );
  }
);

// Material Selection Component
const MaterialSelection = memo(
  ({ value, onChange, disabled = false, materials, loadingMaterials }) => {
    if (loadingMaterials) {
      return (
        <select
          disabled
          className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FA812F] backdrop-blur-sm appearance-none"
        >
          <option className="bg-gray-800 text-white">
            Loading materials...
          </option>
        </select>
      );
    }

    if (materials.length === 0) {
      return (
        <select
          disabled
          className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FA812F] backdrop-blur-sm appearance-none"
        >
          <option className="bg-gray-800 text-white">
            No materials available
          </option>
        </select>
      );
    }

    return (
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FA812F] backdrop-blur-sm appearance-none"
      >
        {materials.map((material) => (
          <option
            key={material.id}
            value={material.id}
            className="bg-gray-800 text-white"
          >
            {material.name}
          </option>
        ))}
      </select>
    );
  }
);

// Simplified Price Breakdown Component
const SimplifiedPriceBreakdown = memo(({ pricing, formatCurrency }) => {
  if (!pricing) return null;

  const totalAdditionalDiscount =
    pricing.appliedDiscounts?.reduce((total, discount) => {
      return total + (discount.amount || 0);
    }, 0) || 0;

  const hasDiscounts = totalAdditionalDiscount > 0;

  if (!hasDiscounts) {
    return (
      <div className="bg-white/5 rounded-lg p-3 mb-4">
        <div className="text-center">
          <p className="text-gray-400 text-xs">No discounts applied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg p-4 mb-4 border border-green-500/20">
      <h4 className="font-medium text-white text-sm mb-3 text-center">
        Applied Discounts
      </h4>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">Original Price:</span>
          <span className="line-through text-gray-400">
            {formatCurrency(pricing.finalPrice + totalAdditionalDiscount)}
          </span>
        </div>

        <div className="space-y-2">
          {pricing.appliedDiscounts?.map((discount, index) => (
            <div
              key={index}
              className="flex justify-between items-center text-sm"
            >
              <span className="text-white">
                {discount.name} ({discount.value}
                {discount.type === "percentage" ? "%" : " IDR"})
              </span>
              <span className="text-green-400 font-medium">
                -{formatCurrency(discount.amount)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/20 pt-2">
          <div className="flex justify-between items-center font-semibold">
            <span className="text-white">Final Price:</span>
            <span className="text-white">
              {formatCurrency(pricing.finalPrice)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-gray-400 text-xs text-center">
          Includes: Material, Shipping, Tax & Service
        </p>
      </div>
    </div>
  );
});

// File Card Component
const FileCard = memo(
  ({
    fileObj,
    index,
    onRemove,
    onUpdate,
    materials,
    loadingMaterials,
    formatCurrency,
    showRemoveButton = true,
  }) => {
    const handleQuantityChange = useCallback(
      (newQuantity) => {
        onUpdate(fileObj.id, {
          quantity: Math.max(1, Math.min(100, newQuantity || 1)),
        });
      },
      [fileObj.id, onUpdate]
    );

    const handleMaterialChange = useCallback(
      (materialId) => {
        onUpdate(fileObj.id, { material: materialId });
      },
      [fileObj.id, onUpdate]
    );

    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-400">
                {index + 1}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base">
                {fileObj.name}
              </h3>
              <p className="text-xs text-gray-400">
                Uploaded at {fileObj.uploadTime}
              </p>
            </div>
          </div>
          {showRemoveButton && (
            <button
              onClick={() => onRemove(fileObj.id)}
              className="text-red-400 hover:text-red-300 p-2 rounded-lg transition-all duration-300 hover:bg-red-400/10"
            >
              <svg
                className="w-4 h-4"
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
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold text-white text-sm mb-3 text-center">
                3D Preview
              </h4>
              <EfficientModelViewer file={fileObj.file} />
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-white text-sm mb-3">
                File Information
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-300">Dimensions:</span>
                  <span className="text-white font-medium">
                    {fileObj.dimensions}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-300">Volume:</span>
                  <span className="text-white font-medium">
                    {fileObj.volume.toLocaleString()} mm³
                  </span>
                </div>
                {fileObj.pricing && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-300">Estimated Weight:</span>
                    <span className="text-white font-medium">
                      {fileObj.pricing.weight} g
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="bg-white/5 rounded-lg p-4 h-full">
              <h4 className="font-semibold text-white text-sm mb-4 text-center">
                Printing Settings
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Material
                  </label>
                  <MaterialSelection
                    value={fileObj.material}
                    onChange={(e) => handleMaterialChange(e.target.value)}
                    materials={materials}
                    loadingMaterials={loadingMaterials}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={fileObj.quantity}
                      onChange={(e) =>
                        handleQuantityChange(parseInt(e.target.value))
                      }
                      className="w-24 border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA812F] backdrop-blur-sm"
                    />
                    <span className="text-gray-400 text-sm">
                      {fileObj.quantity} unit{fileObj.quantity > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="bg-white/5 rounded-lg p-4 h-full">
              <h4 className="font-semibold text-white text-sm mb-4 text-center">
                Price Breakdown
              </h4>

              {fileObj.pricing ? (
                <>
                  <SimplifiedPriceBreakdown
                    pricing={fileObj.pricing}
                    formatCurrency={formatCurrency}
                  />

                  <div className="mt-6 bg-white/5 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-gray-300 text-xs mb-1">
                            Unit Price
                          </p>
                          <p className="text-white font-semibold text-sm">
                            {formatCurrency(fileObj.pricing.finalPrice)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-300 text-xs mb-1">Quantity</p>
                          <p className="text-white font-semibold text-sm">
                            {fileObj.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-white/20 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">
                            Total:
                          </span>
                          <span className="text-lg font-bold text-[#FA812F]">
                            {formatCurrency(fileObj.pricing.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">Calculating price...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

const CheckoutStep = ({
  currentStep,
  setCurrentStep,
  selectedFiles,
  setSelectedFiles,
  affiliateCode,
  setAffiliateCode,
  materials,
  loadingMaterials,
  userAffiliate,
  setUserAffiliate,
  affiliateValidation,
  setAffiliateValidation,
  isValidatingAffiliate,
  setIsValidatingAffiliate,
  affiliateInput,
  setAffiliateInput,
  orderStatus,
  setOrderStatus,
  orderNumber,
  setOrderNumber,
  orderData,
  setOrderData,
  orderId,
  setOrderId,
  showMessage,
  formatCurrency,
  formatFileSize,
  getTotalPrice,
  calculateFilePricing,
  findMaterialById,
}) => {
  const navigate = useNavigate();
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderData, setSuccessOrderData] = useState(null);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // ✅ PERBAIKAN: Validate affiliate code function - DIPINDAHKAN KE ATAS
  const validateAffiliateCodeNow = useCallback(
    async (code) => {
      if (!code || code.trim() === "") {
        setAffiliateValidation(null);
        setIsValidatingAffiliate(false);
        return;
      }

      setIsValidatingAffiliate(true);
      try {
        const response = await userAffiliateService.validateAffiliateCode(code);

        if (response.success) {
          setAffiliateValidation({
            isValid: true,
            message:
              "Submit your referral code now to unlock exclusive discounts on your order for 6 months!",
            affiliateName: response.data.affiliateName,
            isPermanent: response.data.isPermanent,
          });
        } else {
          setAffiliateValidation({
            isValid: false,
            message: response.message || "Kode referral tidak valid",
          });
        }
      } catch (error) {
        setAffiliateValidation({
          isValid: false,
          message: "Gagal memvalidasi kode",
        });
      } finally {
        setIsValidatingAffiliate(false);
      }
    },
    [setIsValidatingAffiliate, setAffiliateValidation]
  );
  // ✅ PERBAIKAN: Debounce untuk validasi referral code - MENGGUNAKAN validateAffiliateCodeNow yang sudah diinisialisasi
  const debouncedValidateAffiliate = useCallback(
    (code) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const newTimer = setTimeout(() => {
        if (code && code.trim() !== "") {
          validateAffiliateCodeNow(code);
        } else {
          // Reset validation jika input kosong
          setAffiliateValidation(null);
          setIsValidatingAffiliate(false);
        }
      }, 800); // Delay 800ms setelah user berhenti mengetik

      setDebounceTimer(newTimer);
    },
    [
      debounceTimer,
      validateAffiliateCodeNow,
      setAffiliateValidation,
      setIsValidatingAffiliate,
    ]
  );

  // ✅ PERBAIKAN: Cleanup timer pada unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);


    const loadOrderFromStorage = useCallback(() => {
    // ✅ ENHANCED: Gunakan authService untuk load dengan validation
    const validatedOrderData = authService.validateAndCleanOrderData();

    if (validatedOrderData) {
      console.log("🔄 CheckoutStep: Loading validated order data");
      return validatedOrderData;
    }
    return null;
  }, []);

  // CheckoutStep.jsx - Enhanced save function dengan authService
  const saveOrderToStorage = useCallback((files) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    const orderData = {
      selectedFiles: files,
      userId: currentUser.id,
      userEmail: currentUser.email,
      timestamp: new Date().toISOString(),
    };

    // ✅ ENHANCED: Gunakan authService untuk save
    authService.saveOrderData(orderData);
    console.log(
      "💾 CheckoutStep: Saved order data for user:",
      currentUser.email
    );
  }, []);
  
  // CheckoutStep.jsx - Enhanced file handlers
  const handleRemoveFile = useCallback(
    (fileId) => {
      setSelectedFiles((prev) => {
        const newFiles = prev.filter((f) => f.id !== fileId);

        // ✅ ENHANCED: Simpan ke localStorage dengan authService
        authService.saveOrderData({
          selectedFiles: newFiles,
          timestamp: new Date().toISOString(),
        });

        return newFiles;
      });
    },
    [setSelectedFiles]
  );


  // ✅ ENHANCED: Load data dari localStorage dengan user validation
  useEffect(() => {
    const loadData = () => {
      const orderData = loadOrderFromStorage();

      if (orderData) {
        // ✅ UPDATE STATE DENGAN DATA DARI LOCALSTORAGE
        if (orderData.orderNumber && !orderNumber) {
          setOrderNumber(orderData.orderNumber);
        }
        if (orderData.orderStatus && !orderStatus) {
          setOrderStatus(orderData.orderStatus);
        }
        if (orderData.orderId && !orderId) {
          setOrderId(orderData.orderId);
        }

        // ✅ HANYA LOAD SELECTED FILES JIKA MASIH DI STEP 1 ATAU 2
        if (orderData.selectedFiles && orderData.step < 3) {
          if (selectedFiles.length === 0) {
            console.log(
              "🔄 CheckoutStep: Loading selectedFiles from localStorage:",
              orderData.selectedFiles.length,
              "files"
            );
            setSelectedFiles(orderData.selectedFiles);
          }
        }
      }
    };

    // Delay sedikit untuk memastikan user context sudah loaded
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [
    selectedFiles.length,
    setSelectedFiles,
    loadOrderFromStorage,
    orderNumber,
    orderStatus,
    orderId,
  ]);

  // CheckoutStep.jsx - Enhanced order creation success handler
  const handleSuccessModalClose = useCallback(() => {
    console.log("🎯 Closing modal and moving to step 3");
    setShowSuccessModal(false);
    setSuccessOrderData(null);

    // ✅ ENHANCED: Update localStorage menggunakan authService
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      authService.saveOrderData({
        orderId: orderId || orderData?.id,
        orderNumber: orderNumber,
        orderStatus: orderStatus,
        selectedFiles: selectedFiles,
        step: 3,
        timestamp: new Date().toISOString(),
      });
    }

    // Pindah ke step 3 SETELAH modal ditutup
    setCurrentStep(3);
  }, [
    setCurrentStep,
    orderId,
    orderData,
    orderNumber,
    orderStatus,
    selectedFiles,
  ]);

  const handleUpdateFile = useCallback(
    (fileId, updates) => {
      setSelectedFiles((prev) =>
        prev.map((file) => {
          if (file.id === fileId) {
            const updatedFile = { ...file, ...updates };

            if (
              updates.material !== undefined ||
              updates.quantity !== undefined
            ) {
              updatedFile.pricing = null;
              updatedFile._lastMaterial =
                updates.material !== undefined
                  ? updates.material
                  : file.material;
              updatedFile._lastQuantity =
                updates.quantity !== undefined
                  ? updates.quantity
                  : file.quantity;
            }

            // ✅ ENHANCED: Simpan ke localStorage dengan user context
            const updatedFiles = prev.map((f) =>
              f.id === fileId ? updatedFile : f
            );
            saveOrderToStorage(updatedFiles);

            return updatedFile;
          }
          return file;
        })
      );
    },
    [setSelectedFiles, saveOrderToStorage]
  );

  // Common order creation logic - PERBAIKAN FLOW STEP
  const createOrder = useCallback(
    async (orderPayload) => {
      setIsProcessingFile(true);

      try {
        // Clear previous state
        setOrderStatus(null);
        setOrderNumber(null);
        setOrderData(null);
        setOrderId(null);

        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          alert("User tidak ditemukan. Silakan login kembali.");
          return;
        }

        // Upload files terlebih dahulu
        const uploadFormData = new FormData();
        selectedFiles.forEach((fileObj) => {
          uploadFormData.append("models", fileObj.file);
        });

        const uploadResponse = await orderService.uploadModels(uploadFormData);
        if (!uploadResponse.success) {
          throw new Error(`Gagal upload file: ${uploadResponse.message}`);
        }

        const uploadedFiles = uploadResponse.data.files;

        // Update order payload dengan data file yang benar dari server
        const updatedOrderPayload = {
          ...orderPayload,
          files: orderPayload.files.map((fileData, index) => {
            const uploadedFile = uploadedFiles[index];
            if (!uploadedFile) {
              throw new Error(
                `File ${fileData.originalFileName} tidak berhasil diupload`
              );
            }

            return {
              ...fileData,
              fileName: uploadedFile.fileName,
              originalFileName: uploadedFile.originalFileName,
              fileSize: uploadedFile.fileSize,
              fileUrl: uploadedFile.fileUrl,
              filePath: uploadedFile.filePath,
            };
          }),
        };

        // Create order dengan data yang sudah diperbaiki
        const orderResponse = await orderService.createOrder(
          updatedOrderPayload
        );

        if (orderResponse.success) {
          const newOrderStatus = "under_review";
          const orderIdFromResponse =
            orderResponse.data.orderId || orderResponse.data.id;

          setOrderStatus(newOrderStatus);
          setOrderNumber(orderResponse.data.orderNumber);
          setOrderData(orderResponse.data);
          setOrderId(orderIdFromResponse);

          // TAMPILKAN MODAL DULU - jangan langsung ke step 3
          setSuccessOrderData({
            orderNumber: orderResponse.data.orderNumber,
            totalAmount: orderPayload.totalAmount,
            userType: currentUser.user_type,
          });
          setShowSuccessModal(true);

          // ✅ PERBAIKAN: Simpan ke localStorage DENGAN STEP 3 untuk menjaga progression
          const orderDataForStorage = {
            orderId: orderIdFromResponse,
            orderNumber: orderResponse.data.orderNumber,
            orderStatus: newOrderStatus,
            step: 3, // ✅ STEP 3 - REVIEW STEP
            selectedFiles: selectedFiles,
            userId: currentUser.id,
            userEmail: currentUser.email,
            timestamp: new Date().toISOString(),
          };

          localStorage.setItem(
            "lastActiveOrder",
            JSON.stringify(orderDataForStorage)
          );
          console.log("💾 Order progress saved to step 3");

          console.log(
            "✅ Order created, modal shown - step saved as 3 in localStorage"
          );
        } else {
          throw new Error(orderResponse.message);
        }
      } catch (error) {
        console.error("❌ Error creating order:", error);
        alert("Gagal membuat order: " + error.message);
      } finally {
        setIsProcessingFile(false);
      }
    },
    [selectedFiles, setOrderStatus, setOrderNumber, setOrderData, setOrderId]
  );

  // Handle company order
  const handleCompanyOrderConfirmation = useCallback(async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      alert("User tidak ditemukan. Silakan login kembali.");
      return;
    }

    const totalBeforeDiscount = getTotalPrice();
    let finalTotalAmount = totalBeforeDiscount;
    let appliedDiscounts = [];
    let totalDiscount = 0;

    // ✅ PERBAIKAN: Hitung total discount dari semua file
    selectedFiles.forEach((fileObj) => {
      if (fileObj.pricing && fileObj.pricing.appliedDiscounts) {
        appliedDiscounts = [
          ...appliedDiscounts,
          ...fileObj.pricing.appliedDiscounts,
        ];
        totalDiscount += fileObj.pricing.additionalDiscountAmount || 0;
      }
    });

    // ✅ PERBAIKAN: Gunakan finalPrice yang sudah didiskon untuk totalAmount
    finalTotalAmount = selectedFiles.reduce((total, fileObj) => {
      if (fileObj.pricing) {
        // ✅ GUNAKAN finalPrice * quantity, BUKAN totalPrice
        return total + fileObj.pricing.finalPrice * fileObj.quantity;
      }
      return total;
    }, 0);

    console.log("💰 FINAL CALCULATION CHECK:", {
      totalBeforeDiscount,
      totalDiscount,
      finalTotalAmount,
      calculatedFromFiles: selectedFiles.map((f) => ({
        name: f.name,
        finalPrice: f.pricing?.finalPrice,
        quantity: f.quantity,
        subtotal: f.pricing?.finalPrice * f.quantity,
      })),
    });

    // Determine affiliate code
    let finalAffiliateCode = null;
    if (currentUser.affiliate_id) {
      if (userAffiliate?.hasAffiliate && userAffiliate.referralCode) {
        finalAffiliateCode = userAffiliate.referralCode;
      }
    } else if (affiliateCode?.trim() !== "") {
      finalAffiliateCode = affiliateCode;
    }

    const orderPayload = {
      files: selectedFiles.map((fileObj, index) => {
        const material = findMaterialById(fileObj.material);
        const pricing = fileObj.pricing || {};

        // ✅ PERBAIKAN KRITIS: Pastikan finalPrice dan totalPrice menggunakan harga SETELAH diskon
        const finalPriceAfterDiscount = pricing.finalPrice || 0;
        const totalPriceAfterDiscount =
          finalPriceAfterDiscount * fileObj.quantity;

        return {
          fileName: `file_${index + 1}`,
          originalFileName: fileObj.name,
          fileSize: fileObj.file.size,
          fileUrl: "",
          materialId: material?.id || "",
          materialName: material?.name || "Unknown",
          quantity: fileObj.quantity || 1,
          volume: fileObj.volume || 0,
          weight: parseFloat(pricing.weight) || 0,
          dimensions: fileObj.dimensions || "0 x 0 x 0 mm",
          unitPrice: finalPriceAfterDiscount, // ✅ SETELAH DISKON
          materialCost: pricing.materialCost || 0,
          shippingCost: pricing.shipping || 0,
          taxAmount: pricing.tax || 0,
          packingCost: pricing.packing || 0,
          localShippingCost: pricing.ongkirLocal || 0,
          subtotal: pricing.subTotal || 0,
          overheadAmount: pricing.overhead || 0,
          profitAmount: pricing.profit || 0,
          finalPrice: finalPriceAfterDiscount, // ✅ SETELAH DISKON
          totalPrice: totalPriceAfterDiscount, // ✅ SETELAH DISKON
          appliedDiscounts: pricing.appliedDiscounts || [],
          additionalDiscountAmount: pricing.additionalDiscountAmount || 0,
          totalDiscountAmount: pricing.totalDiscountAmount || 0,
        };
      }),
      affiliateCode: finalAffiliateCode,
      totalAmount: finalTotalAmount, // ✅ SUDAH BENAR
      originalAmount: totalBeforeDiscount,
      discountAmount: totalDiscount,
      appliedDiscounts: appliedDiscounts,
      customerNotes: "Order Company - Internal Billing",
      paymentType: "company_billing",
      userType: "company",
      orderStatus: "under_review",
    };

    console.log(
      "🎯 FINAL ORDER PAYLOAD:",
      JSON.stringify(orderPayload, null, 2)
    );

    await createOrder(orderPayload);
  }, [
    selectedFiles,
    getTotalPrice,
    userAffiliate,
    affiliateCode,
    findMaterialById,
    createOrder,
  ]);

  // Handle individual order
  const handleSubmit = useCallback(async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file first");
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      alert("User tidak ditemukan. Silakan login kembali.");
      return;
    }

    const totalAmountAfterDiscount = getTotalPrice();

    // Determine affiliate code
    let finalAffiliateCode = null;
    if (currentUser.affiliate_id) {
      if (userAffiliate?.hasAffiliate && userAffiliate.referralCode) {
        finalAffiliateCode = userAffiliate.referralCode;
      }
    } else if (affiliateCode?.trim() !== "") {
      finalAffiliateCode = affiliateCode;
    }

    const orderPayload = {
      files: selectedFiles.map((fileObj, index) => {
        const material = findMaterialById(fileObj.material);
        const pricing = fileObj.pricing || {};

        return {
          fileName: `file_${index + 1}`,
          originalFileName: fileObj.name,
          fileSize: fileObj.file.size,
          fileUrl: "",
          materialId: material?.id || "",
          materialName: material?.name || "Unknown",
          quantity: fileObj.quantity || 1,
          volume: fileObj.volume || 0,
          weight: parseFloat(pricing.weight) || 0,
          dimensions: fileObj.dimensions || "0 x 0 x 0 mm",
          unitPrice: pricing.finalPrice || 0,
          materialCost: pricing.materialCost || 0,
          shippingCost: pricing.shipping || 0,
          taxAmount: pricing.tax || 0,
          packingCost: pricing.packing || 0,
          localShippingCost: pricing.ongkirLocal || 0,
          subtotal: pricing.subTotal || 0,
          overheadAmount: pricing.overhead || 0,
          profitAmount: pricing.profit || 0,
          finalPrice: pricing.finalPrice || 0,
          totalPrice: pricing.totalPrice || 0,
          appliedDiscounts: pricing.appliedDiscounts || [],
          additionalDiscountAmount: pricing.additionalDiscountAmount || 0,
          totalDiscountAmount: pricing.totalDiscountAmount || 0,
        };
      }),
      affiliateCode: finalAffiliateCode,
      totalAmount: totalAmountAfterDiscount,
      customerNotes: "Order dari website 3D Printing",
      userType: currentUser.user_type || "individual",
    };

    await createOrder(orderPayload);
  }, [
    selectedFiles,
    getTotalPrice,
    userAffiliate,
    affiliateCode,
    findMaterialById,
    createOrder,
  ]);

  const isCompanyUser = authService.getCurrentUser()?.user_type === "company";

  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Order Summary
          </h2>
          <p className="text-gray-300 text-sm sm:text-base">
            Review your files and configure printing options for each file
          </p>
        </div>

        {/* List File Cards */}
        <div className="space-y-6 mb-8">
          {selectedFiles.map((fileObj, index) => (
            <FileCard
              key={fileObj.id}
              fileObj={fileObj}
              index={index}
              onRemove={handleRemoveFile}
              onUpdate={handleUpdateFile}
              materials={materials}
              loadingMaterials={loadingMaterials}
              formatCurrency={formatCurrency}
              showRemoveButton={selectedFiles.length > 1}
            />
          ))}
        </div>

        {/* Kode Referral dan Order Total */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Kode Referral */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3 text-sm sm:text-base">
              Referral Code
            </h3>
            <div className="space-y-3">
              {userAffiliate?.hasAffiliate && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Permanent Referral Code Detected
                      </p>
                      <p className="text-gray-300 text-xs mt-1">
                        Code: {userAffiliate.referralCode}
                      </p>
                      <p className="text-gray-300 text-xs mt-1">
                        You are registered with this referral code for 6 months
                        and cannot be changed
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {(!userAffiliate || !userAffiliate.hasAffiliate) && (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={affiliateCode}
                      onChange={(e) => {
                        const newCode = e.target.value;
                        setAffiliateCode(newCode);
                        setAffiliateInput(newCode);

                        // Reset validation state saat user mulai mengetik atau mengosongkan
                        if (newCode.trim() === "") {
                          setAffiliateValidation(null);
                          setIsValidatingAffiliate(false);
                          if (debounceTimer) {
                            clearTimeout(debounceTimer);
                          }
                        } else {
                          setAffiliateValidation(null);
                          setIsValidatingAffiliate(true); // Tampilkan loading segera
                          debouncedValidateAffiliate(newCode);
                        }
                      }}
                      placeholder="Masukkan kode referral (opsional)"
                      className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FA812F] backdrop-blur-sm pr-10"
                    />

                    {affiliateCode && affiliateCode.trim() !== "" && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {isValidatingAffiliate ? (
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : affiliateValidation?.isValid ? (
                          <svg
                            className="w-5 h-5 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-red-400"
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
                        )}
                      </div>
                    )}
                  </div>

                  {affiliateCode && affiliateCode.trim() !== "" && (
                    <div
                      className={`p-3 rounded-lg ${
                        isValidatingAffiliate
                          ? "bg-blue-500/10"
                          : affiliateValidation?.isValid
                          ? "bg-green-500/20"
                          : affiliateValidation?.isValid === false
                          ? "bg-red-500/10"
                          : "bg-blue-500/10"
                      }`}
                    >
                      <div className="flex items-center">
                        {isValidatingAffiliate ? (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                            <p className="text-blue-400 text-xs">
                              Memvalidasi kode referral...
                            </p>
                          </>
                        ) : affiliateValidation?.isValid ? (
                          <>
                            <svg
                              className="w-4 h-4 text-green-400 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <p className="text-green-400 text-xs">
                              {affiliateValidation.message}
                            </p>
                          </>
                        ) : affiliateValidation?.isValid === false ? (
                          <>
                            <svg
                              className="w-4 h-4 text-red-400 mr-2"
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
                            <p className="text-red-400 text-xs">
                              {affiliateValidation?.message ||
                                "Kode referral tidak valid"}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                            <p className="text-blue-400 text-xs">
                              Memeriksa kode referral...
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Jika memiliki kode referral, masukkan untuk mendapatkan
                    diskon spesial.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3 text-sm sm:text-base text-center">
              Order Total
            </h3>
            <div className="space-y-3">
              {selectedFiles.map((fileObj, index) => (
                <div
                  key={fileObj.id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-300 truncate flex-1 mr-2">
                    {index + 1}. {fileObj.name}
                  </span>
                  <span className="text-white font-medium flex-shrink-0">
                    {fileObj.pricing
                      ? formatCurrency(fileObj.pricing.totalPrice)
                      : "Calculating..."}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/20 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-white">Total Amount:</span>
                  <span className="text-[#FA812F]">
                    {formatCurrency(getTotalPrice())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base order-2 sm:order-1 backdrop-blur-sm"
          >
            Back
          </button>
          <button
            onClick={
              isCompanyUser ? handleCompanyOrderConfirmation : handleSubmit
            }
            disabled={isProcessingFile || selectedFiles.length === 0}
            className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-300 ${
              !isProcessingFile && selectedFiles.length > 0
                ? "bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white hover:shadow-lg transform hover:scale-105 cursor-pointer"
                : "bg-white/10 text-gray-400 cursor-not-allowed border border-white/20"
            } order-1 sm:order-2`}
          >
            {isProcessingFile ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating Order...
              </div>
            ) : (
              `Create Order - ${formatCurrency(getTotalPrice())}`
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        orderData={successOrderData}
        formatCurrency={formatCurrency}
        userType={authService.getCurrentUser()?.user_type}
      />

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

export default CheckoutStep;
