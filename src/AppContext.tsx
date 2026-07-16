import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Order, Coupon, Subscriber, WebsiteSettings, SocialMediaLinks, VisitorStats, CourierSettings, PaymentNumbers, UserProfile } from './types';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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

// Helper to get deterministic user document key for Firestore
const getUserDocKey = (user: any): string => {
  if (!user) return '';
  if (user.loginMethod === 'phone' || (!user.loginMethod && user.phone && !user.email)) {
    const phoneVal = user.phone || '';
    const cleanPhone = phoneVal.replace(/\D/g, '');
    let finalPhone = cleanPhone;
    if (cleanPhone.startsWith('880') && cleanPhone.length > 10) {
      finalPhone = cleanPhone.substring(3);
    } else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) {
      finalPhone = cleanPhone.substring(1);
    }
    if (!finalPhone.startsWith('0')) {
      finalPhone = '0' + finalPhone;
    }
    return `phone_${finalPhone}@youngstyle.com`;
  }
  return user.email ? user.email.toLowerCase() : '';
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
  clearAllSampleData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Track whether database has been initially seeded ---
  const [dbSeeded, setDbSeeded] = useState<boolean | null>(null);

  // --- Load Initial States from Firestore (no more localStorage limit errors!) ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['Trending', 'Shirt', 'T-Shirt', 'All Product']);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings>(INITIAL_SETTINGS);
  const [socialLinks, setSocialLinks] = useState<SocialMediaLinks>(INITIAL_SOCIAL_LINKS);
  const [courierSettings, setCourierSettings] = useState<CourierSettings>(INITIAL_COURIER_SETTINGS);
  const [paymentNumbers, setPaymentNumbers] = useState<PaymentNumbers>(INITIAL_PAYMENT_NUMBERS);
  const [visitorStats, setVisitorStats] = useState<VisitorStats>(INITIAL_VISITOR_STATS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = safeLocalStorage.getItem('ys_user');
    return safeJsonParse<UserProfile>(saved, { name: '', email: '', phone: '', address: '', district: '', isLoggedIn: false });
  });
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);

  // --- Session UI States ---
  const [cart, setCart] = useState<{ product: Product; quantity: number; size: string; color: string }[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Product');

  // --- Synchronize Current User with Safe LocalStorage ---
  useEffect(() => {
    if (currentUser && currentUser.isLoggedIn) {
      safeLocalStorage.setItem('ys_user', JSON.stringify(currentUser));
    } else {
      try {
        localStorage.removeItem('ys_user');
      } catch (e) {
        console.warn('localStorage is not available:', e);
      }
    }
  }, [currentUser]);

  // --- Listen to Firebase Authentication State ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const emailVal = firebaseUser.email ? firebaseUser.email.toLowerCase() : '';
        if (emailVal) {
          try {
            const userDoc = await getDoc(doc(db, 'users', emailVal));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setCurrentUser({
                name: data.name || firebaseUser.displayName || '',
                email: data.email || emailVal,
                phone: data.phone || '',
                address: data.address || '',
                district: data.district || '',
                avatar: data.avatar || firebaseUser.photoURL || '',
                loginMethod: data.loginMethod || 'google',
                password: data.password || '',
                isLoggedIn: true
              });
            } else {
              // Create user doc if not exists
              const newUser: UserProfile = {
                name: firebaseUser.displayName || '',
                email: emailVal,
                phone: '',
                address: '',
                district: '',
                avatar: firebaseUser.photoURL || '',
                loginMethod: 'google',
                isLoggedIn: true
              };
              await setDoc(doc(db, 'users', emailVal), newUser, { merge: true });
              setCurrentUser(newUser);
            }
          } catch (err) {
            console.error("Error fetching user profile from Firestore:", err);
            setCurrentUser({
              name: firebaseUser.displayName || '',
              email: emailVal,
              phone: '',
              address: '',
              district: '',
              avatar: firebaseUser.photoURL || '',
              loginMethod: 'google',
              isLoggedIn: true
            });
          }
        }
      } else {
        // Fallback to local storage user if firebase user is not found, to keep them logged in across iframe refresh
        const saved = safeLocalStorage.getItem('ys_user');
        const localUser = safeJsonParse<UserProfile>(saved, { name: '', email: '', phone: '', address: '', district: '', isLoggedIn: false });
        if (localUser.isLoggedIn) {
          setCurrentUser(localUser);
        } else {
          setCurrentUser({ name: '', email: '', phone: '', address: '', district: '', isLoggedIn: false });
        }
      }
    });
    return () => unsubscribe();
  }, []);

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
  // Listen to initialization status
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'initialization'), (snapshot) => {
      if (snapshot.exists()) {
        setDbSeeded(true);
      } else {
        setDbSeeded(false);
      }
    }, (error) => {
      console.error("Firestore read error for initialization:", error);
      // Fallback to true to prevent accidental seeding if permission is restricted
      setDbSeeded(true);
    });
    return () => unsubscribe();
  }, []);

  // Run first-time database seeding if needed
  useEffect(() => {
    if (dbSeeded === false) {
      const runSeeding = async () => {
        try {
          console.log("Database not seeded. Running first-time initialization...");
          // Perform all first-time seeding
          await safeSetDoc(doc(db, 'settings', 'categories'), { list: ['Trending', 'Shirt', 'T-Shirt', 'All Product'] }, undefined, true);
          
          for (const p of INITIAL_PRODUCTS) {
            await safeSetDoc(doc(db, 'products', p.id), p, undefined, true);
          }
          
          for (const c of INITIAL_COUPONS) {
            await safeSetDoc(doc(db, 'coupons', c.id), c, undefined, true);
          }
          
          for (const s of INITIAL_SUBSCRIBERS) {
            await safeSetDoc(doc(db, 'subscribers', s.id), s, undefined, true);
          }
          
          await safeSetDoc(doc(db, 'settings', 'website'), INITIAL_SETTINGS, undefined, true);
          await safeSetDoc(doc(db, 'settings', 'social'), INITIAL_SOCIAL_LINKS, undefined, true);
          await safeSetDoc(doc(db, 'settings', 'courier'), INITIAL_COURIER_SETTINGS, undefined, true);
          await safeSetDoc(doc(db, 'settings', 'payments'), INITIAL_PAYMENT_NUMBERS, undefined, true);
          await safeSetDoc(doc(db, 'settings', 'visitorStats'), INITIAL_VISITOR_STATS, undefined, true);
          
          // Mark as seeded
          await safeSetDoc(doc(db, 'settings', 'initialization'), { seeded: true }, undefined, true);
          console.log("Initialization seeding completed successfully!");
        } catch (err) {
          console.error("One-time seeding failed:", err);
        }
      };
      runSeeding();
    }
  }, [dbSeeded]);

  useEffect(() => {
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Product);
      });
      if (list.length > 0) {
        setProducts(list);
      } else {
        if (dbSeeded === false) {
          INITIAL_PRODUCTS.forEach(p => {
            safeSetDoc(doc(db, 'products', p.id), p, undefined, true);
          });
        } else {
          setProducts([]);
        }
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

  useEffect(() => {
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'categories'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.list) {
          setCategories(data.list);
        }
      } else if (dbSeeded === false) {
        safeSetDoc(doc(db, 'settings', 'categories'), { list: ['Trending', 'Shirt', 'T-Shirt', 'All Product'] }, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

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
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const list: Coupon[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Coupon);
      });
      if (list.length > 0) {
        setCoupons(list);
      } else {
        if (dbSeeded === false) {
          INITIAL_COUPONS.forEach(c => {
            safeSetDoc(doc(db, 'coupons', c.id), c, undefined, true);
          });
        } else {
          setCoupons([]);
        }
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

  useEffect(() => {
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(collection(db, 'subscribers'), (snapshot) => {
      const list: Subscriber[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Subscriber);
      });
      if (list.length > 0) {
        setSubscribers(list);
      } else {
        if (dbSeeded === false) {
          INITIAL_SUBSCRIBERS.forEach(s => {
            safeSetDoc(doc(db, 'subscribers', s.id), s, undefined, true);
          });
        } else {
          setSubscribers([]);
        }
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

  useEffect(() => {
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'website'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as WebsiteSettings);
      } else if (dbSeeded === false) {
        safeSetDoc(doc(db, 'settings', 'website'), INITIAL_SETTINGS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

  useEffect(() => {
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'social'), (snapshot) => {
      if (snapshot.exists()) {
        setSocialLinks(snapshot.data() as SocialMediaLinks);
      } else if (dbSeeded === false) {
        safeSetDoc(doc(db, 'settings', 'social'), INITIAL_SOCIAL_LINKS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

  useEffect(() => {
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'courier'), (snapshot) => {
      if (snapshot.exists()) {
        setCourierSettings(snapshot.data() as CourierSettings);
      } else if (dbSeeded === false) {
        safeSetDoc(doc(db, 'settings', 'courier'), INITIAL_COURIER_SETTINGS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

  useEffect(() => {
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'payments'), (snapshot) => {
      if (snapshot.exists()) {
        setPaymentNumbers(snapshot.data() as PaymentNumbers);
      } else if (dbSeeded === false) {
        safeSetDoc(doc(db, 'settings', 'payments'), INITIAL_PAYMENT_NUMBERS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

  useEffect(() => {
    if (dbSeeded === null) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'visitorStats'), (snapshot) => {
      if (snapshot.exists()) {
        setVisitorStats(snapshot.data() as VisitorStats);
      } else if (dbSeeded === false) {
        safeSetDoc(doc(db, 'settings', 'visitorStats'), INITIAL_VISITOR_STATS, undefined, true);
      }
    }, (error) => {
      console.error("Firestore read error:", error);
    });
    return () => unsubscribe();
  }, [dbSeeded]);

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

      const userKey = getUserDocKey(updated);
      if (userKey) {
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

  const clearAllSampleData = async () => {
    try {
      // 1. Delete all products from Firestore
      for (const p of products) {
        await safeDeleteDoc(doc(db, 'products', p.id), true);
      }
      setProducts([]);

      // 2. Delete all coupons
      for (const c of coupons) {
        await safeDeleteDoc(doc(db, 'coupons', c.id), true);
      }
      setCoupons([]);

      // 3. Delete all subscribers
      for (const s of subscribers) {
        await safeDeleteDoc(doc(db, 'subscribers', s.id), true);
      }
      setSubscribers([]);

      // 4. Reset website settings to clear blank info
      const blankSettings: WebsiteSettings = {
        name: 'My Store',
        email: '',
        phone: '',
        address: '',
        logo: '',
        banners: [],
        description: '',
        discountBannerText: '',
        showSubscribersToCustomers: false,
        bannerBadge: '',
        bannerTitle: '',
        bannerDescription: '',
        popupAdImage: '',
        showPopupAd: false
      };
      await safeSetDoc(doc(db, 'settings', 'website'), blankSettings);
      setSettings(blankSettings);

      // 5. Reset social links
      const blankSocial: SocialMediaLinks = {
        facebook: '',
        instagram: '',
        youtube: '',
        tiktok: '',
        whatsapp: ''
      };
      await safeSetDoc(doc(db, 'settings', 'social'), blankSocial);
      setSocialLinks(blankSocial);

      // 6. Reset payment numbers
      const blankPayments: PaymentNumbers = {
        bkash: '',
        nagad: '',
        codBkash: '',
        codNagad: ''
      };
      await safeSetDoc(doc(db, 'settings', 'payments'), blankPayments);
      setPaymentNumbers(blankPayments);

      // Make sure initialization is marked true
      await safeSetDoc(doc(db, 'settings', 'initialization'), { seeded: true }, undefined, true);
      setDbSeeded(true);

      alert("All sample/demo data has been completely cleared! Now you can add your own banners, products, and contact info from the Admin Panel. (সব ডেমো প্রোডাক্ট, ব্যানার ও তথ্য মুছে ফেলা হয়েছে! এখন আপনি নিজের মতো করে সব যুক্ত করতে পারবেন।)");
    } catch (error) {
      console.error("Error clearing sample data:", error);
      alert("Failed to clear sample data: " + error);
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
      trackNewVisit,
      clearAllSampleData
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
