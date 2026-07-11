import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Order, Coupon, Subscriber, WebsiteSettings, SocialMediaLinks, VisitorStats, CourierSettings, PaymentNumbers, UserProfile } from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_COUPONS, 
  INITIAL_SUBSCRIBERS, 
  INITIAL_SETTINGS, 
  INITIAL_SOCIAL_LINKS, 
  INITIAL_COURIER_SETTINGS, 
  INITIAL_PAYMENT_NUMBERS, 
  INITIAL_VISITOR_STATS,
  BANGLADESH_DISTRICTS
} from './initialData';

// Safe localStorage wrapper to prevent "SecurityError: Access is denied" inside sandboxed browser iframes
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage is not available:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
  }
};

// Safe sessionStorage wrapper
const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn('sessionStorage is not available:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('sessionStorage is not available:', e);
    }
  }
};

// Safe JSON parser to handle corrupt values smoothly
const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    console.warn('Failed to parse JSON from storage:', e);
    return fallback;
  }
};

interface AppContextType {
  products: Product[];
  categories: string[];
  orders: Order[];
  coupons: Coupon[];
  subscribers: Subscriber[];
  settings: WebsiteSettings;
  socialLinks: SocialMediaLinks;
  courierSettings: CourierSettings;
  paymentNumbers: PaymentNumbers;
  visitorStats: VisitorStats;
  currentUser: UserProfile;
  registeredUsers: UserProfile[];
  cart: { product: Product; quantity: number; size: string; color: string }[];
  activeCoupon: Coupon | null;
  adminAuthenticated: boolean;
  adminUnlocked: boolean; // First phase: passcode correct
  activeCategory: string; // Left side category selection

  // Operations
  addProduct: (p: Omit<Product, 'id' | 'sold' | 'ratings'>) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  addOrder: (orderData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerDistrict: string;
    customerAddress: string;
    selectedSize: string;
    selectedColor: string;
    paymentMethod: 'cod' | 'bkash' | 'nagad';
    paymentPhone?: string;
    transactionId?: string;
    couponUsed?: string;
    discountAmount: number;
    deliveryCharge: number;
    totalAmount: number;
    items: { productId: string; productName: string; price: number; quantity: number; size: string; color: string; image: string }[];
  }) => Order;
  updateOrderStatus: (orderId: string, newStatus: 'Confirmed' | 'Rejected') => void;
  addCoupon: (c: Omit<Coupon, 'id'>) => void;
  deleteCoupon: (id: string) => void;
  addSubscriber: (email: string) => boolean;
  deleteSubscriber: (id: string) => void;
  updateSettings: (s: WebsiteSettings) => void;
  updateSocialLinks: (l: SocialMediaLinks) => void;
  updateCourierSettings: (c: CourierSettings) => void;
  updatePaymentNumbers: (p: PaymentNumbers) => void;
  updateUserProfile: (u: Partial<UserProfile>) => void;
  addCategory: (cat: string) => void;
  setCart: React.Dispatch<React.SetStateAction<{ product: Product; quantity: number; size: string; color: string }[]>>;
  setActiveCoupon: (c: Coupon | null) => void;
  setAdminAuthenticated: (auth: boolean) => void;
  setAdminUnlocked: (unlocked: boolean) => void;
  setActiveCategory: (cat: string) => void;
  trackNewVisit: (region?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Load Initial States from LocalStorage if available ---
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = safeLocalStorage.getItem('ys_products');
    return safeJsonParse<Product[]>(saved, INITIAL_PRODUCTS);
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = safeLocalStorage.getItem('ys_categories');
    return safeJsonParse<string[]>(saved, ['Trending', 'Shirt', 'T-Shirt', 'All Product']);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = safeLocalStorage.getItem('ys_orders');
    return safeJsonParse<Order[]>(saved, []);
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = safeLocalStorage.getItem('ys_coupons');
    return safeJsonParse<Coupon[]>(saved, INITIAL_COUPONS);
  });

  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    const saved = safeLocalStorage.getItem('ys_subscribers');
    return safeJsonParse<Subscriber[]>(saved, INITIAL_SUBSCRIBERS);
  });

  const [settings, setSettings] = useState<WebsiteSettings>(() => {
    const saved = safeLocalStorage.getItem('ys_settings');
    return safeJsonParse<WebsiteSettings>(saved, INITIAL_SETTINGS);
  });

  const [socialLinks, setSocialLinks] = useState<SocialMediaLinks>(() => {
    const saved = safeLocalStorage.getItem('ys_social');
    return safeJsonParse<SocialMediaLinks>(saved, INITIAL_SOCIAL_LINKS);
  });

  const [courierSettings, setCourierSettings] = useState<CourierSettings>(() => {
    const saved = safeLocalStorage.getItem('ys_courier');
    return safeJsonParse<CourierSettings>(saved, INITIAL_COURIER_SETTINGS);
  });

  const [paymentNumbers, setPaymentNumbers] = useState<PaymentNumbers>(() => {
    const saved = safeLocalStorage.getItem('ys_payments');
    return safeJsonParse<PaymentNumbers>(saved, INITIAL_PAYMENT_NUMBERS);
  });

  const [visitorStats, setVisitorStats] = useState<VisitorStats>(() => {
    const saved = safeLocalStorage.getItem('ys_visitors');
    return safeJsonParse<VisitorStats>(saved, INITIAL_VISITOR_STATS);
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = safeLocalStorage.getItem('ys_user');
    return safeJsonParse<UserProfile>(saved, { name: '', email: '', phone: '', address: '', district: '', isLoggedIn: false });
  });

  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>(() => {
    const saved = safeLocalStorage.getItem('ys_registered_users');
    return safeJsonParse<UserProfile[]>(saved, []);
  });

  // --- Session UI States ---
  const [cart, setCart] = useState<{ product: Product; quantity: number; size: string; color: string }[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Product');

  // --- Sync to LocalStorage whenever states modify ---
  useEffect(() => { safeLocalStorage.setItem('ys_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { safeLocalStorage.setItem('ys_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { safeLocalStorage.setItem('ys_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { safeLocalStorage.setItem('ys_coupons', JSON.stringify(coupons)); }, [coupons]);
  useEffect(() => { safeLocalStorage.setItem('ys_subscribers', JSON.stringify(subscribers)); }, [subscribers]);
  useEffect(() => { safeLocalStorage.setItem('ys_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { safeLocalStorage.setItem('ys_social', JSON.stringify(socialLinks)); }, [socialLinks]);
  useEffect(() => { safeLocalStorage.setItem('ys_courier', JSON.stringify(courierSettings)); }, [courierSettings]);
  useEffect(() => { safeLocalStorage.setItem('ys_payments', JSON.stringify(paymentNumbers)); }, [paymentNumbers]);
  useEffect(() => { safeLocalStorage.setItem('ys_visitors', JSON.stringify(visitorStats)); }, [visitorStats]);
  useEffect(() => { safeLocalStorage.setItem('ys_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { safeLocalStorage.setItem('ys_registered_users', JSON.stringify(registeredUsers)); }, [registeredUsers]);

  // --- Visitor counter tracking ---
  const trackNewVisit = (region?: string) => {
    const defaultRegion = region || 'Dhaka';
    setVisitorStats(prev => {
      const updatedRegions = { ...prev.visitsByRegion };
      updatedRegions[defaultRegion] = (updatedRegions[defaultRegion] || 0) + 1;
      return {
        ...prev,
        todayCount: prev.todayCount + 1,
        weeklyCount: prev.weeklyCount + 1,
        monthlyCount: prev.monthlyCount + 1,
        totalCount: prev.totalCount + 1,
        visitsByRegion: updatedRegions
      };
    });
  };

  useEffect(() => {
    // Only track once per page session
    const hasVisited = safeSessionStorage.getItem('ys_session_visited');
    if (!hasVisited) {
      // Pick random region from Bangladesh, India, Pakistan, Others for realism
      const regions = [...BANGLADESH_DISTRICTS, 'India', 'Pakistan', 'Others'];
      const randomRegion = regions[Math.floor(Math.random() * regions.length)];
      trackNewVisit(randomRegion);
      safeSessionStorage.setItem('ys_session_visited', 'true');
    }
  }, []);

  // --- CRUD API Helpers ---

  const addProduct = (p: Omit<Product, 'id' | 'sold'>) => {
    const id = `P-${Date.now()}`;
    const newProduct: Product = {
      ...p,
      id,
      sold: 0,
      ratings: p.ratings || [5] // initial rating if not specified
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (p: Product) => {
    setProducts(prev => prev.map(item => item.id === p.id ? p : item));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(item => item.id !== id));
  };

  const addOrder = (orderData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerDistrict: string;
    customerAddress: string;
    selectedSize: string;
    selectedColor: string;
    paymentMethod: 'cod' | 'bkash' | 'nagad';
    paymentPhone?: string;
    transactionId?: string;
    couponUsed?: string;
    discountAmount: number;
    deliveryCharge: number;
    totalAmount: number;
    items: { productId: string; productName: string; price: number; quantity: number; size: string; color: string; image: string }[];
  }) => {
    const newOrder: Order = {
      ...orderData,
      id: `ORD-${1000 + orders.length + 1}`,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    
    // Update orders list
    setOrders(prev => [newOrder, ...prev]);

    // Subtract stock quantities
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const item = orderData.items.find(i => i.productId === p.id);
        if (item) {
          const updatedQty = Math.max(0, p.quantity - item.quantity);
          const updatedSold = p.sold + item.quantity;
          return { ...p, quantity: updatedQty, sold: updatedSold };
        }
        return p;
      });
    });

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, newStatus: 'Confirmed' | 'Rejected') => {
    setOrders(prev => prev.map(ord => ord.id === orderId ? { ...ord, status: newStatus } : ord));
  };

  const addCoupon = (c: Omit<Coupon, 'id'>) => {
    const id = `C-${Date.now()}`;
    setCoupons(prev => [...prev, { ...c, id }]);
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const addSubscriber = (email: string): boolean => {
    if (subscribers.find(s => s.email.toLowerCase() === email.toLowerCase())) {
      return false; // already subscribed
    }
    
    // Check local currentUser or check stored users
    let avatarUrl: string | undefined = undefined;
    if (currentUser && currentUser.isLoggedIn) {
      if (currentUser.email.toLowerCase() === email.toLowerCase() || currentUser.phone === email) {
        avatarUrl = currentUser.avatar;
      }
    }

    const newSub: Subscriber = {
      id: `S-${Date.now()}`,
      email,
      avatar: avatarUrl || undefined,
      createdAt: new Date().toISOString()
    };
    setSubscribers(prev => [newSub, ...prev]);
    return true;
  };

  const deleteSubscriber = (id: string) => {
    setSubscribers(prev => prev.filter(s => s.id !== id));
  };

  const updateSettings = (s: WebsiteSettings) => {
    setSettings(s);
  };

  const updateSocialLinks = (l: SocialMediaLinks) => {
    setSocialLinks(l);
  };

  const updateCourierSettings = (c: CourierSettings) => {
    setCourierSettings(c);
  };

  const updatePaymentNumbers = (p: PaymentNumbers) => {
    setPaymentNumbers(p);
  };

  const updateUserProfile = (u: Partial<UserProfile>) => {
    setCurrentUser(prev => {
      const updated = { ...prev, ...u };

      setRegisteredUsers(prevUsers => {
        const emailMatch = updated.email ? updated.email.trim().toLowerCase() : '';
        const phoneMatch = updated.phone ? updated.phone.replace(/\D/g, '') : '';
        
        const existingIdx = prevUsers.findIndex(usr => {
          const usrEmail = usr.email ? usr.email.trim().toLowerCase() : '';
          const usrPhone = usr.phone ? usr.phone.replace(/\D/g, '') : '';
          return (emailMatch && usrEmail === emailMatch) || (phoneMatch && usrPhone === phoneMatch);
        });

        if (existingIdx > -1) {
          const newUsers = [...prevUsers];
          newUsers[existingIdx] = { ...newUsers[existingIdx], ...updated };
          return newUsers;
        } else {
          if (updated.email || updated.phone) {
            return [...prevUsers, updated as UserProfile];
          }
          return prevUsers;
        }
      });

      setSubscribers(prevSubs => prevSubs.map(s => {
        const emailMatch = updated.email && s.email.toLowerCase() === updated.email.toLowerCase();
        const phoneMatch = updated.phone && (s.email.toLowerCase() === updated.phone.toLowerCase() || s.phone === updated.phone);
        if (emailMatch || phoneMatch) {
          return { ...s, avatar: updated.avatar };
        }
        return s;
      }));
      return updated;
    });
  };

  const addCategory = (cat: string) => {
    if (!categories.includes(cat)) {
      setCategories(prev => [...prev, cat]);
    }
  };

  return (
    <AppContext.Provider value={{
      products,
      categories,
      orders,
      coupons,
      subscribers,
      settings,
      socialLinks,
      courierSettings,
      paymentNumbers,
      visitorStats,
      currentUser,
      registeredUsers,
      cart,
      activeCoupon,
      adminAuthenticated,
      adminUnlocked,
      activeCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      addOrder,
      updateOrderStatus,
      addCoupon,
      deleteCoupon,
      addSubscriber,
      deleteSubscriber,
      updateSettings,
      updateSocialLinks,
      updateCourierSettings,
      updatePaymentNumbers,
      updateUserProfile,
      addCategory,
      setCart,
      setActiveCoupon,
      setAdminAuthenticated,
      setAdminUnlocked,
      setActiveCategory,
      trackNewVisit
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
};
