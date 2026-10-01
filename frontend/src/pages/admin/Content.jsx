import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Save,
  Upload,
  Plus,
  Trash2,
  Edit,
  Eye,
  Image,
  Settings,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import homeService from "../../services/homeService";
import contactService from "../../services/contactService";
import bankService from "../../services/bankService";
import popupService from "../../services/popupService";

const Content = () => {
  // State untuk data dari database
  const [heroSlides, setHeroSlides] = useState([]);
  const [contactInfo, setContactInfo] = useState([]);
  const [siteStats, setSiteStats] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [popupSettings, setPopupSettings] = useState({
    interval_minutes: 120,
    is_active: true,
    delay_seconds: 5,
    show_only_with_discount: true,
  });
  const [activeTab, setActiveTab] = useState("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploads, setImageUploads] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch data dari database
  const fetchData = useCallback(async () => {
    try {
      const [
        slidesResponse,
        contactResponse,
        homeContentResponse,
        banksResponse,
        popupResponse,
      ] = await Promise.all([
        homeService.getAllSlides(),
        contactService.getContactInfo(),
        homeService.getHomeContent(),
        bankService.getAllBanks(),
        popupService.getPopupSettings().catch(() => ({
          success: true,
          data: {
            interval_minutes: 120,
            is_active: true,
            delay_seconds: 5,
            show_only_with_discount: true,
          },
        })),
      ]);

      if (slidesResponse.success) {
        setHeroSlides(slidesResponse.data);
      }

      if (contactResponse.success) {
        setContactInfo(contactResponse.data);
      }

      if (homeContentResponse.success) {
        setSiteStats(homeContentResponse.data.siteStats || []);
      }

      if (banksResponse.success) {
        setBankAccounts(banksResponse.data);
      }

      if (popupResponse.success && popupResponse.data) {
        setPopupSettings(popupResponse.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Gagal memuat data dari server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler untuk hero slides
  const handleAddSlide = useCallback(() => {
    const newSlide = {
      id: `temp-${Date.now()}`,
      title: "Judul Slide Baru",
      subtitle: "Deskripsi slide baru",
      background_image: "",
      is_active: true,
      display_order: heroSlides.length + 1,
      isNew: true,
    };
    setHeroSlides((prev) => [...prev, newSlide]);
  }, [heroSlides.length]);

  const handleDeleteSlide = useCallback(async (slideId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus slide ini?")) {
      return;
    }

    try {
      // Jika ini slide baru yang belum disimpan, cukup hapus dari state
      if (slideId.toString().includes("temp-")) {
        setHeroSlides((prev) => prev.filter((slide) => slide.id !== slideId));
        return;
      }

      // Jika slide sudah ada di database, hapus via API
      const response = await homeService.deleteSlide(slideId);
      if (response.success) {
        setHeroSlides((prev) => prev.filter((slide) => slide.id !== slideId));
        alert("Slide berhasil dihapus!");
      }
    } catch (error) {
      console.error("Error deleting slide:", error);
      alert("Gagal menghapus slide");
    }
  }, []);

  const handleSlideChange = useCallback((slideId, field, value) => {
    setHeroSlides((prev) =>
      prev.map((slide) =>
        slide.id === slideId ? { ...slide, [field]: value } : slide
      )
    );
  }, []);

  const handleImageUpload = useCallback((slideId, file) => {
    setImageUploads((prev) => ({
      ...prev,
      [slideId]: file,
    }));
  }, []);

  // Handler untuk contact info
  const handleContactChange = useCallback((contactId, field, value) => {
    setContactInfo((prev) =>
      prev.map((contact) =>
        contact.id === contactId ? { ...contact, [field]: value } : contact
      )
    );
  }, []);

  // Handler untuk site stats
  const handleStatChange = useCallback((index, field, value) => {
    setSiteStats((prev) => {
      const newStats = [...prev];
      newStats[index] = { ...newStats[index], [field]: value };
      return newStats;
    });
  }, []);

  const handleAddStat = useCallback(() => {
    setSiteStats((prev) => [
      ...prev,
      {
        stat_number: "0+",
        stat_label: "Statistik Baru",
      },
    ]);
  }, []);

  const handleDeleteStat = useCallback((index) => {
    setSiteStats((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handler untuk bank accounts
  const handleAddBank = useCallback(() => {
    const newBank = {
      id: `temp-${Date.now()}`,
      bank_name: "",
      account_number: "",
      account_holder: "",
      isNew: true,
    };
    setBankAccounts((prev) => [...prev, newBank]);
  }, []);

  const handleDeleteBank = useCallback(async (bankId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus akun bank ini?")) {
      return;
    }

    try {
      if (bankId.toString().includes("temp-")) {
        setBankAccounts((prev) => prev.filter((bank) => bank.id !== bankId));
        return;
      }

      const response = await bankService.deleteBank(bankId);
      if (response.success) {
        setBankAccounts((prev) => prev.filter((bank) => bank.id !== bankId));
        alert("Akun bank berhasil dihapus!");
      }
    } catch (error) {
      console.error("Error deleting bank account:", error);
      alert("Gagal menghapus akun bank");
    }
  }, []);

  const handleBankChange = useCallback((bankId, field, value) => {
    setBankAccounts((prev) =>
      prev.map((bank) =>
        bank.id === bankId ? { ...bank, [field]: value } : bank
      )
    );
  }, []);

  // Handler untuk popup settings
  const handlePopupSettingChange = useCallback((field, value) => {
    setPopupSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Simpan hero slides
  const handleSaveSlides = useCallback(async () => {
    setSaving(true);
    try {
      // Filter slides yang perlu disimpan (yang memiliki gambar)
      const slidesToSave = heroSlides.filter(
        (slide) => imageUploads[slide.id] || slide.background_image_url
      );

      if (slidesToSave.length === 0) {
        alert("Harap tambahkan gambar untuk setidaknya satu slide!");
        return;
      }

      // Simpan setiap slide
      for (const slide of slidesToSave) {
        const formData = new FormData();
        formData.append("title", slide.title);
        formData.append("subtitle", slide.subtitle || "");
        formData.append("display_order", slide.display_order);
        formData.append("is_active", slide.is_active);

        // Jika ada file gambar yang diupload
        if (imageUploads[slide.id]) {
          formData.append("background_image", imageUploads[slide.id]);
        }

        if (slide.isNew) {
          await homeService.createSlide(formData);
        } else {
          await homeService.updateSlide(slide.id, formData);
        }
      }

      alert("Hero slides berhasil disimpan!");
      await fetchData();
      setImageUploads({});
    } catch (error) {
      console.error("Error saving slides:", error);
      alert("Gagal menyimpan hero slides");
    } finally {
      setSaving(false);
    }
  }, [heroSlides, imageUploads, fetchData]);

  // Simpan contact info
  const handleSaveContact = useCallback(async () => {
    setSaving(true);
    try {
      // Validasi data sebelum menyimpan
      const invalidContacts = contactInfo.filter(
        (contact) => !contact.title?.trim() || !contact.value?.trim()
      );

      if (invalidContacts.length > 0) {
        alert("Harap isi semua field title dan value untuk setiap kontak!");
        return;
      }

      // Simpan setiap contact ke database
      const results = await contactService.updateMultipleContacts(contactInfo);

      const allSuccess = results.every((result) => result.success);

      if (allSuccess) {
        alert("Informasi kontak berhasil disimpan!");
        await fetchData();
      } else {
        throw new Error("Beberapa kontak gagal disimpan");
      }
    } catch (error) {
      console.error("Error saving contact info:", error);
      alert("Gagal menyimpan informasi kontak: " + error.message);
    } finally {
      setSaving(false);
    }
  }, [contactInfo, fetchData]);

  // Simpan site stats
  const handleSaveStats = useCallback(async () => {
    setSaving(true);
    try {
      const response = await homeService.updateSiteStats(siteStats);
      if (response.success) {
        alert("Statistik berhasil disimpan!");
        await fetchData();
      }
    } catch (error) {
      console.error("Error saving stats:", error);
      alert("Gagal menyimpan statistik");
    } finally {
      setSaving(false);
    }
  }, [siteStats, fetchData]);

  // Simpan bank accounts
  const handleSaveBanks = useCallback(async () => {
    setSaving(true);
    try {
      // Validasi data bank
      const invalidBanks = bankAccounts.filter(
        (bank) =>
          !bank.bank_name?.trim() ||
          !bank.account_number?.trim() ||
          !bank.account_holder?.trim()
      );

      if (invalidBanks.length > 0) {
        alert("Harap isi semua field untuk setiap akun bank!");
        return;
      }

      for (const bank of bankAccounts) {
        const bankData = {
          bank_name: bank.bank_name.trim(),
          account_number: bank.account_number.trim(),
          account_holder: bank.account_holder.trim(),
        };

        if (bank.isNew) {
          await bankService.createBank(bankData);
        } else {
          await bankService.updateBank(bank.id, bankData);
        }
      }

      alert("Data bank berhasil disimpan!");
      await fetchData();
    } catch (error) {
      console.error("Error saving banks:", error);
      alert("Gagal menyimpan data bank");
    } finally {
      setSaving(false);
    }
  }, [bankAccounts, fetchData]);

  // Simpan popup settings
  const handleSavePopupSettings = useCallback(async () => {
    setSaving(true);
    try {
      const response = await popupService.updatePopupSettings(popupSettings);
      if (response.success) {
        alert("Popup settings berhasil disimpan!");
        await fetchData();
      }
    } catch (error) {
      console.error("Error saving popup settings:", error);
      alert("Gagal menyimpan popup settings");
    } finally {
      setSaving(false);
    }
  }, [popupSettings, fetchData]);

  // Loading component
  const LoadingSpinner = useMemo(
    () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FA812F] mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    ),
    []
  );

  // Tabs configuration dengan responsive design
  const tabs = useMemo(
    () => [
      { id: "hero", label: "Hero Section", icon: Image },
      { id: "contact", label: "Contact Info", icon: Settings },
      { id: "bank", label: "Bank Accounts", icon: Building2 },
      { id: "popup", label: "Popup Settings", icon: Eye },
    ],
    []
  );

  if (loading) {
    return LoadingSpinner;
  }

  return (
    <div className="space-y-6">
      {/* Header - Judul dan Deskripsi */}
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-bold text-gray-900">Website Content</h1>
        <p className="text-sm text-gray-600 mt-1">
          Kelola konten website dan informasi perusahaan
        </p>
      </div>

      {/* Mobile Tab Selector */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200"
        >
          <span className="font-medium text-gray-900 text-sm">
            {tabs.find((tab) => tab.id === activeTab)?.label || "Pilih Menu"}
          </span>
          {isMobileMenuOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {isMobileMenuOpen && (
          <div className="mt-1 bg-white border border-gray-300 rounded-lg shadow-sm">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-gray-100 last:border-b-0 transition-colors duration-200 ${
                    activeTab === tab.id
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <IconComponent className="w-3 h-3" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Tabs Navigation */}
      <div className="hidden lg:flex space-x-1 bg-white rounded-lg p-1">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#000000] to-[#212121] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Garis Pemisah */}
      <div className="border-b border-gray-200"></div>

      {/* Tombol Aksi - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 px-4 sm:px-0">
        {activeTab === "hero" && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleAddSlide}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium order-2 sm:order-1"
            >
              <Plus className="w-4 h-4" />
              Tambah Slide
            </button>
            <button
              onClick={handleSaveSlides}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#000000] to-[#212121] text-white rounded-lg hover:from-[#111111] hover:to-[#333333] transition-all duration-200 font-medium disabled:opacity-50 order-1 sm:order-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Menyimpan..." : "Simpan Semua"}
            </button>
          </div>
        )}

        {activeTab === "contact" && (
          <button
            onClick={handleSaveContact}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#000000] to-[#212121] text-white rounded-lg hover:from-[#111111] hover:to-[#333333] transition-all duration-200 font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        )}

        {activeTab === "bank" && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleAddBank}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg hover:from-[#E14A0C] hover:to-[#F07225] transition-all duration-200 font-medium order-2 sm:order-1"
            >
              <Plus className="w-4 h-4" />
              Tambah Bank
            </button>
            <button
              onClick={handleSaveBanks}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#000000] to-[#212121] text-white rounded-lg hover:from-[#111111] hover:to-[#333333] transition-all duration-200 font-medium disabled:opacity-50 order-1 sm:order-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Menyimpan..." : "Simpan Semua"}
            </button>
          </div>
        )}

        {activeTab === "popup" && (
          <button
            onClick={handleSavePopupSettings}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#000000] to-[#212121] text-white rounded-lg hover:from-[#111111] hover:to-[#333333] transition-all duration-200 font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Settings"}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="space-y-6 px-4 sm:px-0">
        {/* Hero Section Management */}
        {activeTab === "hero" && (
          <HeroSection
            heroSlides={heroSlides}
            imageUploads={imageUploads}
            onSlideChange={handleSlideChange}
            onImageUpload={handleImageUpload}
            onDeleteSlide={handleDeleteSlide}
            onAddSlide={handleAddSlide}
          />
        )}

        {/* Contact Information Management */}
        {activeTab === "contact" && (
          <ContactSection
            contactInfo={contactInfo}
            onContactChange={handleContactChange}
          />
        )}

        {/* Bank Accounts Management */}
        {activeTab === "bank" && (
          <BankSection
            bankAccounts={bankAccounts}
            onBankChange={handleBankChange}
            onDeleteBank={handleDeleteBank}
            onAddBank={handleAddBank}
          />
        )}

        {/* Popup Settings Management */}
        {activeTab === "popup" && (
          <PopupSection
            popupSettings={popupSettings}
            onPopupSettingChange={handlePopupSettingChange}
          />
        )}
      </div>
    </div>
  );
};

// Sub-components untuk memisahkan logika tampilan

const HeroSection = ({
  heroSlides,
  imageUploads,
  onSlideChange,
  onImageUpload,
  onDeleteSlide,
  onAddSlide,
}) => {
  return (
    <div className="space-y-6">
      {/* Slider Horizontal dengan scroll yang lebih baik di mobile */}
      {heroSlides.length > 0 ? (
        <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex space-x-4 sm:space-x-6 min-w-max">
            {heroSlides.map((slide) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                imageUpload={imageUploads[slide.id]}
                onSlideChange={onSlideChange}
                onImageUpload={onImageUpload}
                onDeleteSlide={onDeleteSlide}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Plus className="w-8 h-8 text-gray-400" />}
          title="Belum ada slide"
          description="Tambahkan slide pertama untuk menampilkan hero section"
          buttonText="Tambah Slide Pertama"
          onButtonClick={onAddSlide}
        />
      )}
    </div>
  );
};

const SlideCard = ({
  slide,
  imageUpload,
  onSlideChange,
  onImageUpload,
  onDeleteSlide,
}) => {
  const imageUrl = imageUpload
    ? URL.createObjectURL(imageUpload)
    : slide.background_image_url;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm w-80 sm:w-96 flex-shrink-0">
      <div className="space-y-4">
        {/* Image Upload & Preview */}
        <ImageUploadSection
          imageUrl={imageUrl}
          onImageUpload={(file) => onImageUpload(slide.id, file)}
        />

        {/* Content Editor */}
        {(imageUpload || slide.background_image_url) && (
          <SlideContentEditor slide={slide} onSlideChange={onSlideChange} />
        )}
      </div>

      {/* Actions */}
      <SlideActions slide={slide} onDeleteSlide={onDeleteSlide} />
    </div>
  );
};

const ImageUploadSection = ({ imageUrl, onImageUpload }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Gambar Background
      </label>
      <div className="space-y-4">
        <div className="aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "/images/placeholder.jpg";
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
              <Image className="w-8 h-8 sm:w-12 sm:h-12 mb-2" />
              <p className="text-sm">Upload gambar background</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Gambar Baru
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                onImageUpload(e.target.files[0]);
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>
    </div>
  );
};

const SlideContentEditor = ({ slide, onSlideChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Judul Slide *
        </label>
        <input
          type="text"
          value={slide.title}
          onChange={(e) => onSlideChange(slide.id, "title", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
          placeholder="Masukkan judul slide"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Deskripsi
        </label>
        <textarea
          value={slide.subtitle}
          onChange={(e) => onSlideChange(slide.id, "subtitle", e.target.value)}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
          placeholder="Masukkan deskripsi slide"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={slide.is_active}
            onChange={(e) =>
              onSlideChange(slide.id, "is_active", e.target.checked)
            }
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="ml-2 text-sm text-gray-700">Aktif</span>
        </label>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700 whitespace-nowrap">
            Urutan:
          </label>
          <input
            type="number"
            value={slide.display_order}
            onChange={(e) =>
              onSlideChange(
                slide.id,
                "display_order",
                parseInt(e.target.value) || 1
              )
            }
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            min="1"
          />
        </div>
      </div>
    </div>
  );
};

const SlideActions = ({ slide, onDeleteSlide }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-6 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Edit className="w-4 h-4" />
        <span className="truncate">ID: {slide.id}</span>
        {slide.isNew && (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs whitespace-nowrap">
            BARU
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onDeleteSlide(slide.id)}
          className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Hapus
        </button>
      </div>
    </div>
  );
};

const ContactSection = ({ contactInfo, onContactChange }) => {
  const contactTypes = {
    whatsapp_floating: "Untuk tombol WhatsApp floating di website",
    whatsapp: "Untuk WhatsApp di footer",
    phone: "Nomor telepon perusahaan",
    email: "Email perusahaan",
    address: "Alamat perusahaan",
  };

  // Function to format Indonesian phone number for display
  const formatPhoneNumber = (value, type) => {
    if (!value) return value;

    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, "");

    if (type === "whatsapp_floating") {
      // For WhatsApp floating, store as 62xxxxxxxxxxx but show formatted
      if (numbers.startsWith("0")) {
        return "62" + numbers.slice(1);
      } else if (numbers.startsWith("62")) {
        return numbers;
      } else if (numbers.startsWith("8")) {
        return "62" + numbers;
      } else {
        return numbers;
      }
    } else if (type === "whatsapp" || type === "phone") {
      // Format for display: +62 xxx-xxxx-xxxx or (021) xxxxxxx
      if (numbers.startsWith("62")) {
        const without62 = numbers.slice(2);
        if (without62.length <= 3) {
          return `+62 ${without62}`;
        } else if (without62.length <= 7) {
          return `+62 ${without62.slice(0, 3)}-${without62.slice(3)}`;
        } else {
          return `+62 ${without62.slice(0, 3)}-${without62.slice(
            3,
            7
          )}-${without62.slice(7, 11)}`;
        }
      } else if (numbers.startsWith("0")) {
        if (numbers.length <= 4) {
          return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        } else if (numbers.length <= 8) {
          return `(${numbers.slice(0, 3)}) ${numbers.slice(
            3,
            7
          )}-${numbers.slice(7)}`;
        } else {
          return `(${numbers.slice(0, 3)}) ${numbers.slice(
            3,
            7
          )}-${numbers.slice(7, 11)}`;
        }
      } else {
        return numbers;
      }
    }

    return value;
  };

  // Function to handle phone number input
  const handlePhoneInput = (contactId, value, type) => {
    // Remove all formatting for storage
    const rawValue = value.replace(/\D/g, "");
    onContactChange(contactId, "value", rawValue);
  };

  // Get display value with formatting
  const getDisplayValue = (contact) => {
    const type = contact.contact_type;
    const value = contact.value || "";

    if (
      type === "whatsapp_floating" ||
      type === "whatsapp" ||
      type === "phone"
    ) {
      return formatPhoneNumber(value, type);
    }

    return value;
  };

  // Get placeholder based on contact type
  const getPlaceholder = (type) => {
    switch (type) {
      case "whatsapp_floating":
        return "6281234567890";
      case "whatsapp":
        return "081234567890";
      case "phone":
        return "02112345678";
      case "email":
        return "contoh@perusahaan.com";
      case "address":
        return "Jl. Contoh Alamat No. 123";
      default:
        return "Masukkan nilai kontak";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6">Informasi Kontak</h2>

        <div className="grid gap-4 sm:gap-6">
          {contactInfo.map((contact) => (
            <div
              key={contact.id}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-gray-50"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipe Kontak
                </label>
                <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm">
                  {contact.contact_type}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {contactTypes[contact.contact_type]}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={contact.title}
                  onChange={(e) =>
                    onContactChange(contact.id, "title", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
                  placeholder="Masukkan label kontak"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nilai
                </label>
                <input
                  type="text"
                  value={getDisplayValue(contact)}
                  onChange={(e) => {
                    if (
                      contact.contact_type === "whatsapp_floating" ||
                      contact.contact_type === "whatsapp" ||
                      contact.contact_type === "phone"
                    ) {
                      handlePhoneInput(
                        contact.id,
                        e.target.value,
                        contact.contact_type
                      );
                    } else {
                      onContactChange(contact.id, "value", e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
                  placeholder={getPlaceholder(contact.contact_type)}
                />

                {/* Format hints */}
                {contact.contact_type === "whatsapp_floating" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Format: 62xxxxxxxxxxx (tanpa +, spasi, atau strip)
                  </p>
                )}
                {(contact.contact_type === "whatsapp" ||
                  contact.contact_type === "phone") && (
                  <p className="text-xs text-gray-500 mt-1">
                    Format otomatis: bisa input 08123456789
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {contactInfo.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Data kontak belum tersedia</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BankSection = ({
  bankAccounts,
  onBankChange,
  onDeleteBank,
  onAddBank,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Manajemen Akun Bank
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Kelola akun bank perusahaan untuk metode pembayaran
          </p>
        </div>

        {bankAccounts.length > 0 ? (
          <div className="space-y-4">
            {bankAccounts.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                onBankChange={onBankChange}
                onDeleteBank={onDeleteBank}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Building2 className="w-8 h-8 text-gray-400" />}
            title="Belum ada akun bank"
            description="Tambahkan akun bank untuk digunakan dalam pembayaran"
            buttonText="Tambah Bank Pertama"
            onButtonClick={onAddBank}
          />
        )}
      </div>
    </div>
  );
};

const BankCard = ({ bank, onBankChange, onDeleteBank }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 sm:p-6 hover:bg-gray-100 transition-all duration-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Nama Bank */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Bank *
          </label>
          <input
            type="text"
            value={bank.bank_name}
            onChange={(e) => onBankChange(bank.id, "bank_name", e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
            placeholder="Contoh: BCA, BNI, Mandiri"
          />
          <p className="text-xs text-gray-500 mt-2">
            Gunakan nama bank yang resmi
          </p>
        </div>

        {/* Nomor Rekening */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nomor Rekening *
          </label>
          <input
            type="text"
            value={bank.account_number}
            onChange={(e) =>
              onBankChange(bank.id, "account_number", e.target.value)
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
            placeholder="Masukkan nomor rekening"
          />
          <p className="text-xs text-gray-500 mt-2">
            Pastikan sesuai dengan buku tabungan
          </p>
        </div>

        {/* Atas Nama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Atas Nama *
          </label>
          <input
            type="text"
            value={bank.account_holder}
            onChange={(e) =>
              onBankChange(bank.id, "account_holder", e.target.value)
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
            placeholder="Nama pemilik rekening"
          />
          <p className="text-xs text-gray-500 mt-2">
            Harus sama dengan nama di rekening
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Building2 className="w-4 h-4" />
            <span className="truncate">ID: {bank.id}</span>
          </div>
          {bank.isNew && (
            <span className="bg-yellow-100 text-yellow-800 px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
              BARU
            </span>
          )}
        </div>
        <button
          onClick={() => onDeleteBank(bank.id)}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
        >
          <Trash2 className="w-4 h-4" />
          Hapus Bank
        </button>
      </div>
    </div>
  );
};

const PopupSection = ({ popupSettings, onPopupSettingChange }) => {
  // Predefined interval options in minutes
  const intervalOptions = [
    { value: 60, label: "1 Jam" },
    { value: 120, label: "2 Jam" },
    { value: 180, label: "3 Jam" },
    { value: 240, label: "4 Jam" },
    { value: 300, label: "5 Jam" },
    { value: 360, label: "6 Jam" },
    { value: 1440, label: "1 Hari" },
  ];

  // Convert minutes to hours for display
  const minutesToHours = (minutes) => {
    if (minutes < 60) return `${minutes} Menit`;
    const hours = minutes / 60;
    return hours === 1 ? "1 Jam" : `${hours} Jam`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Popup Settings
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Kelola pengaturan popup diskon yang ditampilkan kepada pengunjung
          </p>
        </div>

        <div className="space-y-6">
          {/* Interval Settings */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Pengaturan Waktu
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Interval Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Interval Tampil
                </label>
                <div className="space-y-3">
                  <select
                    value={popupSettings.interval_minutes}
                    onChange={(e) =>
                      onPopupSettingChange(
                        "interval_minutes",
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
                  >
                    {intervalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600">
                    Popup akan muncul setiap{" "}
                    <span className="font-semibold text-orange-600">
                      {minutesToHours(popupSettings.interval_minutes)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Delay Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Delay Awal
                </label>
                <div className="space-y-3">
                  <select
                    value={popupSettings.delay_seconds}
                    onChange={(e) =>
                      onPopupSettingChange(
                        "delay_seconds",
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
                  >
                    <option value={3}>3 Detik</option>
                    <option value={5}>5 Detik</option>
                    <option value={10}>10 Detik</option>
                    <option value={15}>15 Detik</option>
                    <option value={30}>30 Detik</option>
                  </select>
                  <p className="text-sm text-gray-600">
                    Tunggu{" "}
                    <span className="font-semibold text-orange-600">
                      {popupSettings.delay_seconds} detik
                    </span>{" "}
                    sebelum popup pertama
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({
  icon,
  title,
  description,
  buttonText,
  onButtonClick,
}) => {
  return (
    <div className="text-center py-8 sm:py-12">
      <div className="bg-gray-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 text-sm sm:text-base">{description}</p>
      <button
        onClick={onButtonClick}
        className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-4 sm:px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 text-sm sm:text-base"
      >
        {buttonText}
      </button>
    </div>
  );
};

export default Content;
