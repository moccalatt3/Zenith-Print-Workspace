import React, { useState, useEffect } from 'react';
import contactService from '../services/contactService'; // Sesuaikan path

const FloatingContact = () => {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch nomor WhatsApp floating dari API
  useEffect(() => {
    const fetchWhatsappNumber = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await contactService.getContactInfo();
        console.log('Contact API Response:', response); // Debug log
        
        if (response.success) {
          // Cari contact dengan type 'whatsapp_floating'
          const floatingWhatsapp = response.data.find(
            contact => contact.contact_type === 'whatsapp_floating'
          );
          
          console.log('Found floating WhatsApp:', floatingWhatsapp); // Debug log
          
          if (floatingWhatsapp && floatingWhatsapp.value) {
            setWhatsappNumber(floatingWhatsapp.value);
          } else {
            // Fallback: cari yang 'whatsapp' biasa jika floating tidak ada
            const regularWhatsapp = response.data.find(
              contact => contact.contact_type === 'whatsapp'
            );
            
            console.log('Found regular WhatsApp (fallback):', regularWhatsapp); // Debug log
            
            if (regularWhatsapp && regularWhatsapp.value) {
              setWhatsappNumber(regularWhatsapp.value);
            } else {
              setError('Nomor WhatsApp tidak ditemukan di database');
              console.warn('No WhatsApp number found in contact info');
            }
          }
        } else {
          setError('Gagal mengambil data dari server');
        }
      } catch (error) {
        console.error('Error fetching WhatsApp number:', error);
        setError('Error: ' + error.message);
        // Fallback ke nomor default
        setWhatsappNumber('6281234567890');
      } finally {
        setLoading(false);
      }
    };

    fetchWhatsappNumber();
  }, []);

  const handleWhatsAppClick = () => {
    if (!whatsappNumber) {
      console.error('WhatsApp number not available');
      alert('Nomor WhatsApp tidak tersedia saat ini. Silakan coba lagi nanti.');
      return;
    }

    try {
      // Format nomor: hapus semua karakter non-digit
      const phoneNumber = whatsappNumber.replace(/[^0-9]/g, '');
      
      // Validasi nomor
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error('Nomor WhatsApp tidak valid');
      }

      const message = 'Halo, saya tertarik dengan layanan 3D Printing Anda!';
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      
      console.log('Opening WhatsApp URL:', whatsappUrl); // Debug log
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      alert('Terjadi error saat membuka WhatsApp: ' + error.message);
    }
  };

  // Tampilkan loading jika masih fetching data
  if (loading) {
    return (
      <div className={`fixed ${isMobile ? 'right-4 bottom-20' : 'right-10 bottom-10'} z-40`}>
        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-green-500 rounded-full flex items-center justify-center shadow-lg`}>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Tampilkan error state jika ada error
  if (error && !whatsappNumber) {
    return (
      <div className={`fixed ${isMobile ? 'right-4 bottom-20' : 'right-10 bottom-10'} z-40`}>
        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-red-500 rounded-full flex items-center justify-center shadow-lg group relative`}>
          <svg className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="absolute -top-16 right-1/2 transform translate-x-1/2 bg-red-600 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap max-w-xs">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${isMobile ? 'right-4 bottom-20' : 'right-10 bottom-10'} z-40 flex flex-col gap-3`}>
      {/* WhatsApp Floating Button */}
      <button
        onClick={handleWhatsAppClick}
        className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 group relative`}
        aria-label="Contact via WhatsApp"
        disabled={!whatsappNumber}
        title={`Klik untuk chat WhatsApp: ${whatsappNumber}`}
      >
        <svg className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.189-1.248-6.189-3.515-8.447"/>
        </svg>
        
        {/* Tooltip - hanya di desktop */}
        {!isMobile && (
          <div className="absolute -top-12 right-1/2 transform translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            WhatsApp Kami
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-black rotate-45"></div>
          </div>
        )}
      </button>
    </div>
  );
};

export default FloatingContact;