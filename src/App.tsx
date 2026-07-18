import React, { useState } from 'react';
import { 
  AlertTriangle, ArrowRight, Facebook, Instagram, Youtube, HelpCircle, 
  Sparkles, CreditCard, CheckCircle, ShieldCheck, Mail, Phone, MapPin,
  Users, Check, X
} from 'lucide-react';
import { AppStateProvider, useAppState } from './AppContext';
import { Navbar } from './components/Navbar';
import { SidebarMenu } from './components/SidebarMenu';
import { BannerSlider } from './components/BannerSlider';
import { ProductCard } from './components/ProductCard';
import { CartCheckout } from './components/CartCheckout';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminPanel } from './components/AdminPanel';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { Product } from './types';

function MainAppContent() {
  const {
    products,
    settings,
    socialLinks,
    subscribers,
    activeCategory,
    adminUnlocked,
    setAdminUnlocked,
    adminAuthenticated,
    setAdminAuthenticated,
    addSubscriber,
    cart,
    setCart
  } = useAppState();

  // Drawers/Modals state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLiveAd, setShowLiveAd] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Product Details Modal state
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleOpenProductDetails = (product: Product) => {
    setSelectedDetailProduct(product);
    setDetailModalOpen(true);
  };

  // Keep selected product synced with latest comments/ratings from the state list
  const activeDetailProduct = selectedDetailProduct
    ? (products.find(p => p.id === selectedDetailProduct.id) || selectedDetailProduct)
    : null;

  // Hidden Gate Passcode Modal
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // Quick buy item
  const [directCheckoutItem, setDirectCheckoutItem] = useState<{ product: Product; size: string; color: string } | null>(null);

  // Newsletter Email local state
  const [subEmail, setSubEmail] = useState('');

  // Subscriber List Viewer modal state
  const [subscriberListOpen, setSubscriberListOpen] = useState(false);

  const handleSubscriberListClick = () => {
    if (settings.showSubscribersToCustomers === false) {
      alert('দুঃখিত, প্রাইভেসি সুরক্ষার স্বার্থে সাবস্ক্রাইবার তালিকা কাস্টমারদের জন্য এই মুহূর্তে অফ (OFF) রাখা হয়েছে।');
      return;
    }
    setSubscriberListOpen(true);
  };

  // Web search state
  const [searchQuery, setSearchQuery] = useState('');

  // Handle direct Buy Now click: add to cart (or increment if exists) and open cart to view all items!
  const handleBuyNowFromCard = (product: Product, size: string, color: string) => {
    setCart(prev => {
      const idx = prev.findIndex(item => 
        item.product.id === product.id && 
        item.size === size && 
        item.color === color
      );
      if (idx > -1) {
        const newCart = [...prev];
        if (newCart[idx].quantity < product.quantity) {
          newCart[idx].quantity += 1;
        }
        return newCart;
      } else {
        return [...prev, { product, quantity: 1, size, color }];
      }
    });
    setDirectCheckoutItem(null); // Clear direct checkout item to render full cart!
    setCartOpen(true);
  };

  // Hidden gate passcode submit
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput === '8tmI@mr87@') {
      setAdminUnlocked(true);
      setShowPasscodeModal(false);
      setPasscodeInput('');
      setPasscodeError(false);
      alert('⚠️ YOUNG Style Admin Options Unlocked! Access from Navbar or Footer shortcut.');
    } else {
      setPasscodeError(true);
    }
  };

  const handleSubscribeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = subEmail.trim();
    if (!email) return;

    const success = addSubscriber(email);
    if (success) {
      alert('🎉 Thank you for subscribing to YOUNG Style! You will receive our premium updates & special product discounts directly.');
      setSubEmail('');
    } else {
      alert('You are already subscribed to our newsletter!');
    }
  };

  // Filter products by category and search query
  const filteredProducts = products.filter(p => {
    const matchesCategory = (() => {
      if (activeCategory === 'All Product') return true;
      if (activeCategory === 'Trending') return p.sold > 15;
      return p.category.toLowerCase() === activeCategory.toLowerCase();
    })();

    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });
  
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col antialiased animate-fade-in">
            {/* 📢 লাইভ কাস্টমার পপ-আপ বিজ্ঞাপন */}
      {settings?.showPopupAd && settings?.popupAdImage && showLiveAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-[340px] w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
            
            {/* 🖼️ অফার ব্যানার ইমেজ */}
            <img 
              src={settings.popupAdImage} 
              alt="Special Promo" 
              className="w-full h-auto object-cover max-h-[420px]"
            />
            
            {/* ✕ বন্ধ করার বাটন */}
            <button 
              type="button"
              onClick={() => setShowLiveAd(false)}
              className="absolute top-2.5 right-2.5 bg-black/40 hover:bg-black/70 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition shadow"
            >
              ✕
            </button>

          </div>
        </div>
      )}
      
      {/* Animated Top Discount Banner */}
      {settings.discountBannerText && (
        <div className="bg-gradient-to-r from-red-600 via-amber-500 via-rose-500 to-red-600 animate-gradient-pan shimmer-effect text-white text-[11px] sm:text-xs font-black py-2.5 px-4 text-center overflow-hidden shadow-md flex items-center justify-center gap-2 select-none z-40 relative border-b border-white/10">
          <div className="flex items-center gap-2 animate-flash-bounce">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse shrink-0" />
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black shrink-0 animate-pulse border border-white/30">
              🔥 FLASH SALE
            </span>
            <span className="inline-block tracking-wide drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.4)]">
              {settings.discountBannerText}
            </span>
            <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse shrink-0" />
          </div>
        </div>
      )}

      {/* Navbar Section */}
      <Navbar 
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenCart={() => {
          setDirectCheckoutItem(null); // normal cart checkout
          setCartOpen(true);
        }}
        onOpenProfile={() => setProfileOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Categories Sidebar Drawer */}
      <SidebarMenu 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Hero Banner Slider */}
      <BannerSlider />

      {/* Main Catalog Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10" id="product-section">
        
        {/* Title and Category Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-8">
          <div>
            <span className="text-xs font-black text-[#1877F2] uppercase tracking-widest block mb-1">
              {activeCategory} Collection
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight uppercase">
              {activeCategory} SHIRTS & T-SHIRTS
            </h2>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <Sparkles className="h-4 w-4 text-[#1877F2] animate-spin" />
            <span>Premium Fabric Only</span>
          </div>
        </div>

        {/* Dynamic Responsive Product Grid (Mobile: 2, Tablet: 3, Desktop: 5 as requested!) */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500 font-bold">No shirts found in this category.</p>
            <p className="text-xs text-gray-400 mt-1">Check back soon or search another category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6" id="products-grid-container">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onBuyNow={handleBuyNowFromCard}
                onViewDetails={handleOpenProductDetails}
                onAddToCart={() => { /* Added quietly with browser confirmation inside ProductCard */ }}
              />
            ))}
          </div>
        )}

      </main>

      {/* Brand Value Props Banner */}
      <section className="bg-slate-50 border-t border-b border-gray-100 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">100% Quality Fabric</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Our shirts are manufactured from high-quality export cotton blends ensuring maximum skin comfort.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Secure Payment Gateways</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Shop hassle-free using standard bKash, Nagad Personal accounts or cash on delivery options.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Super-fast Delivery</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">We deliver products directly to your doorstep in 2-5 days with custom tailored courier service charges.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Area */}
      <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-16 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Column 1: Brand Info */}
            <div className="space-y-4">
              <span className="font-sans text-2xl font-black tracking-widest text-[#1877F2]">
                {settings.name.toUpperCase()}
              </span>
              {/* Premium quality description editable from Admin */}
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {settings.description}
              </p>
              
              {/* Contact info details */}
              <div className="space-y-2 text-xs text-slate-400 pt-2 font-bold">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#1877F2]" />
                  <span>{settings.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#1877F2]" />
                  <span>{settings.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#1877F2]" />
                  <span>{settings.address}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Social Links (As configured in Admin panel) */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Follow YOUNG Style</h4>
              <p className="text-xs text-slate-400 leading-normal">Connect with our brand on social media platforms to stay updated with discounts and seasonal sales.</p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-900 hover:bg-[#1877F2] text-white rounded-lg transition-colors" title="Facebook">
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-900 hover:bg-pink-600 text-white rounded-lg transition-colors" title="Instagram">
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-900 hover:bg-red-600 text-white rounded-lg transition-colors" title="YouTube">
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.tiktok && (
                  <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-900 hover:bg-black hover:text-cyan-400 text-white rounded-lg transition-all border border-transparent hover:border-pink-500 flex items-center justify-center" title="TikTok">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.21-.42-.45-.61-.7-.03 3.76-.02 7.52-.03 11.27-.06 2.05-.75 4.14-2.11 5.69-1.55 1.8-4.05 2.72-6.4 2.47-2.45-.19-4.75-1.58-5.83-3.8-1.22-2.39-1.03-5.46.46-7.66 1.43-2.19 4.02-3.41 6.64-3.14.01 1.41-.01 2.82.01 4.23-.97-.24-2.06-.02-2.82.64-.89.74-1.22 1.99-.81 3.09.35 1.05 1.41 1.79 2.52 1.73 1.15-.02 2.16-.92 2.31-2.06.07-1.35.03-2.7.04-4.05.01-4.73.01-9.46.01-14.19z" />
                    </svg>
                  </a>
                )}
                {socialLinks.whatsapp && (
                  <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center" title="WhatsApp">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.513 0 10.017-4.493 10.02-10.02.002-2.673-1.03-5.184-2.906-7.062C16.51 1.643 14.004.609 11.334.609 5.823.609 1.32 5.105 1.317 10.627c-.001 1.761.464 3.48 1.347 5.011l-1.002 3.659 3.75-.983zm11.566-7.514c-.302-.151-1.787-.882-2.056-.98-.269-.099-.465-.148-.659.151-.194.298-.755.952-.925 1.149-.17.196-.341.221-.643.071-.302-.151-1.273-.469-2.425-1.496-.897-.801-1.503-1.791-1.68-2.092-.177-.302-.019-.465.132-.614.136-.134.302-.352.453-.529.151-.177.2-.303.302-.505.101-.202.051-.379-.025-.529-.076-.151-.659-1.587-.902-2.174-.237-.57-.478-.492-.659-.501-.17-.008-.364-.01-.559-.01-.196 0-.514.073-.784.364-.269.298-1.027 1.003-1.027 2.443s1.047 2.83 1.194 3.025c.148.197 2.059 3.144 4.988 4.407.697.301 1.242.482 1.667.617.701.223 1.34.191 1.844.116.562-.083 1.787-.73 2.036-1.436.249-.705.249-1.309.176-1.436-.073-.127-.269-.197-.57-.348z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Column 3: Newsletter Subscribe Notification module */}
            <div className="space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60 backdrop-blur-xs">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                <span>Subscribe to Newsletter</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your email address to receive dynamic order notifications, daily stock reminders and custom vouchers.
              </p>

              <form onSubmit={handleSubscribeSubmit} className="space-y-4">
                {/* 1. Email input option on top */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Email Address (ইমেইল এড্রেস)</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      required
                      value={subEmail}
                      onChange={(e) => setSubEmail(e.target.value)}
                      placeholder="e.g. name@gmail.com"
                      className="w-full bg-slate-950 pl-10 pr-3 py-2.5 text-xs text-white border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1877F2] font-semibold transition-all placeholder:text-slate-600"
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* 2. Subscribers count and beautiful account/avatar images below the email input */}
                <div 
                  onClick={handleSubscriberListClick}
                  className={`p-3 rounded-xl border space-y-2.5 transition-all duration-300 ${
                    settings.showSubscribersToCustomers !== false
                      ? 'bg-slate-950/60 border-slate-800/40 hover:bg-slate-900/80 hover:border-blue-500/30 cursor-pointer active:scale-[0.98]'
                      : 'bg-slate-950/30 border-slate-900/50 cursor-not-allowed opacity-80'
                  }`}
                  title={settings.showSubscribersToCustomers !== false ? "Click to verify subscriber list legitimacy" : "Subscriber list view disabled by admin"}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-bold">Total Subscribers:</span>
                    <span className="text-xs text-green-400 font-extrabold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1">
                      <span>{subscribers.length} Active Customers</span>
                      {settings.showSubscribersToCustomers !== false && (
                        <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                      )}
                    </span>
                  </div>
                  
                  {/* Avatar / Account circles as requested */}
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 overflow-hidden">
                      {subscribers.slice(0, 5).map((sub, idx) => {
                        const avatarColors = [
                          'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white',
                          'bg-gradient-to-tr from-purple-500 to-pink-500 text-white',
                          'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white',
                          'bg-gradient-to-tr from-amber-500 to-orange-500 text-white',
                          'bg-gradient-to-tr from-rose-500 to-red-500 text-white',
                        ];
                        const colorClass = avatarColors[idx % avatarColors.length];
                        return (
                          <div 
                            key={sub.id} 
                            className={`inline-block h-7 w-7 rounded-full border-2 border-slate-950 flex items-center justify-center overflow-hidden font-black text-[10px] uppercase shadow-lg transform hover:-translate-y-0.5 transition-transform ${colorClass}`}
                            title={sub.email}
                          >
                            {sub.avatar ? (
                              <img src={sub.avatar} alt="Subscriber" className="h-full w-full object-cover" />
                            ) : (
                              sub.email.charAt(0)
                            )}
                          </div>
                        );
                      })}
                      {subscribers.length > 5 && (
                        <div className="inline-block h-7 w-7 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center font-bold text-[10px] text-slate-300 shadow-lg">
                          +{subscribers.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">
                      {settings.showSubscribersToCustomers !== false 
                        ? 'Click here to verify who subscribed (সততা যাচাই করতে ক্লিক করুন)' 
                        : 'Join our fast-growing community of fashion lovers!'}
                    </span>
                  </div>
                </div>

                {/* 3. High-contrast beautiful subscribe button on bottom */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl transition-all duration-300 text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 border border-blue-500/30 transform hover:-translate-y-0.5 active:translate-y-0 hover:shadow-blue-500/30 relative overflow-hidden group"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:animate-marquee-gentle pointer-events-none"></span>
                  <span className="tracking-wider uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] font-black">Subscribe Now (সাবস্ক্রাইব করুন)</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>

          </div>

          {/* Hidden Gate trigger for Admin: Danger icon + [don't tas] + semi-transparent opacity-20 */}
          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-[11px] text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} {settings.name}. All Rights Reserved. Manufactured strictly for fashion youngsters.
            </p>

            <div className="flex items-center gap-4">
              {/* Display unlocked Admin panel launcher if unlocked */}
              {adminUnlocked && (
                <button
                  onClick={() => setAdminAuthenticated(true)}
                  className="text-xs font-black text-[#1877F2] hover:underline flex items-center gap-1 animate-pulse"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Go to Admin Panel (অ্যাডমিন প্যানেল)</span>
                </button>
              )}

              {/* [don't tas] Hidden Option */}
              <button
                id="btn-hidden-gate"
                onClick={() => setShowPasscodeModal(true)}
                className="flex items-center gap-1.5 text-[10px] text-red-500/30 hover:text-red-500 hover:opacity-100 transition-all font-bold select-none cursor-pointer"
                title="Strictly confidential: Do not click!"
              >
                <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                <span>[don't tas]</span>
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* --- FLOATING DIALOGS & OVERLAYS --- */}

      {/* Step 1: Passcode Box Prompt Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80" id="passcode-modal">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-center">
            <div className="mx-auto h-12 w-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 animate-bounce" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-gray-900 text-sm uppercase">সংরক্ষিত অ্যাডমিন এরিয়া</h3>
              <p className="text-[11px] text-gray-500 font-semibold leading-normal">
                প্রবেশাধিকার পেতে সঠিক পাসকোড (Passcode) ইনপুট দিন। (নিরাপত্তার স্বার্থে পাসকোডটি হাইড করা হয়েছে)
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="space-y-3">
              <input 
                type="password" 
                required
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter passcode to unlock admin panel link"
                autoComplete="off"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-center font-black focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              
              {passcodeError && (
                <p className="text-[10px] text-red-500 font-bold">ভুল পাসকোড! অনুগ্রহ করে সঠিক পাসকোডটি দিয়ে আবার চেষ্টা করুন।</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscodeInput('');
                    setPasscodeError(false);
                  }}
                  className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cart & Checkout Slide Overlay Drawer */}
      <CartCheckout 
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        directProductCheckout={directCheckoutItem}
        onClearDirectCheckout={() => setDirectCheckoutItem(null)}
      />

      {/* Customer User Account Login / Profile Modal */}
      <UserProfileModal 
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Full Screen Admin Panel Modal */}
      <AdminPanel 
        isOpen={adminAuthenticated}
        onClose={() => setAdminAuthenticated(false)}
      />

      {/* Product Details & Commenting Showcase Modal */}
      <ProductDetailsModal
        product={activeDetailProduct}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onBuyNow={(p, size, color) => {
          setDetailModalOpen(false);
          handleBuyNowFromCard(p, size, color);
        }}
        onOpenProductDetails={handleOpenProductDetails}
        onAddToCart={() => {
          setDetailModalOpen(false);
          // Just close modal silently, do not open cart drawer
        }}
      />

      {/* Subscriber List Viewer Modal (to prove legitimacy) */}
      {subscriberListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-fade-in animate-duration-200" id="subscriber-list-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[80vh] relative animate-scale-up">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#1877F2]" />
                <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wide">
                  Verified Subscribers (গ্রাহক তালিকা)
                </h3>
              </div>
              <button 
                onClick={() => setSubscriberListOpen(false)} 
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 font-bold mb-4 shrink-0 leading-normal">
              YOUNG Style-এর প্রতি বিশ্বস্ততা ও সততা প্রদর্শনের লক্ষ্যে আমাদের প্রকৃত নিউজলেটার সাবস্ক্রাইবারদের ভেরিফাইড তালিকা নিচে দেওয়া হলো:
            </p>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl bg-gray-50/50 p-1.5">
              {subscribers.map((sub, idx) => {
                const parts = sub.email.split('@');
                const username = parts[0] || '';
                const domain = parts[1] || '';
                const maskedUsername = username.length > 3 
                  ? `${username.slice(0, 3)}***` 
                  : `${username.slice(0, 1)}***`;
                const maskedEmail = `${maskedUsername}@${domain}`;

                return (
                  <div key={sub.id} className="flex items-center justify-between gap-3 p-3 hover:bg-white transition-colors text-xs rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400 w-4">{idx + 1}.</span>
                      {/* Avatar circle */}
                      <div className="h-8 w-8 rounded-full bg-[#1877F2]/10 text-[#1877F2] font-black flex items-center justify-center overflow-hidden uppercase text-xs shrink-0">
                        {sub.avatar ? (
                          <img src={sub.avatar} alt="Subscriber Avatar" className="h-full w-full object-cover" />
                        ) : (
                          sub.email.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-gray-800 block truncate" title="Security protected subscriber email">
                          {maskedEmail}
                        </span>
                        <span className="text-[9px] text-gray-400 font-semibold block mt-0.5">
                          Subscribed: {new Date(sub.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest flex items-center gap-0.5 shrink-0 select-none">
                      <Check className="h-2.5 w-2.5" />
                      Verified
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end shrink-0">
              <button
                onClick={() => setSubscriberListOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-lg transition-colors uppercase"
              >
                Close (বন্ধ করুন)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Support Widget */}
      <AIAssistantWidget />

    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <MainAppContent />
    </AppStateProvider>
  );
}
