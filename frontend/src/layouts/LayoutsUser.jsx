import NavbarUser from "../components/NavbarUser";
import FooterUser from "../components/FooterUser";
import BottombarUser from "../components/BottombarUser";
import { useState, useEffect } from "react";

const LayoutsUser = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  // Delay render layout components untuk priority main content
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Render Navbar setelah delay kecil */}
      {isReady && <NavbarUser />}
      
      <main className="flex-1 w-full">
        {children}
      </main>
      
      {/* Render Footer & BottomBar setelah delay */}
      {isReady && (
        <>
          <FooterUser />
          <BottombarUser />
        </>
      )}
    </div>
  );
};

export default LayoutsUser;