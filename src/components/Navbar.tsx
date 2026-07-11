import React from 'react';
import { Menu, ShoppingBag, User, ShieldCheck } from 'lucide-react';
import { useAppState } from '../AppContext';

interface NavbarProps {
  onOpenSidebar: () => void;
  onOpenCart: () => void;
  onOpenProfile: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenSidebar, 
  onOpenCart, 
  onOpenProfile,
  searchQuery,
  setSearchQuery
}) => {
  const { settings, cart, adminUnlocked, setAdminAuthenticated, currentUser } = useAppState();

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
        
        {/* Left Section: Menu & Logo */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            id="btn-sidebar-toggle"
            onClick={onOpenSidebar}
            className="rounded-md p-1.5 sm:p-2 text-gray-600 hover:bg-gray-50 hover:text-[#1877F2] transition-colors focus:outline-hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <a href="/" className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
            {settings.logo ? (
              <img 
                src={settings.logo} 
                alt={settings.name} 
                className="h-8 sm:h-9 w-8 sm:w-9 rounded-full object-cover border border-[#1877F2]/20 shadow-xs" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-8 sm:h-9 w-8 sm:w-9 rounded-full bg-[#1877F2]/10 text-[#1877F2] font-black flex items-center justify-center text-xs sm:text-sm uppercase border border-[#1877F2]/20">
                {settings.name.charAt(0)}
              </div>
            )}
            <span className="font-sans text-base sm:text-2xl font-black tracking-wider text-[#1877F2]">
              {settings.name.toUpperCase()}
            </span>
          </a>
        </div>

        {/* Center Section: Real-time Search Input */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পছন্দের পোশাকটি খুঁজুন..."
              className="w-full pl-8 sm:pl-9 pr-3 py-1.5 text-[11px] sm:text-xs bg-slate-50 border border-gray-200 rounded-full focus:bg-white focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] focus:outline-hidden transition-all font-semibold"
            />
          </div>
        </div>

        {/* Right Section: Admin Entry Shortcut (if unlocked), User Profile, Cart */}
        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          {adminUnlocked && (
            <button
              id="btn-admin-panel"
              onClick={() => setAdminAuthenticated(true)}
              className="hidden sm:flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-[#1877F2] border border-[#1877F2] hover:bg-blue-50 transition-colors"
              title="Admin Panel"
            >
              <ShieldCheck className="h-4 w-4 animate-pulse" />
              <span>Admin</span>
            </button>
          )}

          <button
            id="btn-user-profile"
            onClick={onOpenProfile}
            className="rounded-md p-1 sm:p-1.5 text-gray-600 hover:bg-gray-50 hover:text-[#1877F2] transition-colors focus:outline-hidden flex items-center justify-center"
            title="My Account"
          >
            {currentUser && currentUser.isLoggedIn && currentUser.avatar ? (
              <img 
                src={currentUser.avatar} 
                alt="Profile" 
                className="h-6 w-6 rounded-full object-cover border border-[#1877F2]/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="h-6 w-6" />
            )}
          </button>

          <button
            id="btn-shopping-bag"
            onClick={onOpenCart}
            className="relative rounded-md p-1.5 sm:p-2 text-gray-600 hover:bg-gray-50 hover:text-[#1877F2] transition-colors focus:outline-hidden"
            title="Shopping Cart"
          >
            <ShoppingBag className="h-6 w-6" />
            {totalCartItems > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
                {totalCartItems}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
