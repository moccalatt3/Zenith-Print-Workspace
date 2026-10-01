import { useState, useEffect, useCallback } from 'react';
import contactService from '../services/contactService';

// Skeleton Loading Components untuk Footer
const FooterSkeleton = () => (
  <footer className="bg-gradient-to-br from-[#000000] to-[#212121] border-t border-gray-700">
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Company Info Skeleton */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="flex items-center">
            <div className="w-32 h-14 bg-gray-600 rounded shimmer animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-600 rounded shimmer animate-pulse w-64"></div>
            <div className="h-4 bg-gray-600 rounded shimmer animate-pulse w-56"></div>
          </div>
        </div>

        {/* Contact Info Skeleton */}
        <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
          <div className="h-5 bg-gray-600 rounded shimmer animate-pulse w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-end">
                <div className="h-4 bg-gray-600 rounded shimmer animate-pulse w-40 mr-3"></div>
                <div className="w-5 h-5 bg-gray-600 rounded shimmer animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section Skeleton */}
      <div className="mt-8 pt-8 border-t border-gray-700">
        <div className="flex justify-center">
          <div className="h-4 bg-gray-600 rounded shimmer animate-pulse w-48"></div>
        </div>
      </div>
    </div>
  </footer>
);

// Contact Item Component untuk reusability
const ContactItem = ({ contact }) => {
  const getContactIcon = (contactType) => {
    switch (contactType) {
      case 'location':
        return (
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'phone':
        return (
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'email':
        return (
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'whatsapp':
        return (
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.18-1.24-6.169-3.495-8.418"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatContactValue = (contactType, value) => {
    switch (contactType) {
      case 'phone':
        return (
          <a href={`tel:${value}`} className="hover:text-[#FA812F] transition-colors duration-200">
            {value}
          </a>
        );
      case 'email':
        return (
          <a href={`mailto:${value}`} className="hover:text-[#FA812F] transition-colors duration-200">
            {value}
          </a>
        );
      case 'whatsapp':
        return (
          <a 
            href={`https://wa.me/${value.replace(/\D/g, '')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-[#FA812F] transition-colors duration-200"
          >
            {value}
          </a>
        );
      default:
        return value;
    }
  };

  return (
    <li className="flex items-start md:items-center justify-start md:justify-end text-gray-300 text-sm mb-4 last:mb-0">
      <div className="flex items-center w-full">
        {/* Icon di sebelah kiri untuk mobile, di sebelah kanan untuk desktop */}
        <div className="md:hidden mr-3">
          {getContactIcon(contact.contact_type)}
        </div>
        
        <span className="text-left md:text-right flex-1">
          {formatContactValue(contact.contact_type, contact.value)}
        </span>
        
        {/* Icon di sebelah kanan untuk desktop */}
        <div className="hidden md:block ml-3">
          {getContactIcon(contact.contact_type)}
        </div>
      </div>
    </li>
  );
};

// Fallback Contact Data
const fallbackContactData = [
  {
    id: 1,
    contact_type: 'location',
    value: 'Jakarta, Indonesia'
  },
  {
    id: 2,
    contact_type: 'phone', 
    value: '+62 812-3456-7890'
  },
  {
    id: 3,
    contact_type: 'email',
    value: 'hello@print3d.com'
  }
];

const FooterUser = () => {
  const [contactInfo, setContactInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContactInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contactService.getContactInfo();
      if (response.success) {
        setContactInfo(response.data);
      } else {
        setError('Gagal mengambil data kontak');
        // Use fallback data immediately on API error
        setContactInfo(fallbackContactData);
      }
    } catch (err) {
      console.error('Error fetching contact info:', err);
      setError('Terjadi kesalahan saat mengambil data kontak');
      // Use fallback data on network error
      setContactInfo(fallbackContactData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContactInfo();
  }, [fetchContactInfo]);

  // Tampilkan skeleton selama loading
  if (loading) {
    return <FooterSkeleton />;
  }

  return (
    <footer className="bg-gradient-to-br from-[#000000] to-[#212121] border-t border-gray-700">
      <div className="max-w-7xl mx-auto py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 md:gap-12">
          
          {/* Company Info - Logo di atas, deskripsi di bawah */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full lg:w-1/2">
            {/* Logo */}
            <div className="flex justify-center lg:justify-start mb-4">
              <img
                src="/images/logo.png"
                alt="Print3D Logo"
                className="w-28 md:w-32 h-12 md:h-14 object-contain"
                loading="lazy"
              />
            </div>
            
            {/* Deskripsi */}
            <div className="text-gray-300 text-sm md:text-base leading-relaxed max-w-lg">
              <p className="mb-2">
                Menyediakan jasa 3D printing terbaik dengan kualitas tinggi dan hasil yang presisi. 
              </p>
              <p>
                Transformasi ide Anda menjadi produk nyata dengan teknologi terkini.
              </p>
            </div>
          </div>

          {/* Contact Info - Sejajar dengan company info */}
          <div className="flex flex-col items-center lg:items-end text-center lg:text-right w-full lg:w-1/2">
            <h3 className="text-lg font-semibold text-white tracking-wide mb-4 md:mb-6 w-full text-center lg:text-right">
              Hubungi Kami
            </h3>
            
            {error ? (
              <div className="text-gray-300 w-full">
                <p className="text-yellow-500 text-sm mb-4 text-center lg:text-right">⚠️ {error}</p>
                <ul className="w-full">
                  {fallbackContactData.map((contact) => (
                    <ContactItem key={contact.id} contact={contact} />
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="w-full">
                {contactInfo.map((contact) => (
                  <ContactItem key={contact.id} contact={contact} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-700">
          <div className="flex justify-center">
            <p className="text-gray-400 text-xs md:text-sm">
              © 2024 Print3D. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterUser;