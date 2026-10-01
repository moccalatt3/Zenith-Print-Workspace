// frontend/src/pages/user/PrintingService.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import orderService from "../../services/orderService";
import userMaterialService from "../../services/userMaterialService";
import userPricingService from "../../services/userPricingService";
import userAffiliateService from "../../services/userAffiliateService";
import paymentService from "../../services/paymentService";
import ProcessingStep from "./ProcessingStep";
import CheckoutStep from "./CheckoutStep";
import ReviewStep from "./ReviewStep";
import PaymentStep from "./PaymentStep";

const PrintingService = () => {
  const navigate = useNavigate();

  // State utama
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentProof, setPaymentProof] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [pricingConfig, setPricingConfig] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [userAffiliate, setUserAffiliate] = useState(null);
  const [affiliateValidation, setAffiliateValidation] = useState(null);
  const [isValidatingAffiliate, setIsValidatingAffiliate] = useState(false);
  const [affiliateInput, setAffiliateInput] = useState("");
  const [paymentType, setPaymentType] = useState("full_payment");
  const [uploadProgress, setUploadProgress] = useState({});
  const [currentlyProcessing, setCurrentlyProcessing] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [paymentStep, setPaymentStep] = useState("upload");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  // Pricing cache
  const pricingCache = new Map();
  const MAX_CACHE_SIZE = 30;
  const CACHE_TTL = 60 * 1000;

  // Get user type
  const getUserType = () => {
    const currentUser = authService.getCurrentUser();
    return currentUser?.user_type || "individual";
  };

  const isCompanyUser = () => getUserType() === "company";

  // ✅ ENHANCED: Authentication check dengan user context validation
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
      return;
    }

    const currentUser = authService.getCurrentUser();
    console.log("👤 Current user data:", currentUser);

    // ✅ VALIDASI: Pastikan data localStorage milik user yang sedang login
    const validatedOrderData = authService.validateAndCleanOrderData();
    if (validatedOrderData) {
      console.log("🔄 Loading validated order data for user:", currentUser.email);
      
      // Sync state dengan data yang sudah divalidasi
      if (validatedOrderData.orderStatus && !orderStatus) {
        setOrderStatus(validatedOrderData.orderStatus);
      }
      if (validatedOrderData.orderNumber && !orderNumber) {
        setOrderNumber(validatedOrderData.orderNumber);
      }
      if (validatedOrderData.orderId && !orderId) {
        setOrderId(validatedOrderData.orderId);
      }
      if (validatedOrderData.orderData && !orderData) {
        setOrderData(validatedOrderData.orderData);
      }
      if (validatedOrderData.selectedFiles && validatedOrderData.selectedFiles.length > 0 && selectedFiles.length === 0) {
        setSelectedFiles(validatedOrderData.selectedFiles);
      }
      if (validatedOrderData.step && validatedOrderData.step !== currentStep) {
        setCurrentStep(validatedOrderData.step);
      }
    } else {
      console.log("📭 No valid order data found for current user");
    }

    loadMaterials();
    loadPricingConfig();
    fetchUserAffiliateData();

    if (currentStep === 3 || currentStep === 4) {
      checkLatestActiveOrder();
    }
  }, [navigate]);

  // Load materials
  const loadMaterials = async () => {
    try {
      setLoadingMaterials(true);
      const response = await userMaterialService.getAllMaterials();

      if (response.success) {
        console.log("✅ Materials loaded successfully:", response.data);
        const validatedMaterials = response.data.map((material) => ({
          ...material,
          density: material.density || 1.0,
          price_per_gram: material.price_per_gram || 0,
        }));
        setMaterials(validatedMaterials);
      } else {
        console.error("❌ Failed to load materials:", response);
      }
    } catch (error) {
      console.error("Error loading materials:", error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Load pricing config
  const loadPricingConfig = async () => {
    try {
      setLoadingPricing(true);
      console.log("🔄 Loading pricing configuration from DATABASE...");

      const response = await userPricingService.getConfig();

      if (response.success && response.data) {
        console.log("✅ Pricing config loaded from DATABASE:", response.data);
        const databaseConfig = {
          shippingRatePerKg: response.data.shippingRatePerKg,
          taxRate: response.data.taxRate,
          packingCost: response.data.packingCost,
          localShippingRatePerKg: response.data.localShippingRatePerKg,
          overheadPercentage: response.data.overheadPercentage,
          profitPercentage: response.data.profitPercentage,
          finalPriceDiscount: response.data.finalPriceDiscount,
        };

        const missingFields = [];
        Object.entries(databaseConfig).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            missingFields.push(key);
            console.warn(`⚠️ Config field '${key}' is missing from database`);
          }
        });

        if (missingFields.length > 0) {
          throw new Error(
            `Konfigurasi harga tidak lengkap: ${missingFields.join(", ")}`
          );
        }

        console.log(
          "✅ Pricing config VALIDATED - All fields present from database"
        );
        setPricingConfig(databaseConfig);
      } else {
        throw new Error(
          response.message || "Gagal mengambil konfigurasi harga dari database"
        );
      }
    } catch (error) {
      console.error("❌ Error loading pricing config from DATABASE:", error);
      setPricingConfig(null);
      showMessage(
        "error",
        `Gagal memuat konfigurasi harga dari database:\n${error.message}\n\n` +
          `Silakan:\n` +
          `1. Refresh halaman\n` +
          `2. Cek koneksi internet\n` +
          `3. Hubungi administrator untuk memperbaiki konfigurasi pricing`
      );
    } finally {
      setLoadingPricing(false);
    }
  };

  // Fetch user affiliate data
  const fetchUserAffiliateData = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        console.log("🔍 Checking affiliate data for user:", currentUser);
        const response = await userAffiliateService.getAffiliateData();
        console.log("📊 Affiliate API response:", response);

        if (response.success) {
          setUserAffiliate(response.data);
          console.log("🎯 User affiliate data loaded:", response.data);

          if (response.data.hasAffiliate && response.data.referralCode) {
            setAffiliateCode(response.data.referralCode);
            console.log(
              "🎯 Auto-set affiliate code:",
              response.data.referralCode
            );
          }
        } else {
          console.warn("⚠️ API returned success:false", response);
          setUserAffiliate({ hasAffiliate: false });
        }
      } else {
        console.warn("⚠️ No current user found");
        setUserAffiliate({ hasAffiliate: false });
      }
    } catch (error) {
      console.error("❌ Error fetching affiliate data:", error);
      setUserAffiliate({
        hasAffiliate: false,
        referralCode: null,
        commissionRate: 0,
        pendingEarnings: 0,
      });
    }
  };

  // Check latest active order
  const checkLatestActiveOrder = async () => {
    try {
      console.log("🔍 Checking for latest active order...", {
        currentStep,
        orderStatus,
        orderId,
        userType: getUserType(),
      });

      if (getUserType() === "company" && currentStep === 4) {
        console.log("🛑 Company already at step 4 - skipping auto order check");
        return;
      }

      if (currentStep === 1 || currentStep === 2) {
        console.log(
          "🔄 User sedang proses order baru, skip auto-load order lama"
        );
        return;
      }

      if (
        currentStep === 4 &&
        orderStatus &&
        [
          "payment_received",
          "printing",
          "final_touchup",
          "ready_to_ship",
          "completed",
        ].includes(orderStatus)
      ) {
        console.log("🛑 Already at step 4 - skipping auto order check");
        return;
      }

      const response = await orderService.getActiveOrders();

      if (response.success && response.data && response.data.length > 0) {
        const latestOrder = response.data[0];
        console.log("✅ Found active order:", latestOrder);

        if (orderId && orderId === latestOrder.id) {
          console.log("🔄 Same order already loaded, skip duplicate");
          return;
        }

        const orderDetailResponse = await orderService.getOrderDetail(
          latestOrder.id
        );

        if (orderDetailResponse.success) {
          const fullOrderData = orderDetailResponse.data.order;
          const orderItems = orderDetailResponse.data.items;

          console.log("🎯 Processing order:", {
            orderId: fullOrderData.id,
            status: fullOrderData.order_status,
            currentStep: currentStep,
            userType: getUserType(),
          });

          setOrderStatus(fullOrderData.order_status);
          setOrderNumber(fullOrderData.order_number);
          setOrderData(fullOrderData);
          setOrderId(fullOrderData.id);

          if (
            selectedFiles.length === 0 &&
            currentStep !== 1 &&
            currentStep !== 2
          ) {
            const simulatedFiles = orderItems.map((item, index) => ({
              id: `order-item-${item.id}`,
              name: item.original_file_name || item.file_name,
              file: new File([], item.file_name),
              size: item.file_size || 0,
              material: item.material_id,
              quantity: item.quantity,
              volume: item.volume,
              dimensions: item.dimensions,
              pricing: {
                finalPrice: item.final_price,
                totalPrice: item.total_price,
                weight: item.weight,
              },
            }));
            setSelectedFiles(simulatedFiles);
          }

          const userType = getUserType();
          let targetStep = currentStep;

          if (currentStep !== 4) {
            if (userType === "individual") {
              if (
                fullOrderData.order_status === "payment_received" ||
                fullOrderData.order_status === "printing" ||
                fullOrderData.order_status === "final_touchup" ||
                fullOrderData.order_status === "ready_to_ship" ||
                fullOrderData.order_status === "completed"
              ) {
                targetStep = 4;
                console.log(
                  `👤 Individual: Advanced status ${fullOrderData.order_status} → Step 4`
                );
              } else if (
                fullOrderData.order_status === "waiting_payment" ||
                fullOrderData.order_status === "under_review"
              ) {
                targetStep = 3;
                console.log(
                  `👤 Individual: Basic status ${fullOrderData.order_status} → Step 3`
                );
              }
            } else if (userType === "company") {
              if (
                fullOrderData.order_status === "printing" &&
                currentStep !== 4
              ) {
                targetStep = 4;
                console.log(
                  `🏢 Company: Status ${fullOrderData.order_status} → Step 4`
                );
              } else {
                targetStep = 3;
                console.log(
                  `🏢 Company: Status ${fullOrderData.order_status} → Step 3`
                );
              }
            }
          } else {
            console.log("🛑 Already at step 4 - no step change allowed");
          }

          if (
            targetStep !== currentStep &&
            !(currentStep === 4 && targetStep === 3)
          ) {
            setCurrentStep(targetStep);
            console.log(`🔄 Step changed: ${currentStep} → ${targetStep}`);
          }

          // ✅ ENHANCED: Save to localStorage dengan user context
          const storageData = {
            orderId: fullOrderData.id,
            orderNumber: fullOrderData.order_number,
            orderStatus: fullOrderData.order_status,
            step: targetStep,
            orderData: fullOrderData,
            selectedFiles: selectedFiles.length > 0 ? selectedFiles : simulatedFiles,
            timestamp: new Date().toISOString(),
            userType: userType,
          };

          authService.saveOrderData(storageData);

          console.log(`🎯 Order state updated: ${fullOrderData.order_number}`, {
            status: fullOrderData.order_status,
            step: targetStep,
            userType: userType,
          });

          if (
            fullOrderData.order_status === "waiting_payment" &&
            userType === "individual"
          ) {
            showMessage(
              "success",
              `Order Disetujui! 🎉\nNo. Order: ${fullOrderData.order_number}\nStatus: Ready for Payment\nSilakan lanjutkan ke pembayaran.`
            );
          } else if (
            fullOrderData.order_status === "printing" &&
            userType === "company"
          ) {
            showMessage(
              "info",
              `Order Company Dikonfirmasi! 🎉\nNo. Order: ${fullOrderData.order_number}\nStatus: Approved\nKlik tombol "Lanjutkan ke Konfirmasi Order" untuk melanjutkan.`
            );
          }
        }
      } else {
        console.log("ℹ️ No active orders found");

        if (
          currentStep !== 1 &&
          currentStep !== 2 &&
          selectedFiles.length === 0 &&
          !(getUserType() === "company" && currentStep === 4)
        ) {
          console.log("🔄 No active orders - resetting to step 1");
          setCurrentStep(1);
          authService.clearOrderData();
          setOrderStatus(null);
          setOrderNumber(null);
          setOrderData(null);
          setOrderId(null);
          setSelectedFiles([]);
        }
      }
    } catch (error) {
      console.error("❌ Error checking latest order:", error);
      if (currentStep === 1 || currentStep === 2) {
        console.log(
          "🔄 Error but user is creating new order - keeping current step"
        );
        return;
      }
    }
  };

  // Find material by ID
  const findMaterialById = (materialId) => {
    const id = parseInt(materialId, 10);
    console.log(
      `🔍 [MATERIAL LOOKUP] Mencari material ID: ${id} (tipe: ${typeof id})`
    );

    const material = materials.find((m) => m.id === id);

    if (!material) {
      const errorMsg = `❌ [MATERIAL LOOKUP] Material dengan ID ${id} TIDAK DITEMUKAN di database`;
      console.error(errorMsg);
      showMessage(
        "error",
        `Material dengan ID ${id} tidak ditemukan.\n\n` +
          `Silakan:\n` +
          `1. Refresh halaman untuk memuat ulang data material\n` +
          `2. Pilih material yang tersedia dari dropdown\n` +
          `3. Hubungi admin jika masalah berlanjut`
      );
      return null;
    }

    if (!material.density || material.density <= 0) {
      const errorMsg = `❌ [MATERIAL VALIDATION] Density material '${material.name}' tidak valid: ${material.density}`;
      console.error(errorMsg);
      showMessage(
        "error",
        `Data density untuk material '${material.name}' tidak valid.\n` +
          `Silakan pilih material lain atau hubungi administrator.`
      );
      return null;
    }

    if (!material.price_per_gram || material.price_per_gram <= 0) {
      const errorMsg = `❌ [MATERIAL VALIDATION] Harga material '${material.name}' tidak valid: ${material.price_per_gram}`;
      console.error(errorMsg);
      showMessage(
        "error",
        `Data harga untuk material '${material.name}' tidak valid.\n` +
          `Silakan pilih material lain atau hubungi administrator.`
      );
      return null;
    }

    console.log(
      `✅ [MATERIAL LOOKUP] Material VALID dari database: ${material.name} (ID: ${material.id}) - ` +
        `Density: ${material.density}g/cm³ - Price: ${formatCurrency(
          material.price_per_gram
        )}/g`
    );

    return material;
  };

  const showMessage = (type, text) => {
    console.log(`[${type.toUpperCase()}] ${text}`);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) {
      return "Rp 0";
    }

    const numericAmount =
      typeof amount === "string" ? parseFloat(amount) : amount;

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get total price
  const getTotalPrice = () => {
    if (selectedFiles.length > 0) {
      return selectedFiles.reduce((total, file) => {
        return total + (file.pricing?.totalPrice || 0);
      }, 0);
    }

    if (orderData && orderData.total_amount) {
      return orderData.total_amount;
    }

    return 0;
  };

  // ✅ ENHANCED: Handle back to step 1 dengan user context
  const handleBackToStep1 = () => {
    console.log("🔄 Starting reset process for new order...");

    const intervalIds = Object.values(window).filter(
      (item) => typeof item === "number" && item > 0
    );
    intervalIds.forEach((id) => {
      clearInterval(id);
      clearTimeout(id);
    });

    setSelectedFiles([]);
    setAffiliateCode("");
    setPaymentProof(null);
    setPaymentType("full_payment");
    setOrderStatus(null);
    setOrderNumber(null);
    setOrderData(null);
    setOrderId(null);
    setCurrentStep(1);

    // ✅ ENHANCED: Clear localStorage dengan user context
    authService.clearOrderData();
    pricingCache.clear();

    const fileInput = document.getElementById("file-input");
    if (fileInput) {
      fileInput.value = "";
    }

    setDiscountCode("");
    setAffiliateInput("");
    setAffiliateValidation(null);

    console.log("✅ Reset completed - ready for new order");

    setTimeout(() => {
      console.log("🔄 Confirming clean state...");
      checkNoActiveOrders();
    }, 100);
  };

  // Check no active orders
  const checkNoActiveOrders = async () => {
    try {
      const response = await orderService.getActiveOrders();
      if (response.success && response.data && response.data.length > 0) {
        console.warn("⚠️ Masih ada order aktif setelah reset:", response.data);
        authService.clearOrderData();
      } else {
        console.log("✅ Confirm: No active orders after reset");
      }
    } catch (error) {
      console.error("❌ Error checking active orders:", error);
    }
  };

  // Cleanup pricing cache
  const cleanupPricingCache = () => {
    const now = Date.now();
    let deletedCount = 0;

    for (let [key, value] of pricingCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        pricingCache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`);
    }

    if (pricingCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(pricingCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = Math.floor(MAX_CACHE_SIZE * 0.5);

      for (let i = 0; i < toDelete; i++) {
        pricingCache.delete(entries[i][0]);
      }

      console.log(
        `🧹 Removed ${toDelete} oldest cache entries (size: ${pricingCache.size})`
      );
    }
  };

  // Calculate file pricing
  const calculateFilePricing = async (fileObj) => {
    const currentUser = authService.getCurrentUser();

    const cacheKey = `${fileObj.material}-${fileObj.quantity}-${
      fileObj.volume
    }-${fileObj.name}-${discountCode || "no-discount"}-${
      affiliateCode || userAffiliate?.referralCode || "no-affiliate"
    }`;

    cleanupPricingCache();
    const cached = pricingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`💰 Using cached pricing for ${fileObj.name}`);
      return cached.data;
    }

    try {
      const material = findMaterialById(fileObj.material);
      if (!material) {
        throw new Error(
          `Material dengan ID ${fileObj.material} tidak ditemukan`
        );
      }

      console.log(`🔄 Calculating pricing for ${fileObj.name}`);

      const pricingRequest = {
        material: fileObj.material,
        quantity: fileObj.quantity,
        volume: fileObj.volume,
      };

      if (discountCode && discountCode.trim() !== "") {
        pricingRequest.discountCode = discountCode;
        console.log(`🎫 Applying discount code: ${discountCode}`);
      }

      const finalReferralCode = userAffiliate?.referralCode || affiliateCode;

      if (finalReferralCode && finalReferralCode.trim() !== "") {
        pricingRequest.referralCode = finalReferralCode;
        pricingRequest.activateReferralDiscount = true;

        console.log(
          `🎯 SENDING REFERRAL CODE TO BACKEND: ${finalReferralCode}`,
          {
            source: userAffiliate?.referralCode
              ? "userAffiliate"
              : "affiliateCode",
            hasAffiliateId: !!currentUser?.affiliate_id,
          }
        );
      } else {
        console.log(`ℹ️ No referral code found for pricing calculation`);
      }

      console.log(`📤 Sending to backend:`, pricingRequest);

      const response = await userPricingService.calculatePricing(
        pricingRequest
      );

      if (response.success) {
        if (
          response.data.appliedDiscounts &&
          response.data.appliedDiscounts.length > 0
        ) {
          console.log(`✅ DISCOUNTS APPLIED:`, response.data.appliedDiscounts);
        } else {
          console.log(`ℹ️ No discounts applied`);
        }

        pricingCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
        });

        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error(`❌ Pricing failed for ${fileObj.name}:`, error);
      throw new Error(`Gagal menghitung harga: ${error.message}`);
    }
  };

  // File dependencies for pricing recalculation
  const fileDependencies = useMemo(() => {
    return selectedFiles.map((f) => ({
      material: f.material,
      quantity: f.quantity,
      volume: f.volume,
    }));
  }, [selectedFiles]);

  // Pricing update effect
  useEffect(() => {
    const updatePricingForFiles = async () => {
      if (selectedFiles.length === 0 || materials.length === 0) return;

      console.log(
        `🔄 Updating pricing for ${selectedFiles.length} files via BACKEND DATABASE`,
        {
          discountCode: discountCode || "None",
          affiliateCode: affiliateCode || "None",
          userAffiliateCode: userAffiliate?.referralCode || "None",
          materialsCount: materials.length,
        }
      );

      try {
        const updatedFiles = await Promise.all(
          selectedFiles.map(async (fileObj) => {
            const currentReferralCode =
              userAffiliate?.referralCode || affiliateCode;

            const shouldRecalculate =
              !fileObj.pricing ||
              fileObj._lastMaterial !== fileObj.material ||
              fileObj._lastQuantity !== fileObj.quantity ||
              fileObj._lastDiscount !== discountCode ||
              fileObj._lastAffiliate !== currentReferralCode;

            if (shouldRecalculate) {
              try {
                console.log(`🔄 Recalculating pricing for: ${fileObj.name}`, {
                  materialChanged: fileObj._lastMaterial !== fileObj.material,
                  quantityChanged: fileObj._lastQuantity !== fileObj.quantity,
                  discountChanged: fileObj._lastDiscount !== discountCode,
                  affiliateChanged:
                    fileObj._lastAffiliate !== currentReferralCode,
                  hadPricing: !!fileObj.pricing,
                  currentReferralCode: currentReferralCode || "None",
                  previousReferralCode: fileObj._lastAffiliate || "None",
                });

                const pricing = await calculateFilePricing(fileObj);
                return {
                  ...fileObj,
                  pricing,
                  _lastMaterial: fileObj.material,
                  _lastQuantity: fileObj.quantity,
                  _lastDiscount: discountCode,
                  _lastAffiliate: currentReferralCode,
                };
              } catch (pricingError) {
                console.error(
                  `❌ Pricing failed for ${fileObj.name}:`,
                  pricingError
                );
                showMessage(
                  "error",
                  `Gagal menghitung harga untuk "${fileObj.name}": ${pricingError.message}\n\n` +
                    `Silakan:\n` +
                    `1. Refresh halaman\n` +
                    `2. Cek koneksi internet\n` +
                    `3. Hubungi admin jika masalah berlanjut`
                );

                return {
                  ...fileObj,
                  _lastMaterial: fileObj.material,
                  _lastQuantity: fileObj.quantity,
                  _lastDiscount: discountCode,
                  _lastAffiliate: currentReferralCode,
                };
              }
            }

            console.log(
              `ℹ️ Skipping recalculation for: ${fileObj.name} - no changes detected`,
              {
                hasPricing: !!fileObj.pricing,
                currentReferralCode: currentReferralCode || "None",
                previousReferralCode: fileObj._lastAffiliate || "None",
              }
            );
            return fileObj;
          })
        );

        const hasChanges = updatedFiles.some(
          (newFile, index) => newFile.pricing !== selectedFiles[index]?.pricing
        );

        if (hasChanges) {
          console.log(
            `✅ Applying pricing updates to ${updatedFiles.length} files`
          );
          setSelectedFiles(updatedFiles);

          updatedFiles.forEach((file, index) => {
            const oldFile = selectedFiles[index];
            if (file.pricing && oldFile?.pricing) {
              const oldDiscount = oldFile.pricing.additionalDiscountAmount || 0;
              const newDiscount = file.pricing.additionalDiscountAmount || 0;

              if (oldDiscount !== newDiscount) {
                console.log(`🎫 Discount changed for ${file.name}:`, {
                  oldDiscount: formatCurrency(oldDiscount),
                  newDiscount: formatCurrency(newDiscount),
                  difference: formatCurrency(newDiscount - oldDiscount),
                });
              }
            }
          });
        } else {
          console.log(`ℹ️ No pricing changes detected, skipping state update`);
        }
      } catch (error) {
        console.error("❌ Critical error updating pricing:", error);
        showMessage(
          "error",
          "Gagal memperbarui harga. Silakan refresh halaman dan coba lagi.\n" +
            "Jika masalah berlanjut, hubungi administrator."
        );
      }
    };

    const timeoutId = setTimeout(updatePricingForFiles, 100);
    return () => clearTimeout(timeoutId);
  }, [
    fileDependencies,
    materials.length,
    discountCode,
    affiliateCode,
    userAffiliate?.referralCode,
  ]);

  // Affiliate/discount change effect
  useEffect(() => {
    const currentUser = authService.getCurrentUser();

    console.log(`🔄 Affiliate/Discount change detected:`, {
      affiliateCode,
      discountCode,
      userAffiliateId: currentUser?.affiliate_id,
      userAffiliateCode: userAffiliate?.referralCode,
      selectedFilesCount: selectedFiles.length,
    });

    const shouldTriggerRecalculation =
      (affiliateCode && affiliateCode.trim() !== "") ||
      (discountCode && discountCode.trim() !== "") ||
      (userAffiliate && userAffiliate.referralCode);

    if (shouldTriggerRecalculation && selectedFiles.length > 0) {
      console.log(
        `🔄 Affiliate/Discount change detected, triggering discount recalculation for ${selectedFiles.length} files`
      );
      pricingCache.clear();
      console.log(`🧹 Pricing cache cleared`);

      setSelectedFiles((prev) =>
        prev.map((file) => ({
          ...file,
          pricing: null,
          _lastMaterial: null,
          _lastQuantity: null,
          _lastDiscount: discountCode,
          _lastAffiliate:
            currentUser?.affiliate_id ||
            affiliateCode ||
            userAffiliate?.referralCode,
        }))
      );

      console.log(`🔄 All files reset for pricing recalculation`);
    }
  }, [affiliateCode, discountCode, userAffiliate?.referralCode]);

  // ✅ ENHANCED: Load from localStorage dengan user validation
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        const validatedOrderData = authService.validateAndCleanOrderData();
        if (validatedOrderData) {
          console.log("📦 Loaded validated order from localStorage:", {
            orderNumber: validatedOrderData.orderNumber,
            orderStatus: validatedOrderData.orderStatus,
            step: validatedOrderData.step,
            filesCount: validatedOrderData.selectedFiles?.length || 0
          });

          if (validatedOrderData.orderId && validatedOrderData.orderStatus) {
            setOrderId(validatedOrderData.orderId);
            setOrderNumber(validatedOrderData.orderNumber);
            setOrderStatus(validatedOrderData.orderStatus);

            if (validatedOrderData.step) {
              if (getUserType() === "company" && validatedOrderData.step === 4) {
                setCurrentStep(4);
                console.log(
                  "🏢 Company: Mempertahankan step 4 dari localStorage"
                );
              } else {
                setCurrentStep(validatedOrderData.step);
              }
            } else if (validatedOrderData.orderStatus === "payment_received") {
              setCurrentStep(4);
            } else if (validatedOrderData.orderStatus === "waiting_payment") {
              setCurrentStep(3);
            } else if (validatedOrderData.orderStatus === "under_review") {
              setCurrentStep(3);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error loading from localStorage:", error);
        authService.clearOrderData();
      }
    };

    loadFromLocalStorage();
  }, []);

  // Real-time status checkers
  useEffect(() => {
    if (orderStatus === "under_review" && currentStep === 3 && orderId) {
      console.log(
        "🔄 Starting real-time status checker for under_review order..."
      );

      const checkUnderReviewStatus = async () => {
        try {
          console.log("🔍 Checking if under_review order has been approved...");
          const response = await orderService.getOrderStatus(orderId);

          if (response.success && response.data) {
            const currentOrder = response.data.order;

            if (
              currentOrder.order_status === "waiting_payment" &&
              orderStatus === "under_review"
            ) {
              console.log(
                "🎉 Order approved! Status changed to waiting_payment"
              );
              setOrderStatus("waiting_payment");
              setOrderData(currentOrder);
              
              // ✅ ENHANCED: Save updated status dengan user context
              authService.saveOrderData({
                orderId,
                orderNumber,
                orderStatus: "waiting_payment",
                orderData: currentOrder,
                step: 3,
                selectedFiles,
              });
              
              showMessage(
                "success",
                `Order Disetujui! 🎉\nNo. Order: ${orderNumber}\nStatus: Ready for Payment\nSilakan lanjutkan ke pembayaran.`
              );
              clearInterval(intervalId);
            }
          }
        } catch (error) {
          console.error("❌ Error checking under_review status:", error);
        }
      };

      const intervalId = setInterval(checkUnderReviewStatus, 30000);
      checkUnderReviewStatus();

      return () => {
        clearInterval(intervalId);
        console.log("🛑 Stopped under_review status checker");
      };
    }
  }, [orderStatus, currentStep, orderId, orderNumber, selectedFiles]);

  // Company real-time status checker
  useEffect(() => {
    if (getUserType() !== "company" || !orderId) return;

    console.log("🏢 Starting COMPANY real-time status checker...", {
      currentStep,
      orderStatus,
    });

    const checkCompanyStatus = async () => {
      try {
        console.log("🔄 Checking company order status...");
        const response = await orderService.getOrderStatus(orderId);

        if (response.success && response.data) {
          const currentOrder = response.data.order;
          const newStatus = currentOrder.order_status;

          if (newStatus !== orderStatus) {
            console.log(
              `🏢 Company status changed: ${orderStatus} → ${newStatus}`
            );
            setOrderStatus(newStatus);
            setOrderData(currentOrder);

            // ✅ ENHANCED: Save updated status dengan user context
            authService.saveOrderData({
              orderId,
              orderNumber,
              orderStatus: newStatus,
              orderData: currentOrder,
              step: currentStep,
              selectedFiles,
            });

            if (orderStatus === "under_review" && newStatus === "printing") {
              showMessage(
                "success",
                `🏢 ORDER COMPANY DISETUJUI!\nNo. Order: ${orderNumber}`
              );
            } else if (newStatus === "final_touchup") {
              showMessage(
                "info",
                `🏢 Order #${orderNumber} sedang dalam proses finishing.`
              );
            } else if (newStatus === "ready_to_ship") {
              showMessage("success", `🏢 Order #${orderNumber} siap dikirim!`);
            } else if (newStatus === "completed") {
              showMessage("success", `🏢 Order #${orderNumber} telah selesai!`);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error checking company status:", error);
      }
    };

    const intervalId = setInterval(checkCompanyStatus, 30000);
    const immediateCheck = setTimeout(checkCompanyStatus, 2000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(immediateCheck);
    };
  }, [orderId, orderStatus, currentStep, getUserType(), orderNumber, selectedFiles]);

  // ProgressStepper component
  const ProgressStepper = ({ currentStep }) => {
    return (
      <div className="mb-8 sm:mb-10">
        <div className="flex justify-between items-center mb-4">
          {/* Step 1: File Processing */}
          <div
            className={`flex flex-col items-center ${
              currentStep >= 1 ? "text-white" : "text-gray-500"
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-2 text-sm sm:text-base ${
                currentStep >= 1
                  ? "bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white"
                  : "bg-white/10 text-gray-400 backdrop-blur-sm"
              }`}
            >
              1
            </div>
            <span className="text-xs sm:text-sm font-medium text-center">
              File Processing
            </span>
          </div>

          {/* Connector 1 */}
          <div
            className={`flex-1 h-1 mx-2 sm:mx-4 ${
              currentStep >= 2 ? "bg-[#FA812F]" : "bg-white/20"
            }`}
          ></div>

          {/* Step 2: Check-out */}
          <div
            className={`flex flex-col items-center ${
              currentStep >= 2 ? "text-white" : "text-gray-500"
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-2 text-sm sm:text-base ${
                currentStep >= 2
                  ? "bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white"
                  : "bg-white/10 text-gray-400 backdrop-blur-sm"
              }`}
            >
              2
            </div>
            <span className="text-xs sm:text-sm font-medium text-center">
              Check-out
            </span>
          </div>

          {/* Connector 2 */}
          <div
            className={`flex-1 h-1 mx-2 sm:mx-4 ${
              currentStep >= 3 ? "bg-[#FA812F]" : "bg-white/20"
            }`}
          ></div>

          {/* Step 3: Under Review */}
          <div
            className={`flex flex-col items-center ${
              currentStep >= 3 ? "text-white" : "text-gray-500"
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-2 text-sm sm:text-base ${
                currentStep >= 3
                  ? "bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white"
                  : "bg-white/10 text-gray-400 backdrop-blur-sm"
              }`}
            >
              3
            </div>
            <span className="text-xs sm:text-sm font-medium text-center">
              Under Review
            </span>
          </div>

          {/* Connector 3 */}
          <div
            className={`flex-1 h-1 mx-2 sm:mx-4 ${
              currentStep >= 4 ? "bg-[#FA812F]" : "bg-white/20"
            }`}
          ></div>

          {/* Step 4: Payment */}
          <div
            className={`flex flex-col items-center ${
              currentStep >= 4 ? "text-white" : "text-gray-500"
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-2 text-sm sm:text-base ${
                currentStep >= 4
                  ? "bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white"
                  : "bg-white/10 text-gray-400 backdrop-blur-sm"
              }`}
            >
              4
            </div>
            <span className="text-xs sm:text-sm font-medium text-center">
              Payment
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render step content
  const renderStep = () => {
    const commonProps = {
      currentStep,
      setCurrentStep,
      selectedFiles,
      setSelectedFiles,
      affiliateCode,
      setAffiliateCode,
      isDragging,
      setIsDragging,
      paymentProof,
      setPaymentProof,
      isProcessingFile,
      setIsProcessingFile,
      materials,
      loadingMaterials,
      pricingConfig,
      userAffiliate,
      setUserAffiliate,
      affiliateValidation,
      setAffiliateValidation,
      isValidatingAffiliate,
      setIsValidatingAffiliate,
      affiliateInput,
      setAffiliateInput,
      paymentType,
      setPaymentType,
      uploadProgress,
      setUploadProgress,
      currentlyProcessing,
      setCurrentlyProcessing,
      orderStatus,
      setOrderStatus,
      orderNumber,
      setOrderNumber,
      orderData,
      setOrderData,
      orderId,
      setOrderId,
      paymentStep,
      setPaymentStep,
      isProcessingPayment,
      setIsProcessingPayment,
      discountCode,
      setDiscountCode,
      getUserType,
      isCompanyUser,
      findMaterialById,
      showMessage,
      formatCurrency,
      formatFileSize,
      getTotalPrice,
      handleBackToStep1,
      calculateFilePricing,
      loadMaterials,
      loadPricingConfig,
      fetchUserAffiliateData,
    };

    switch (currentStep) {
      case 1:
        return <ProcessingStep {...commonProps} />;
      case 2:
        return <CheckoutStep {...commonProps} />;
      case 3:
        return <ReviewStep {...commonProps} />;
      case 4:
        return <PaymentStep {...commonProps} />;
      default:
        return <ProcessingStep {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] pt-25 pb-20 sm:pb-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Progress Stepper */}
        <ProgressStepper currentStep={currentStep} />

        {/* Render Step Content */}
        {renderStep()}
      </div>
    </div>
  );
};

export default PrintingService;