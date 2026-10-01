import { Link, useLocation } from 'react-router-dom';
import { 
  Printer
} from 'lucide-react';
import { useState, useEffect } from 'react';

const BottombarUser = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHomePage, setIsHomePage] = useState(false);

  // Effect untuk handle scroll dan location
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Check jika berada di halaman home
    setIsHomePage(location.pathname === "/");

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const menuItems = [
    { 
      path: '/printing-service', 
      label: 'Printing', 
      icon: Printer,
      isFloating: true 
    }
  ];

  const isActive = (path) => location.pathname === path;

  // Tentukan style bottom bar - SEMUA HALAMAN SAMA
  const getBottomBarStyle = () => {
    return "bg-black/30 backdrop-blur-md border-t border-white/20";
  };

  // Tentukan style teks dan icon - SEMUA HALAMAN SAMA
  const getTextIconStyle = (path) => {
    return isActive(path)
      ? { text: "text-white font-semibold", icon: "text-white" }
      : { text: "text-white/90", icon: "text-white/70" };
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      {/* Background Cekung */}
      <div className="relative">
        {/* Main Bottom Bar dengan Efek Cekung */}
        <div className={`py-2 rounded-t-xl shadow-md transition-all duration-300 ${getBottomBarStyle()}`}>
          <div className="flex justify-around items-center">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const style = getTextIconStyle(item.path);
              
              // Floating Printing Button - Sedikit lebih besar (GRADASI ORANGE)
              if (item.isFloating) {
                return (
                  <div key={item.path} className="relative flex-1 min-w-0 flex justify-center">
                    <Link
                      to={item.path}
                      className="flex flex-col items-center transition-all duration-300 -translate-y-5"
                    >
                      <div className="p-3 rounded-full bg-gradient-to-r from-[#F25912] to-[#FA812F] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <Printer className="w-5 h-5 text-white" />
                      </div>
                    </Link>
                  </div>
                );
              }

              // Regular Menu Items - Sedikit lebih besar
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center py-1 px-1 flex-1 min-w-0 transition-colors duration-200 ${style.text}`}
                >
                  <IconComponent 
                    className={`w-5 h-5 transition-colors duration-200 ${style.icon}`} 
                  />
                  <span className={`text-xs mt-1 ${
                    isActive(item.path) ? 'font-semibold' : 'font-normal'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottombarUser;