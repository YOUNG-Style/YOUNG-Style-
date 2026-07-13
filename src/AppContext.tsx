import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Order, Coupon, Subscriber, WebsiteSettings, SocialMediaLinks, VisitorStats, CourierSettings, PaymentNumbers, UserProfile } from './types';
import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
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
  deleteCategory: (cat: string) => void;
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

  // --- Safe Firestore Writer Wrappers to show beautiful permission/rules error alerts ---
  const safeSetDoc = async (docRef: any, data: any, options?: any, silent = false) => {
    try {
      if (options) {
        await setDoc(docRef, data, options);
      } else {
        await setDoc(docRef, data);
      }
    } catch (error: any) {
      console.error("Firestore write failed:", error);
      if (!silent) {
        const msg = error.message || '';
        if (msg.includes("permission") || msg.includes("Permission")) {
          alert("Firestore Permission Denied (ফায়ারস্টোর পারমিশন ইরর):\n\nআপনার ফায়ারস্টোর ডাটাবেজের সিকিউরিটি রুলস (Security Rules) রাইট পারমিশন ব্লক করছে! অনুগ্রহ করে আপনার Firebase Console-এ গিয়ে Firestore Rules পরিবর্তন করে 'allow read, write: if true;' বা উপযুক্ত পারমিশন দিন, অন্যথায় পেজ রিফ্রেশ করলে ডাটা মুছে যাবে।");
        } else {
          alert("Firestore Write Error (ফায়ারস্টোর রাইট ইরর):\n\n" + error.message);
        }
      }
    }
  };

  const safeDeleteDoc = async (docRef: any, silent = false) => {
    try {
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error("Firestore delete failed:", error);
      if (!silent) {
        const msg = error.message || '';
        if (msg.includes("permission") || msg.includes("Permission")) {
          alert("Firestore Permission Denied (ফায়ারস্টোর পারমিশন ইরর):\n\nআপনার ফায়ারস্টোর ডাটাবেজের সিকিউরিটি রুলস ডিলিট পারমিশন ব্লক করছে! অনুগ্রহ করে আপনার Firebase Console-এ গিয়ে Firestore Rules পরিবর্তন করুন।");
        } else {
          alert("Firestore Delete Error (ফায়ারস্টোর ডিলিট ইরর):\n\n" + error.message);
        }
      }
    }
  };

  // --- Real-time Firestore Sync ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Product);
      });
      if (list.length > 0) {
        setProducts(list);
      } else {
        // First load seeding
        INITIAL_PRODUCTS.forEach(p => {
          safeSetDoc(doc(db, 'products', p.id), p, undefined, true);
        });
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'categories'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.list) {
          setCategories(data.list);
        }
      } else {
        safeSetDoc(doc(db, 'settings', 'categories'), { list: ['Trending', 'Shirt', 'T-Shirt', 'All Product'] }, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Order);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const list: Coupon[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Coupon);
      });
      if (list.length > 0) {
        setCoupons(list);
      } else {
        INITIAL_COUPONS.forEach(c => {
          safeSetDoc(doc(db, 'coupons', c.id), c, undefined, true);
        });
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'subscribers'), (snapshot) => {
      const list: Subscriber[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Subscriber);
      });
      if (list.length > 0) {
        setSubscribers(list);
      } else {
        INITIAL_SUBSCRIBERS.forEach(s => {
          safeSetDoc(doc(db, 'subscribers', s.id), s, undefined, true);
        });
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'website'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as WebsiteSettings);
      } else {
        safeSetDoc(doc(db, 'settings', 'website'), INITIAL_SETTINGS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'social'), (snapshot) => {
      if (snapshot.exists()) {
        setSocialLinks(snapshot.data() as SocialMediaLinks);
      } else {
        safeSetDoc(doc(db, 'settings', 'social'), INITIAL_SOCIAL_LINKS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'courier'), (snapshot) => {
      if (snapshot.exists()) {
        setCourierSettings(snapshot.data() as CourierSettings);
      } else {
        safeSetDoc(doc(db, 'settings', 'courier'), INITIAL_COURIER_SETTINGS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'payments'), (snapshot) => {
      if (snapshot.exists()) {
        setPaymentNumbers(snapshot.data() as PaymentNumbers);
      } else {
        safeSetDoc(doc(db, 'settings', 'payments'), INITIAL_PAYMENT_NUMBERS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'visitorStats'), (snapshot) => {
      if (snapshot.exists()) {
        setVisitorStats(snapshot.data() as VisitorStats);
      } else {
        safeSetDoc(doc(db, 'settings', 'visitorStats'), INITIAL_VISITOR_STATS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        list.push({ email: doc.id, ...doc.data() } as UserProfile);
      });
      setRegisteredUsers(list);
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, []);

  // --- Visitor counter tracking ---
  const trackNewVisit = (region?: string) => {
    const defaultRegion = region || 'Dhaka';
    setVisitorStats(prev => {
      const updatedRegions = { ...prev.visitsByRegion };
      updatedRegions[defaultRegion] = (updatedRegions[defaultRegion] || 0) + 1;
      const updated = {
        ...prev,
        todayCount: prev.todayCount + 1,
        weeklyCount: prev.weeklyCount + 1,
        monthlyCount: prev.monthlyCount + 1,
        totalCount: prev.totalCount + 1,
        visitsByRegion: updatedRegions
      };
      safeSetDoc(doc(db, 'settings', 'visitorStats'), updated, undefined, true);
      return updated;
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
    safeSetDoc(doc(db, 'products', id), newProduct);
  };

  const updateProduct = (p: Product) => {
    setProducts(prev => prev.map(item => item.id === p.id ? p : item));
    safeSetDoc(doc(db, 'products', p.id), p);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(item => item.id !== id));
    safeDeleteDoc(doc(db, 'products', id));
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
    safeSetDoc(doc(db, 'orders', newOrder.id), newOrder);

    // Subtract stock quantities
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const item = orderData.items.find(i => i.productId === p.id);
        if (item) {
          const updatedQty = Math.max(0, p.quantity - item.quantity);
          const updatedSold = p.sold + item.quantity;
          const updatedP = { ...p, quantity: updatedQty, sold: updatedSold };
          safeSetDoc(doc(db, 'products', p.id), updatedP);
          return updatedP;
        }
        return p;
      });
    });

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, newStatus: 'Confirmed' | 'Rejected') => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        const updatedOrd = { ...ord, status: newStatus };
        safeSetDoc(doc(db, 'orders', orderId), updatedOrd);
        return updatedOrd;
      }
      return ord;
    }));
  };

  const addCoupon = (c: Omit<Coupon, 'id'>) => {
    const id = `C-${Date.now()}`;
    const newCoupon = { ...c, id };
    setCoupons(prev => [...prev, newCoupon]);
    safeSetDoc(doc(db, 'coupons', id), newCoupon);
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    safeDeleteDoc(doc(db, 'coupons', id));
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
    safeSetDoc(doc(db, 'subscribers', newSub.id), newSub);
    return true;
  };

  const deleteSubscriber = (id: string) => {
    setSubscribers(prev => prev.filter(s => s.id !== id));
    safeDeleteDoc(doc(db, 'subscribers', id));
  };

  const updateSettings = (s: WebsiteSettings) => {
    setSettings(s);
    safeSetDoc(doc(db, 'settings', 'website'), s);
  };

  const updateSocialLinks = (l: SocialMediaLinks) => {
    setSocialLinks(l);
    safeSetDoc(doc(db, 'settings', 'social'), l);
  };

  const updateCourierSettings = (c: CourierSettings) => {
    setCourierSettings(c);
    safeSetDoc(doc(db, 'settings', 'courier'), c);
  };

  const updatePaymentNumbers = (p: PaymentNumbers) => {
    setPaymentNumbers(p);
    safeSetDoc(doc(db, 'settings', 'payments'), p);
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

      if (updated.email) {
        const userKey = updated.email.toLowerCase();
        safeSetDoc(doc(db, 'users', userKey), updated, { merge: true });
      }

      return updated;
    });
  };

  const addCategory = (cat: string) => {
    if (!categories.includes(cat)) {
      const updatedCategories = [...categories, cat];
      setCategories(updatedCategories);
      safeSetDoc(doc(db, 'settings', 'categories'), { list: updatedCategories });
    }
  };

  const deleteCategory = (cat: string) => {
    // Keep 'All Product' and 'Trending' as safe default categories
    if (cat === 'All Product' || cat === 'Trending') {
      alert("This is a core default category and cannot be deleted! (এটি একটি ডিফল্ট ক্যাটাগরি এবং এটি ডিলিট করা যাবে না)");
      return;
    }
    if (confirm(`Are you sure you want to delete category "${cat}"? (আপনি কি নিশ্চিত যে আপনি "${cat}" ক্যাটাগরি ডিলিট করতে চান?)`)) {
      const updatedCategories = categories.filter(c => c !== cat);
      setCategories(updatedCategories);
      safeSetDoc(doc(db, 'settings', 'categories'), { list: updatedCategories });
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
      deleteCategory,
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
