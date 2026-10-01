// frontend/src/pages/user/PaymentStep.jsx
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import paymentService from "../../services/paymentService";
import orderService from "../../services/orderService";
import bankService from "../../services/bankService";

const PaymentStep = ({
  currentStep,
  setCurrentStep,
  selectedFiles,
  setSelectedFiles,
  paymentProof,
  setPaymentProof,
  orderStatus,
  setOrderStatus,
  orderNumber,
  setOrderNumber,
  orderData,
  setOrderData,
  orderId,
  setOrderId,
  isProcessingPayment,
  setIsProcessingPayment,
  showMessage,
  formatCurrency,
  formatFileSize,
  getTotalPrice,
  handleBackToStep1,
  getUserType,
  isCompanyUser,
}) => {
  const navigate = useNavigate();
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // State untuk modal alert
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: "success", // success, error, warning, info
    title: "",
    message: "",
    orderNumber: "",
    amount: 0,
    onConfirm: null,
  });

  // Ref untuk tracking interval dan status checker
  const intervalRef = useRef(null);
  const hasInitializedRef = useRef(false);

  const loadOrderFromStorage = useCallback(() => {
    // ✅ ENHANCED: Gunakan authService untuk load dengan validation
    const validatedOrderData = authService.validateAndCleanOrderData();

    if (validatedOrderData) {
      console.log(
        "🔄 PaymentStep: Loading validated order data for current user:",
        {
          orderNumber: validatedOrderData.orderNumber,
          filesCount: validatedOrderData.selectedFiles?.length || 0,
          totalAmount: validatedOrderData.totalAmount,
          step: validatedOrderData.step,
        }
      );
      return validatedOrderData;
    }

    console.log("📭 No valid order data found for current user in PaymentStep");
    return null;
  }, []);

  const calculateTotalFromFiles = useCallback(() => {
    if (selectedFiles.length > 0) {
      const total = selectedFiles.reduce((total, file) => {
        const pricing = file.pricing || {};
        return total + (pricing.totalPrice || pricing.finalPrice || 0);
      }, 0);
      console.log("💰 Calculated total from files:", total);
      return total;
    }

    // Coba dari orderData jika ada
    if (orderData?.total_amount) {
      console.log("💰 Using total from orderData:", orderData.total_amount);
      return orderData.total_amount;
    }

    // Coba dari localStorage
    const savedOrder = loadOrderFromStorage();
    if (savedOrder?.totalAmount) {
      console.log("💰 Using total from localStorage:", savedOrder.totalAmount);
      return savedOrder.totalAmount;
    }

    // Fallback ke 0
    console.log("💰 Fallback to 0");
    return 0;
  }, [selectedFiles, orderData, loadOrderFromStorage]);
  
  // ✅ PERBAIKAN: displayTotal dengan fallback
  const displayTotal = useMemo(() => {
    // Coba gunakan getTotalPrice dulu, jika tidak work gunakan fallback
    try {
      const price = getTotalPrice();
      if (price > 0) {
        console.log("💰 Using getTotalPrice:", price);
        return price;
      }
    } catch (error) {
      console.log("🔄 getTotalPrice failed, using fallback calculation");
    }

    return calculateTotalFromFiles();
  }, [getTotalPrice, calculateTotalFromFiles]);

  // PaymentStep.jsx - Enhanced checkOrderStatus function
  const checkOrderStatus = useCallback(async () => {
    if (!orderId || currentStep !== 4) return;

    try {
      console.log("🔍 Checking order status for:", orderId);
      const response = await orderService.getOrderDetail(orderId);

      if (response.success && response.data) {
        const currentOrder = response.data.order;
        const orderItems = response.data.items;

        // ✅ PERBAIKAN: Check jika data benar-benar berubah sebelum update state
        const isStatusChanged = currentOrder.order_status !== orderStatus;
        const isOrderDataChanged =
          !orderData ||
          JSON.stringify({
            total_amount: orderData.total_amount,
            item_count: orderData.item_count,
            customer_name: orderData.customer_name,
            admin_notes: orderData.admin_notes,
            estimated_completion_date: orderData.estimated_completion_date,
          }) !==
            JSON.stringify({
              total_amount: currentOrder.total_amount,
              item_count: currentOrder.item_count,
              customer_name: currentOrder.customer_name,
              admin_notes: currentOrder.admin_notes,
              estimated_completion_date: currentOrder.estimated_completion_date,
            });

        // ✅ UPDATE STATE HANYA JIKA ADA PERUBAHAN STATUS
        if (isStatusChanged) {
          console.log(
            `🔄 Status changed: ${orderStatus} → ${currentOrder.order_status}`
          );

          setOrderStatus(currentOrder.order_status);

          // ✅ UPDATE ORDER ITEMS DENGAN DATA LENGKAP
          if (orderItems && orderItems.length > 0) {
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

          // ✅ ENHANCED: Save updated status menggunakan authService
          authService.saveOrderData({
            orderId: orderId,
            orderNumber: orderNumber,
            orderStatus: currentOrder.order_status,
            orderData: currentOrder,
            selectedFiles:
              orderItems && orderItems.length > 0
                ? simulatedFiles
                : selectedFiles,
            step: 4,
            timestamp: new Date().toISOString(),
          });

          // Show modal alert untuk status changes
          if (currentOrder.order_status === "printing") {
            showAlertModal(
              "success",
              "Pembayaran Terverifikasi! 🎉",
              `Order #${orderNumber} sedang diproses.`,
              orderNumber,
              displayTotal
            );
          } else if (currentOrder.order_status === "final_touchup") {
            showAlertModal(
              "info",
              "Progress Order",
              `Order #${orderNumber} sedang dalam proses finishing.`,
              orderNumber
            );
          } else if (currentOrder.order_status === "ready_to_ship") {
            showAlertModal(
              "success",
              "Order Siap Dikirim!",
              `Order #${orderNumber} siap dikirim!`,
              orderNumber
            );
          } else if (currentOrder.order_status === "completed") {
            showAlertModal(
              "success",
              "Order Selesai! 🎉",
              `Order #${orderNumber} telah selesai! Terima kasih telah menggunakan layanan kami.`,
              orderNumber,
              displayTotal
            );
          } else if (currentOrder.order_status === "cancelled") {
            showAlertModal(
              "error",
              "Order Dibatalkan",
              `Order #${orderNumber} telah dibatalkan.${
                currentOrder.admin_notes
                  ? `\nAlasan: ${currentOrder.admin_notes}`
                  : ""
              }`,
              orderNumber
            );
          }
        } else if (isOrderDataChanged) {
          // ✅ UPDATE DATA ORDER HANYA JIKA ADA PERUBAHAN DATA (tanpa status change)
          console.log("📊 Order data updated (no status change)");
          setOrderData(currentOrder);
        } else {
          // ✅ TIDAK ADA PERUBAHAN - skip update untuk hindari re-render
          console.log("⏭️  No changes detected, skipping state update");
        }
      }
    } catch (error) {
      console.error("❌ Error checking order status:", error);
    }
  }, [
    orderId,
    currentStep,
    orderStatus,
    orderNumber,
    displayTotal,
    setOrderStatus,
    setOrderData,
    setSelectedFiles,
    orderData,
    selectedFiles,
  ]);

  // ✅ PERBAIKAN: Load data dari localStorage dengan user validation
  useEffect(() => {
    if (hasInitializedRef.current) return;

    const loadData = () => {
      const savedOrderData = loadOrderFromStorage();

      if (savedOrderData) {
        console.log("📦 PaymentStep: Initializing with saved data:", {
          orderNumber: savedOrderData.orderNumber,
          orderStatus: savedOrderData.orderStatus,
          orderId: savedOrderData.orderId,
          filesCount: savedOrderData.selectedFiles?.length,
          totalAmount: savedOrderData.totalAmount,
        });

        // ✅ UPDATE SEMUA STATE YANG DIPERLUKAN DARI LOCALSTORAGE
        if (savedOrderData.orderNumber && !orderNumber) {
          setOrderNumber(savedOrderData.orderNumber);
        }
        if (savedOrderData.orderStatus && !orderStatus) {
          setOrderStatus(savedOrderData.orderStatus);
        }
        if (savedOrderData.orderId && !orderId) {
          setOrderId(savedOrderData.orderId);
        }
        // ✅ PERBAIKAN KRITIS: Load selectedFiles dari localStorage
        if (
          savedOrderData.selectedFiles &&
          savedOrderData.selectedFiles.length > 0
        ) {
          console.log(
            "📁 Loading files from storage:",
            savedOrderData.selectedFiles.length,
            "files"
          );
          setSelectedFiles(savedOrderData.selectedFiles);
        }
        // ✅ Load orderData jika ada
        if (savedOrderData.orderData && !orderData) {
          setOrderData(savedOrderData.orderData);
        }
      } else {
        console.log("📭 No order data found in storage for current user");
      }

      hasInitializedRef.current = true;
    };

    // Delay sedikit untuk memastikan user context sudah loaded
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [loadOrderFromStorage]); // ✅ Hanya depend on loadOrderFromStorage

  // ✅ PERBAIKAN: Effect untuk sync data ketika localStorage berubah
  useEffect(() => {
    const handleStorageChange = () => {
      const savedOrderData = loadOrderFromStorage();
      if (savedOrderData) {
        // Update selectedFiles jika ada perubahan
        if (
          savedOrderData.selectedFiles &&
          savedOrderData.selectedFiles.length > 0
        ) {
          if (
            JSON.stringify(selectedFiles) !==
            JSON.stringify(savedOrderData.selectedFiles)
          ) {
            console.log("🔄 Syncing files from storage change");
            setSelectedFiles(savedOrderData.selectedFiles);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [loadOrderFromStorage, selectedFiles, setSelectedFiles]);

  // Fetch bank accounts data - HANYA SEKALI
  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setLoadingBanks(true);
      console.log("🟢 Fetching bank accounts...");
      const response = await bankService.getAllBanks();

      if (response.success && response.data && response.data.length > 0) {
        console.log("🟢 Bank accounts loaded:", response.data);
        setBankAccounts(response.data);

        // Set bank pertama sebagai default
        const firstBank = response.data[0];
        setBankDetails({
          bankName: firstBank.bank_name,
          accountNumber: firstBank.account_number,
          accountHolder: firstBank.account_holder,
        });
        setSelectedBankId(firstBank.id);
      } else {
        console.log("🟡 No bank accounts found, using default");
        // Fallback ke data default jika tidak ada bank di database
        setBankDetails({
          bankName: "BCA",
          accountNumber: "1234567890",
          accountHolder: "PT. 3D Printing Service",
        });
      }
    } catch (error) {
      console.error("🔴 Error fetching bank accounts:", error);
      // Fallback ke data default jika error
      setBankDetails({
        bankName: "BCA",
        accountNumber: "1234567890",
        accountHolder: "PT. 3D Printing Service",
      });
    } finally {
      setLoadingBanks(false);
    }
  };

  // Handle bank selection
  const handleBankSelect = (bankId) => {
    const selectedBank = bankAccounts.find((bank) => bank.id === bankId);
    if (selectedBank) {
      setSelectedBankId(bankId);
      setBankDetails({
        bankName: selectedBank.bank_name,
        accountNumber: selectedBank.account_number,
        accountHolder: selectedBank.account_holder,
      });
    }
  };

  // Fungsi untuk menampilkan modal alert
  const showAlertModal = (
    type,
    title,
    message,
    orderNumber = "",
    amount = 0,
    onConfirm = null
  ) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message,
      orderNumber,
      amount,
      onConfirm,
    });
  };

  // Fungsi untuk menutup modal alert
  const closeAlertModal = useCallback(() => {
    setAlertModal({
      isOpen: false,
      type: "success",
      title: "",
      message: "",
      orderNumber: "",
      amount: 0,
      onConfirm: null,
    });
  }, []);

  // ✅ PERBAIKAN: Function untuk calculate total dari files

  // ✅ PERBAIKAN: Single useEffect untuk status checking dengan dependencies yang tepat
  useEffect(() => {
    // Hanya jalankan jika di step 4 dan ada orderId
    if (currentStep !== 4 || !orderId) {
      // Cleanup jika tidak memenuhi kondisi
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Hanya jalankan untuk status yang memerlukan real-time checking
    const shouldCheckStatus = [
      "payment_received",
      "printing",
      "final_touchup",
      "ready_to_ship",
      "completed",
      "cancelled",
    ].includes(orderStatus);

    if (!shouldCheckStatus) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log("🔄 Starting real-time status checker for order:", orderId);

    // Check immediately
    checkOrderStatus();

    // Setup interval untuk periodic checking
    intervalRef.current = setInterval(checkOrderStatus, 45000); // 45 detik

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("🛑 Stopped status checker");
      }
    };
  }, [currentStep, orderId, orderStatus, checkOrderStatus]);

  // Handle payment proof upload
  const handlePaymentProofUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showAlertModal(
          "error",
          "File Terlalu Besar",
          "File bukti transfer terlalu besar. Maksimal 5MB."
        );
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        showAlertModal(
          "error",
          "Format Tidak Didukung",
          "Format file tidak didukung. Gunakan JPG, PNG, atau PDF."
        );
        return;
      }

      setPaymentProof({
        file,
        name: file.name,
        size: file.size,
        uploadTime: new Date().toLocaleTimeString(),
        url: URL.createObjectURL(file),
      });
    }
  };

  // Handle remove payment proof
  const handleRemovePaymentProof = useCallback(() => {
    if (paymentProof && paymentProof.url) {
      URL.revokeObjectURL(paymentProof.url);
    }
    setPaymentProof(null);
  }, [paymentProof, setPaymentProof]);

  const handleConfirmPayment = async () => {
    if (!paymentProof) {
      showAlertModal(
        "warning",
        "Bukti Pembayaran Diperlukan",
        "Please upload payment proof first"
      );
      return;
    }

    // ✅ PERBAIKAN: Gunakan displayTotal yang sudah dihitung dengan benar
    const totalAmount = displayTotal;
    const originalAmount = orderData?.original_amount || displayTotal;

    // Hitung discount amount
    const discountAmount = originalAmount ? originalAmount - totalAmount : 0;

    console.log("💰 Payment calculation:", {
      totalAmount,
      originalAmount,
      discountAmount,
      orderId,
      orderNumber,
      filesCount: selectedFiles.length,
    });

    // ✅ FALLBACK MECHANISM: Jika orderId null
    let finalOrderId = orderId;
    if (!finalOrderId) {
      if (orderData?.id) {
        finalOrderId = orderData.id;
        setOrderId(finalOrderId);
      } else if (orderData?.orderId) {
        finalOrderId = orderData.orderId;
        setOrderId(finalOrderId);
      } else {
        // Coba ambil dari API berdasarkan orderNumber
        try {
          const orderResponse = await orderService.getOrderByNumber(
            orderNumber
          );
          if (orderResponse.success && orderResponse.data) {
            finalOrderId = orderResponse.data.order.id;
            setOrderId(finalOrderId);
          }
        } catch (error) {
          console.error("❌ Failed to fetch orderId from API:", error);
        }
      }
    }

    if (!finalOrderId) {
      showAlertModal(
        "error",
        "Order ID Tidak Ditemukan",
        "Order ID tidak ditemukan. Silakan buat order kembali."
      );
      return;
    }

    try {
      setIsProcessingPayment(true);

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        showAlertModal(
          "error",
          "User Tidak Ditemukan",
          "User tidak ditemukan. Silakan login kembali."
        );
        return;
      }

      console.log("💰 Processing payment confirmation...");
      console.log("📦 Payment details:", {
        orderId: finalOrderId,
        orderNumber,
        totalAmount,
        discountAmount,
        originalAmount,
        paymentProof: paymentProof.name,
        bankDetails,
        filesCount: selectedFiles.length,
      });

      // Data untuk upload payment proof
      const paymentData = {
        orderId: finalOrderId,
        amount: totalAmount,
        discountAmount: discountAmount,
        originalAmount: originalAmount,
        paymentProof: paymentProof.file,
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountHolder: bankDetails.accountHolder,
      };

      console.log("💰 Uploading payment proof with data:", paymentData);
      const paymentResponse = await paymentService.uploadPaymentProof(
        paymentData
      );

      if (paymentResponse.success) {
        console.log(
          "✅ Payment proof uploaded successfully:",
          paymentResponse.data
        );

        // Update order status setelah upload payment proof
        setOrderStatus("payment_received");
        setOrderData((prev) => ({
          ...prev,
          ...paymentResponse.data,
        }));

        // ✅ ENHANCED: Simpan menggunakan authService dengan user context
        authService.saveOrderData({
          orderId: finalOrderId,
          orderNumber: orderNumber,
          orderStatus: "payment_received",
          selectedFiles: selectedFiles,
          totalAmount: totalAmount,
          orderData: {
            ...orderData,
            ...paymentResponse.data,
          },
          step: 4,
          timestamp: new Date().toISOString(),
        });

        // Tampilkan modal alert sukses
        showAlertModal(
          "success",
          "Bukti Pembayaran Berhasil!",
          `No. Order: ${orderNumber}\nAmount: ${formatCurrency(
            totalAmount
          )}\nStatus: Menunggu Verifikasi Admin\nPembayaran akan dikonfirmasi dalam 1-2 jam kerja.`,
          orderNumber,
          totalAmount
        );

        console.log("💾 Order state saved with user context for persistence");
      } else {
        throw new Error(paymentResponse.message);
      }
    } catch (error) {
      console.error("❌ Error confirming payment:", error);

      // ✅ TAMPILKAN ERROR YANG LEBIH DETAIL
      if (error.message.includes("Pembayaran harus sebesar")) {
        showAlertModal(
          "error",
          "Jumlah Pembayaran Tidak Sesuai",
          `${error.message}\n\nSilakan transfer sesuai jumlah yang tertera.`
        );
      } else if (
        error.message.includes("network") ||
        error.message.includes("Network")
      ) {
        showAlertModal(
          "error",
          "Koneksi Terputus",
          "Terjadi masalah koneksi internet. Silakan coba lagi."
        );
      } else if (error.message.includes("timeout")) {
        showAlertModal(
          "error",
          "Timeout",
          "Proses upload terlalu lama. Silakan coba lagi dengan file yang lebih kecil."
        );
      } else {
        showAlertModal(
          "error",
          "Terjadi Kesalahan",
          "Terjadi kesalahan: " + error.message
        );
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ✅ COMPONENT: Bank Selection Dropdown
  const BankSelection = () => {
    if (bankAccounts.length === 0) {
      return (
        <div className="text-sm text-gray-300">
          {loadingBanks
            ? "Memuat data bank..."
            : "Tidak ada data bank tersedia"}
        </div>
      );
    }

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Pilih Bank Tujuan:
        </label>
        <select
          value={selectedBankId || ""}
          onChange={(e) => handleBankSelect(parseInt(e.target.value))}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FA812F] focus:border-transparent"
        >
          {bankAccounts.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.bank_name} - {bank.account_number} - {bank.account_holder}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // ✅ PERBAIKAN: Progress Timeline Component
  const ProgressTimeline = () => {
    const getSteps = () => {
      if (getUserType() === "company") {
        return [
          {
            key: "confirmed",
            label: "Order",
            subLabel: "Confirmed",
            status: "completed",
          },
          {
            key: "printing",
            label: "Printing",
            status: [
              "printing",
              "final_touchup",
              "ready_to_ship",
              "completed",
            ].includes(orderStatus)
              ? "completed"
              : orderStatus === "confirmed"
              ? "current"
              : "pending",
          },
          {
            key: "finishing",
            label: "Finishing",
            status: ["final_touchup", "ready_to_ship", "completed"].includes(
              orderStatus
            )
              ? "completed"
              : orderStatus === "printing"
              ? "current"
              : "pending",
          },
          {
            key: "shipping",
            label: "Shipping",
            status: ["ready_to_ship", "completed"].includes(orderStatus)
              ? "completed"
              : orderStatus === "final_touchup"
              ? "current"
              : "pending",
          },
          {
            key: "completed",
            label: "Completed",
            status: orderStatus === "completed" ? "completed" : "pending",
          },
        ];
      } else {
        return [
          {
            key: "payment",
            label: "Payment",
            subLabel: "Confirmed",
            status: [
              "payment_received",
              "printing",
              "final_touchup",
              "ready_to_ship",
              "completed",
            ].includes(orderStatus)
              ? "completed"
              : orderStatus === "waiting_payment"
              ? "current"
              : "pending",
          },
          {
            key: "printing",
            label: "Printing",
            status: [
              "printing",
              "final_touchup",
              "ready_to_ship",
              "completed",
            ].includes(orderStatus)
              ? "completed"
              : orderStatus === "payment_received"
              ? "current"
              : "pending",
          },
          {
            key: "finishing",
            label: "Finishing",
            status: ["final_touchup", "ready_to_ship", "completed"].includes(
              orderStatus
            )
              ? "completed"
              : orderStatus === "printing"
              ? "current"
              : "pending",
          },
          {
            key: "shipping",
            label: "Shipping",
            status: ["ready_to_ship", "completed"].includes(orderStatus)
              ? "completed"
              : orderStatus === "final_touchup"
              ? "current"
              : "pending",
          },
          {
            key: "completed",
            label: "Completed",
            status: orderStatus === "completed" ? "completed" : "pending",
          },
        ];
      }
    };

    const steps = getSteps();

    return (
      <div className="mb-6 bg-white/5 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-4 text-sm text-center">
          Progress Order
        </h4>

        <div className="flex justify-between items-center mb-2 px-2">
          {steps.map((step, index) => (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  step.status === "completed"
                    ? "bg-green-500"
                    : step.status === "current"
                    ? "bg-[#FA812F]"
                    : "bg-gray-600"
                }`}
              >
                {step.status === "completed" ? (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="text-white text-xs font-medium">
                    {index + 1}
                  </span>
                )}
              </div>

              <div className="text-center">
                <div
                  className={`text-xs font-medium ${
                    step.status === "completed" || step.status === "current"
                      ? "text-white"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </div>
                {step.subLabel && (
                  <div className="text-xs text-gray-400">{step.subLabel}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ✅ COMPONENT: Alert Modal
  const AlertModal = () => {
    if (!alertModal.isOpen) return null;

    const getIcon = () => {
      switch (alertModal.type) {
        case "success":
          return (
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-full h-full bg-green-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          );
        case "error":
          return (
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-full h-full bg-red-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-400"
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
          );
        case "warning":
          return (
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-full h-full bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.464-.833-2.232 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
          );
        case "info":
          return (
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-full h-full bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    const getButtonColor = () => {
      switch (alertModal.type) {
        case "success":
          return "bg-gradient-to-r from-[#F25912] to-[#FA812F]";
        case "error":
          return "bg-red-600 hover:bg-red-700";
        case "warning":
          return "bg-yellow-600 hover:bg-yellow-700";
        case "info":
          return "bg-blue-600 hover:bg-blue-700";
        default:
          return "bg-gradient-to-r from-[#F25912] to-[#FA812F]";
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto">
          <div className="text-center">
            {getIcon()}

            <h3 className="text-xl font-bold text-white mb-2">
              {alertModal.title}
            </h3>

            {alertModal.orderNumber && (
              <p className="text-gray-300 text-sm mb-2">
                No. Order:{" "}
                <span className="font-semibold text-white">
                  {alertModal.orderNumber}
                </span>
              </p>
            )}

            {alertModal.amount > 0 && (
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">Total Amount:</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(alertModal.amount)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {alertModal.onConfirm ? (
                <>
                  <button
                    onClick={alertModal.onConfirm}
                    className={`w-full px-6 py-3 ${getButtonColor()} text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300`}
                  >
                    Konfirmasi
                  </button>
                  <button
                    onClick={closeAlertModal}
                    className="w-full px-6 py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300"
                  >
                    Batal
                  </button>
                </>
              ) : (
                <button
                  onClick={closeAlertModal}
                  className={`w-full px-6 py-3 ${getButtonColor()} text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300`}
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ PERBAIKAN: PaymentUploadStep dengan data yang reliable
  const PaymentUploadStep = () => {
    const fileCount = selectedFiles.length;

    console.log("📊 PaymentUploadStep rendering with:", {
      fileCount,
      displayTotal,
      orderNumber,
      orderStatus,
    });

    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Upload Bukti Pembayaran
          </h2>
          <p className="text-gray-300 text-sm sm:text-base">
            Silakan upload bukti transfer untuk order #{orderNumber}
          </p>
        </div>

        {/* Grid Layout Kiri-Kanan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KOLOM KIRI: Ringkasan & Transfer */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">
                Ringkasan Order
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Nomor Order:</span>
                  <span className="font-medium text-white">{orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Jumlah File:</span>
                  <span className="font-medium text-white">
                    {fileCount} file{fileCount > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Pembayaran:</span>
                  <span className="font-medium text-[#FA812F]">
                    {formatCurrency(displayTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Status Pembayaran:</span>
                  <span className="font-medium text-yellow-400">
                    Menunggu Pembayaran
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Transfer Details */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6">
              <h4 className="font-medium text-white mb-3 text-sm">
                Transfer ke:
              </h4>

              <BankSelection />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Bank:</span>
                  <span className="text-white">{bankDetails.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">No. Rekening:</span>
                  <span className="text-white font-mono">
                    {bankDetails.accountNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Atas Nama:</span>
                  <span className="text-white">
                    {bankDetails.accountHolder}
                  </span>
                </div>
                <div className="flex justify-between font-bold mt-3 pt-3 border-t border-white/10">
                  <span className="text-gray-300">Total Transfer:</span>
                  <span className="text-[#FA812F]">
                    {formatCurrency(displayTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Petunjuk Upload */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
              <h4 className="font-medium text-white mb-3 text-sm">
                Petunjuk Upload:
              </h4>
              <ul className="text-xs text-gray-300 space-y-2">
                <li className="flex items-start">
                  <svg
                    className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Pastikan bukti transfer jelas terbaca
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Transfer sesuai jumlah:{" "}
                  <strong className="text-white ml-1">
                    {formatCurrency(displayTotal)}
                  </strong>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Tampilkan nama pengirim, jumlah, dan tanggal transfer
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Proses verifikasi membutuhkan 1-2 jam kerja
                </li>
              </ul>
            </div>
          </div>

          {/* KOLOM KANAN: Upload Bukti Pembayaran */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6">
            <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">
              Upload Bukti Transfer
            </h3>

            {!paymentProof ? (
              <div
                className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer transition-all duration-300 hover:border-white/30 hover:bg-white/5"
                onClick={() =>
                  document.getElementById("payment-proof-input").click()
                }
              >
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-white font-medium mb-2">
                  Upload Bukti Transfer
                </p>
                <p className="text-gray-400 text-xs mb-4">
                  Format: JPG, PNG, PDF (max 5MB)
                </p>
                <button className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300">
                  Choose File
                </button>
              </div>
            ) : (
              <div className="border border-white/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-400/20 rounded-full flex items-center justify-center">
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {paymentProof.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {formatFileSize(paymentProof.size)} • Uploaded at{" "}
                        {paymentProof.uploadTime}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemovePaymentProof}
                    className="text-red-400 hover:text-red-300 p-1 transition-colors"
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
                </div>

                {paymentProof.file.type.startsWith("image/") && (
                  <div className="mt-4 flex justify-center">
                    <img
                      src={paymentProof.url}
                      alt="Payment Proof"
                      className="max-w-full h-auto max-h-48 rounded-lg border border-white/10"
                    />
                  </div>
                )}

                {paymentProof.file.type === "application/pdf" && (
                  <div className="mt-4 flex justify-center">
                    <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
                      <svg
                        className="w-12 h-12 text-red-400 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-white text-sm text-center">
                        PDF Document
                      </p>
                      <p className="text-gray-400 text-xs text-center">
                        {paymentProof.name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() =>
                      document.getElementById("payment-proof-input").click()
                    }
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Ganti File
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    disabled={
                      isProcessingPayment || orderStatus === "payment_received"
                    }
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all duration-300 ${
                      !isProcessingPayment && orderStatus !== "payment_received"
                        ? "bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white hover:shadow-lg"
                        : "bg-gray-600 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {isProcessingPayment ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </div>
                    ) : orderStatus === "payment_received" ? (
                      "Menunggu Verifikasi"
                    ) : (
                      "Konfirmasi Pembayaran"
                    )}
                  </button>
                </div>
              </div>
            )}

            <input
              id="payment-proof-input"
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handlePaymentProofUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
          <button
            onClick={() => setCurrentStep(3)}
            className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
          >
            Kembali ke Status Order
          </button>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/orders")}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all duration-300 text-sm sm:text-base"
            >
              Lihat Order Saya
            </button>

            <button
              onClick={handleBackToStep1}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all duration-300 text-sm sm:text-base"
            >
              Print File Baru
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ COMPONENT: COMPLETED ORDER
  const CompletedOrderStep = () => {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
        <div className="text-center">
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
            Order Selesai!
          </h2>

          <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
            Terima kasih telah menggunakan layanan 3D printing kami. Order Anda
            telah selesai diproses dan dikirim.
          </p>

          {/* Order Details */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">
              Detail Order
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Nomor Order:</span>
                <span className="font-medium text-white">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Jumlah File:</span>
                <span className="font-medium text-white">
                  {selectedFiles.length} file
                  {selectedFiles.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Amount:</span>
                <span className="font-medium text-white">
                  {formatCurrency(displayTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Status Order:</span>
                <span className="font-medium text-green-400">Selesai</span>
              </div>
            </div>
          </div>

          <ProgressTimeline />

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => navigate("/orders")}
              className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
            >
              Lihat Order Lainnya
            </button>
            <button
              onClick={handleBackToStep1}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
            >
              Print Lagi
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ COMPONENT: CANCELLED ORDER
  const CancelledOrderStep = () => {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
        <div className="text-center">
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
            Order Dibatalkan
          </h2>

          <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
            Maaf, order Anda telah dibatalkan. Silakan hubungi customer service
            untuk informasi lebih lanjut.
          </p>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">
              Detail Order
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Nomor Order:</span>
                <span className="font-medium text-white">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Jumlah File:</span>
                <span className="font-medium text-white">
                  {selectedFiles.length} file
                  {selectedFiles.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Amount:</span>
                <span className="font-medium text-white">
                  {formatCurrency(displayTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Status Order:</span>
                <span className="font-medium text-red-400">Dibatalkan</span>
              </div>

              {orderData?.admin_notes && (
                <div className="pt-3 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Alasan Pembatalan:</span>
                    <span className="font-medium text-red-300 text-right max-w-xs">
                      {orderData.admin_notes}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => navigate("/orders")}
              className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
            >
              Lihat Order Lainnya
            </button>
            <button
              onClick={handleBackToStep1}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
            >
              Buat Order Baru
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ PERBAIKAN: Render content berdasarkan status
  const renderContent = () => {
    // Tampilkan cancelled order pertama
    if (orderStatus === "cancelled") {
      return <CancelledOrderStep />;
    }

    // Tampilkan completed order
    if (orderStatus === "completed") {
      return <CompletedOrderStep />;
    }

    if (getUserType() === "company") {
      // Tampilan untuk company user
      return (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 bg-purple-400/20 border border-purple-400/30">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400"
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
              Order Perusahaan Dikonfirmasi!
            </h2>

            <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
              Order perusahaan Anda telah berhasil dibuat dan sedang dalam
              proses. Tidak diperlukan tindakan pembayaran - order akan diproses
              melalui sistem billing perusahaan.
            </p>

            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6">
              <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">
                Detail Order
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Nomor Order:</span>
                  <span className="font-medium text-white">{orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">File:</span>
                  <span className="font-medium text-white">
                    {selectedFiles.length} file
                    {selectedFiles.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Amount:</span>
                  <span className="font-medium text-purple-400">
                    {formatCurrency(displayTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Metode Billing:</span>
                  <span className="font-medium text-green-400">
                    Billing Internal
                  </span>
                </div>
              </div>
            </div>

            <ProgressTimeline />

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={() => navigate("/orders")}
                className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
              >
                Lihat Riwayat Order
              </button>
              <button
                onClick={handleBackToStep1}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
              >
                Print File Lainnya
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      // Tampilan untuk individual user
      return (
        <>
          {orderStatus === "waiting_payment" && <PaymentUploadStep />}

          {(orderStatus === "payment_received" ||
            orderStatus === "printing" ||
            orderStatus === "final_touchup" ||
            orderStatus === "ready_to_ship") && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
              <div className="text-center">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  {orderStatus === "payment_received"
                    ? "Menunggu Verifikasi Pembayaran"
                    : orderStatus === "printing"
                    ? "Pembayaran Terkonfirmasi - Sedang Diproses!"
                    : orderStatus === "final_touchup"
                    ? "Sedang dalam Proses Finishing!"
                    : "Siap Dikirim!"}
                </h2>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6">
                  <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">
                    Detail Order
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Nomor Order:</span>
                      <span className="font-medium text-white">
                        {orderNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Jumlah File:</span>
                      <span className="font-medium text-white">
                        {selectedFiles.length} file
                        {selectedFiles.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Amount:</span>
                      <span className="font-medium text-white">
                        {formatCurrency(displayTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Status Order:</span>
                      <span className="font-medium text-blue-400">
                        {orderStatus === "payment_received"
                          ? "Menunggu Verifikasi"
                          : orderStatus === "printing"
                          ? "Sedang Printing"
                          : orderStatus === "final_touchup"
                          ? "Final Touchup"
                          : "Siap Dikirim"}
                      </span>
                    </div>
                  </div>
                </div>

                <ProgressTimeline />

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <button
                    onClick={() => navigate("/orders")}
                    className="px-4 py-2 sm:px-6 sm:py-3 border border-white/20 rounded-lg font-medium text-gray-300 hover:bg-white/10 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm"
                  >
                    Lihat Detail Order
                  </button>
                  <button
                    onClick={handleBackToStep1}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
                  >
                    Print File Lainnya
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
  };

  // ✅ PERBAIKAN: Debug info untuk development
  useEffect(() => {
    console.log("🔍 PaymentStep State Debug:", {
      selectedFiles: {
        count: selectedFiles.length,
        files: selectedFiles.map((f) => ({
          name: f.name,
          price: f.pricing?.totalPrice,
        })),
      },
      displayTotal,
      orderNumber,
      orderStatus,
      orderId,
      fromStorage: loadOrderFromStorage(),
    });
  }, [
    selectedFiles,
    displayTotal,
    orderNumber,
    orderStatus,
    orderId,
    loadOrderFromStorage,
  ]);

  return (
    <>
      {renderContent()}
      <AlertModal />
    </>
  );
};

export default PaymentStep;
