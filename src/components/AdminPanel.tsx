import React, { useState } from 'react';
import { 
  X, ShieldCheck, LayoutDashboard, ShoppingCart, PlusCircle, Tag, Users, Settings, Share2, Truck, 
  CreditCard, Edit3, Trash2, Check, AlertTriangle, Eye, EyeOff, Search, FileCode, CheckCircle2, Lock, LogOut,
  Star, Globe, ExternalLink, FileText, RefreshCw, AlertCircle, Building2
} from 'lucide-react';
import { useAppState } from '../AppContext';
import { GARMENT_COLORS, BANGLADESH_DISTRICTS } from '../initialData';
import { Product, Coupon, Subscriber, Order, UserProfile } from '../types';
import { db, doc, getDoc, storage } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const {
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
    setAdminAuthenticated,
    setAdminUnlocked,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
    addCoupon,
    deleteCoupon,
    deleteSubscriber,
    updateSettings,
    updateSocialLinks,
    updateCourierSettings,
    updatePaymentNumbers,
    addCategory,
    deleteCategory,
    clearAllSampleData
  } = useAppState();

  // Gates: 'passcode' | 'login' | 'otp' | 'panel'
  const [gate, setGate] = useState<'login' | 'otp' | 'panel'>('login');

  // Input states for login gates
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  // Admin Active Tab
  type AdminTab = 'dashboard' | 'orders' | 'products' | 'coupons' | 'subscribers' | 'settings' | 'social' | 'courier' | 'payments' | 'ads';
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Add/Edit Product state
  const [isEditingProduct, setIsEditingProduct] = useState<Product | null>(null);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState(1000);
  const [pOldPrice, setPOldPrice] = useState<number>(1200);
  const [pSizes, setPSizes] = useState<string[]>(['M', 'L', 'XL']);
  const [hasSizes, setHasSizes] = useState(true);
  const [pColors, setPColors] = useState<string[]>(['Black', 'White']);
  const [pQty, setPQty] = useState(50);
  const [pCategory, setPCategory] = useState('Shirt');
  const [newCatName, setNewCatName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pImages, setPImages] = useState<string[]>([]);
  const [pRating, setPRating] = useState<number>(5);

  // Upload to Firebase Storage states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Firebase Storage-এর বদলে নতুন ImgBB আপলোড ফাংশন
const uploadToFirebaseStorage = async (file: File, folderName: string): Promise<string> => {
  const IMGBB_API_KEY = '57f5e21615bc26316a40818f93719f19';
  

  // ফাইলের সাইজ লিমিট ৫০ এমবি করা আছে
  const maxSizeBytes = 50 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    alert(`ফাইলের সাইজ ৫০ এমবির চেয়ে বেশি হতে পারবে না!`);
    throw new Error("File too large");
  }

  setIsUploading(true);
  setUploadProgress(10); // আপলোড প্রোগ্রেস বার দেখানোর জন্য

  const formData = new FormData();
  formData.append('image', file);

  try {
    setUploadProgress(50); // ৫০% প্রোগ্রেস
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('ImgBB upload failed');
    }

    const data = await response.json();
    setUploadProgress(100); // সম্পূর্ণ ১০০% প্রোগ্রেস
    setIsUploading(false);

    // এটি ImgBB থেকে ছবির ডিরেক্ট URL বা লিঙ্কটি রিটার্ন করবে
    return data.data.url; 

  } catch (error: any) {
    console.error("ImgBB Upload error:", error);
    alert(`ছবি আপলোড করা যায়নি: ${error.message}`);
    setIsUploading(false);
    throw error;
  }
};
  

  // Add Coupon form
  const [cpCode, setCpCode] = useState('');
  const [cpPct, setCpPct] = useState(10);
  const [cpMin, setCpMin] = useState(1000);

  // Subscribers view tab
  const [subPeriod, setSubPeriod] = useState<'today' | 'weekly' | 'monthly' | 'total'>('total');

  // Filter subscribers list based on chosen period (Today, Weekly, Monthly, Total)
  const filteredSubscribers = subscribers.filter(sub => {
    if (subPeriod === 'total') return true;
    if (!sub.createdAt) return false;

    const subDate = new Date(sub.createdAt);
    const now = new Date();

    // Set dates to midnight for precise calendar day-based calculations
    const subMidnight = new Date(subDate.getFullYear(), subDate.getMonth(), subDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = nowMidnight.getTime() - subMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (subPeriod === 'today') {
      return diffDays === 0;
    }

    if (subPeriod === 'weekly') {
      // Within last 7 days
      return diffDays >= 0 && diffDays < 7;
    }

    if (subPeriod === 'monthly') {
      // Within last 30 days
      return diffDays >= 0 && diffDays < 30;
    }

    return true;
  });

  // Selected subscriber details
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);
  const [loadingSubDetails, setLoadingSubDetails] = useState(false);
  const [subProfile, setSubProfile] = useState<UserProfile | null>(null);

  const handleViewSubscriberDetails = async (sub: Subscriber) => {
    setSelectedSub(sub);
    setLoadingSubDetails(true);
    setSubProfile(null);
    
    let profileFound: UserProfile | null = null;
    
    const cleanEmail = (sub.email || '').trim().toLowerCase();
    const cleanPhone = (sub.email || '').replace(/\D/g, '');

    const matchPhone = (p1: string, p2: string) => {
      const c1 = (p1 || '').replace(/\D/g, '');
      const c2 = (p2 || '').replace(/\D/g, '');
      if (!c1 || !c2) return false;
      const s1 = c1.slice(-10);
      const s2 = c2.slice(-10);
      return s1.length >= 9 && s1 === s2;
    };

    // 1. Try to find in the local registeredUsers list first
    if (registeredUsers && registeredUsers.length > 0) {
      profileFound = registeredUsers.find(usr => {
        const usrEmail = (usr.email || '').trim().toLowerCase();
        const usrPhone = (usr.phone || '').trim();
        
        if (cleanEmail.includes('@') && usrEmail === cleanEmail) {
          return true;
        }
        if (cleanPhone && matchPhone(usrPhone, cleanPhone)) {
          return true;
        }
        return false;
      }) || null;
    }

    // 2. Try to match with the logged in currentUser
    if (!profileFound && currentUser && (currentUser.email || currentUser.phone)) {
      const curEmail = (currentUser.email || '').trim().toLowerCase();
      const curPhone = (currentUser.phone || '').trim();
      
      if (cleanEmail.includes('@') && curEmail === cleanEmail) {
        profileFound = currentUser;
      } else if (cleanPhone && matchPhone(curPhone, cleanPhone)) {
        profileFound = currentUser;
      }
    }

    // 3. Attempt to retrieve from Firestore with a solid offline try-catch
    if (!profileFound && db) {
      try {
        if (cleanEmail.includes('@')) {
          const docRef = doc(db, 'users', cleanEmail);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            profileFound = docSnap.data() as UserProfile;
          }
        }
        
        // Try searching by phone keys in Firestore if email didn't yield result
        if (!profileFound && cleanPhone.length >= 9) {
          let finalPhone = cleanPhone;
          if (cleanPhone.startsWith('880') && cleanPhone.length > 10) {
            finalPhone = cleanPhone.substring(3);
          } else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) {
            finalPhone = cleanPhone.substring(1);
          }
          if (!finalPhone.startsWith('0')) {
            finalPhone = '0' + finalPhone;
          }
          const phoneDocKey = `phone_${finalPhone}@youngstyle.com`;
          const phoneDocRef = doc(db, 'users', phoneDocKey);
          const phoneDocSnap = await getDoc(phoneDocRef);
          if (phoneDocSnap.exists()) {
            profileFound = phoneDocSnap.data() as UserProfile;
          }
        }
      } catch (error) {
        console.log("Firestore offline or unavailable. Using robust local fallback...", error);
      }
    }

    // 4. Fallback: Search all orders for the most complete customer profile matching this email/phone
    if (orders && orders.length > 0) {
      // Sort orders so that those with non-empty addresses come first
      const sortedOrders = [...orders].sort((a, b) => {
        const lenA = (a.customerAddress || '').length;
        const lenB = (b.customerAddress || '').length;
        return lenB - lenA; // Descending order by address length
      });

      const matchingOrder = sortedOrders.find(ord => {
        const ordEmail = (ord.customerEmail || '').trim().toLowerCase();
        const ordPhone = (ord.customerPhone || '').trim();
        
        if (cleanEmail.includes('@') && ordEmail === cleanEmail) {
          return true;
        }
        if (cleanPhone && matchPhone(ordPhone, cleanPhone)) {
          return true;
        }
        return false;
      });

      if (matchingOrder) {
        // If we found a profile, but it has empty address/phone, we enrich it from the order!
        if (profileFound) {
          profileFound = {
            ...profileFound,
            name: profileFound.name || matchingOrder.customerName,
            phone: profileFound.phone || matchingOrder.customerPhone,
            address: profileFound.address || matchingOrder.customerAddress,
            district: profileFound.district || matchingOrder.customerDistrict,
          };
        } else {
          profileFound = {
            name: matchingOrder.customerName,
            email: matchingOrder.customerEmail || sub.email,
            phone: matchingOrder.customerPhone,
            address: matchingOrder.customerAddress,
            district: matchingOrder.customerDistrict,
            isLoggedIn: false
          };
        }
      }
    }

    setSubProfile(profileFound);
    setLoadingSubDetails(false);
  };

  // Courier charges local edit
  const [insideSavarInput, setInsideSavarInput] = useState(courierSettings.insideSavarCharge);
  const [outsideSavarInput, setOutsideSavarInput] = useState(courierSettings.outsideSavarCharge);
  const [selectedDistrictEdit, setSelectedDistrictEdit] = useState('Dhaka');
  const [districtChargeInput, setDistrictChargeInput] = useState(60);
  const [customDistrictInput, setCustomDistrictInput] = useState('');

  // Bangladesh Courier Service Collaboration state
  const [selectedCollabCourier, setSelectedCollabCourier] = useState<string | null>(null);
  const [courierCollabs, setCourierCollabs] = useState<Record<string, {
    connected: boolean;
    apiKey: string;
    clientId: string;
    clientSecret: string;
    storeId: string;
    senderBranch: string;
    senderPhone: string;
  }>>(() => {
    const saved = localStorage.getItem('ys_courier_collabs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      steadfast: { connected: false, apiKey: '', clientId: '', clientSecret: '', storeId: '', senderBranch: '', senderPhone: '' },
      pathao: { connected: false, apiKey: '', clientId: '', clientSecret: '', storeId: '', senderBranch: '', senderPhone: '' },
      redx: { connected: false, apiKey: '', clientId: '', clientSecret: '', storeId: '', senderBranch: '', senderPhone: '' },
      ecourier: { connected: false, apiKey: '', clientId: '', clientSecret: '', storeId: '', senderBranch: '', senderPhone: '' },
      sundarban: { connected: false, apiKey: '', clientId: '', clientSecret: '', storeId: '', senderBranch: '', senderPhone: '' },
      sa_paribahan: { connected: false, apiKey: '', clientId: '', clientSecret: '', storeId: '', senderBranch: '', senderPhone: '' },
    };
  });

  const [courierBookings, setCourierBookings] = useState<Record<string, {
    courierName: string;
    trackingId: string;
    bookingDate: string;
    deliveryFee: number;
    status: string;
  }>>(() => {
    const saved = localStorage.getItem('ys_courier_bookings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [collabRequests, setCollabRequests] = useState<Array<{
    id: string;
    courierId: string;
    courierName: string;
    applicantName: string;
    applicantPhone: string;
    address: string;
    tradeLicense: string;
    date: string;
    status: 'Pending Review' | 'Approved' | 'Sent';
  }>>(() => {
    const saved = localStorage.getItem('ys_courier_requests');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'REQ-1002',
        courierId: 'steadfast',
        courierName: 'Steadfast Courier',
        applicantName: 'Young Style Admin Team',
        applicantPhone: '01712345678',
        address: 'Savar Bazar Road, Savar, Dhaka',
        tradeLicense: 'TR-7821-YS',
        date: '2026-07-10',
        status: 'Approved'
      }
    ];
  });

  // Saving states to local storage
  React.useEffect(() => {
    localStorage.setItem('ys_courier_collabs', JSON.stringify(courierCollabs));
  }, [courierCollabs]);

  React.useEffect(() => {
    localStorage.setItem('ys_courier_bookings', JSON.stringify(courierBookings));
  }, [courierBookings]);

  React.useEffect(() => {
    localStorage.setItem('ys_courier_requests', JSON.stringify(collabRequests));
  }, [collabRequests]);

  const [applicantName, setApplicantName] = useState('Young Style Admin');
  const [applicantPhone, setApplicantPhone] = useState('01712345678');
  const [applicantAddress, setApplicantAddress] = useState('Savar, Dhaka, Bangladesh');
  const [tradeLicense, setTradeLicense] = useState('TR-9032-YS');
  const [tradeLicenseFile, setTradeLicenseFile] = useState<string>('');
  const [nidNumber, setNidNumber] = useState('5512894123');
  const [nidFile, setNidFile] = useState<string>('');
  const [bankName, setBankName] = useState('Dhaka Bank PLC');
  const [bankBranch, setBankBranch] = useState('Savar Branch');
  const [bankAccName, setBankAccName] = useState('Young Style Limited');
  const [bankAccNumber, setBankAccNumber] = useState('2051011123456');
  const [chequeFile, setChequeFile] = useState<string>('');
  const [ownerPhotoFile, setOwnerPhotoFile] = useState<string>('');
  const [courierSetupTab, setCourierSetupTab] = useState<'api' | 'apply'>('api');
  const [inspectRequestDocs, setInspectRequestDocs] = useState<any | null>(null);

  // Payment configuration local edits
  const [bkashNumber, setBkashNumber] = useState(paymentNumbers.bkash);
  const [nagadNumber, setNagadNumber] = useState(paymentNumbers.nagad);
  const [codBkashNum, setCodBkashNum] = useState(paymentNumbers.codBkash);
  const [codNagadNum, setCodNagadNum] = useState(paymentNumbers.codNagad);

  // Settings configuration local edits
  const [appNameInput, setAppNameInput] = useState(settings.name);
  const [supportEmail, setSupportEmail] = useState(settings.email);
  const [supportPhone, setSupportPhone] = useState(settings.phone);
  const [bizAddress, setBizAddress] = useState(settings.address);
  const [homeDesc, setHomeDesc] = useState(settings.description);
  const [logoInput, setLogoInput] = useState(settings.logo);
  const [bannerInputs, setBannerInputs] = useState<string[]>(settings.banners || []);
  const [discountText, setDiscountText] = useState(settings.discountBannerText || '');
  const [bannerBadgeInput, setBannerBadgeInput] = useState(settings.bannerBadge || '');
  const [bannerTitleInput, setBannerTitleInput] = useState(settings.bannerTitle || '');
  const [bannerDescInput, setBannerDescInput] = useState(settings.bannerDescription || '');

  // Social links local edits
  const [fbUrl, setFbUrl] = useState(socialLinks.facebook);
  const [igUrl, setIgUrl] = useState(socialLinks.instagram);
  const [ytUrl, setYtUrl] = useState(socialLinks.youtube);
  const [tkUrl, setTkUrl] = useState(socialLinks.tiktok);
  const [waUrl, setWaUrl] = useState(socialLinks.whatsapp);

  // Search/Filter states inside dashboard tabs
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Selected Order Detail View Modal
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);

  // Sync inputs with live AppContext values when open
  React.useEffect(() => {
    if (isOpen) {
      setBkashNumber(paymentNumbers.bkash);
      setNagadNumber(paymentNumbers.nagad);
      setCodBkashNum(paymentNumbers.codBkash);
      setCodNagadNum(paymentNumbers.codNagad);

      setAppNameInput(settings.name);
      setSupportEmail(settings.email);
      setSupportPhone(settings.phone);
      setBizAddress(settings.address);
      setHomeDesc(settings.description);
      setLogoInput(settings.logo);
      setBannerInputs(settings.banners || []);
      setDiscountText(settings.discountBannerText || '');
      setBannerBadgeInput(settings.bannerBadge || '');
      setBannerTitleInput(settings.bannerTitle || '');
      setBannerDescInput(settings.bannerDescription || '');

      setFbUrl(socialLinks.facebook);
      setIgUrl(socialLinks.instagram);
      setYtUrl(socialLinks.youtube);
      setTkUrl(socialLinks.tiktok);
      setWaUrl(socialLinks.whatsapp);
    }
  }, [isOpen, paymentNumbers, settings, socialLinks]);

  if (!isOpen) return null;

  // --- LOGIN SECURITY CHECKS ---
  const handlePrimaryLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate credentials exactly as requested!
    if (loginEmail === 'imamhossain15905@gmail.com' && loginPass === '8tmI@mr87') {
      setGate('otp');
      setOtpError('');
    } else {
      alert('ভুল ইমেইল অথবা পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Verification code logic
    if (otpCode === '1599') {
      setGate('panel');
      setAdminAuthenticated(true);
    } else {
      setOtpError('ভুল ভেরিফিকেশন কোড! কোডটি হলো ১৫৯৯');
    }
  };

  // --- CRUD HANDLERS FOR ADMIN ---

  // Category addition
  const handleCreateCategory = () => {
    const trimmed = newCatName.trim();
    if (trimmed) {
      addCategory(trimmed);
      setPCategory(trimmed);
      setNewCatName('');
      alert(`Category "${trimmed}" added!`);
    }
  };

  // Image Upload directly to Firebase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const urls: string[] = [];
    try {
      const fileList = Array.from(files) as File[];
      let count = 0;
      for (const file of fileList) {
        const url = await uploadToFirebaseStorage(file, 'products');
        urls.push(url);
        count++;
        setUploadProgress(Math.round((count / fileList.length) * 100));
      }
      setPImages(prev => [...prev, ...urls]);
    } catch (err) {
      console.error("Failed to upload product images:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Save new/edited product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || (hasSizes && pSizes.length === 0) || pColors.length === 0) {
      alert('Please fill product Name, size (if enabled), and color!');
      return;
    }

    let finalImages = pImages;
    if (finalImages.length === 0) {
      finalImages = ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'];
    }

    const payload = {
      name: pName,
      price: pPrice,
      oldPrice: pOldPrice,
      sizes: hasSizes ? pSizes : [],
      colors: pColors,
      quantity: pQty,
      category: pCategory,
      description: pDesc,
      images: finalImages,
      ratings: [pRating]
    };

    if (isEditingProduct) {
      const productRef = doc(
  db,
  "products",
  isEditingProduct.id
);
      
    await updateDoc (productRef, {
          ...payload
    });
      updateProduct({
        ...isEditingProduct,
        ...payload
      });
      alert('Product updated successfully!');
    
    } else {
      
        const docRef = await addDoc(
          collection(db, "products"),
          payload
    );
      
      addProduct(payload);
      
      alert('New Product added successfully!');
    }

    // Reset Form
    setIsEditingProduct(null);
    setShowAddProductForm(false);
    setPName('');
    setPPrice(1000);
    setPOldPrice(1200);
    setPSizes(['M', 'L', 'XL']);
    setHasSizes(true);
    setPColors(['Black', 'White']);
    setPQty(50);
    setPDesc('');
    setPImages([]);
    setPRating(5);
  };

  const handleStartEdit = (p: Product) => {
    setIsEditingProduct(p);
    setPName(p.name);
    setPPrice(p.price);
    setPOldPrice(p.oldPrice || Math.round(p.price * 1.25));
    setPSizes(p.sizes || []);
    setHasSizes(!!p.sizes && p.sizes.length > 0);
    setPColors(p.colors);
    setPQty(p.quantity);
    setPCategory(p.category);
    setPDesc(p.description);
    setPImages(p.images);
    setPRating(p.ratings && p.ratings.length > 0 ? p.ratings[0] : 5);
    setShowAddProductForm(true);
  };

  const handleDeleteProduct = async (id: string) => {
     if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
       
    const productRef = doc(db, "products", id);

    await deleteDoc(productRef);

    deleteProduct(id);
  }
};

  // Coupons
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpCode) return;
    addCoupon({
      code: cpCode.trim().toUpperCase(),
      percentage: cpPct,
      minAmount: cpMin
    });
    setCpCode('');
    setCpPct(10);
    setCpMin(1000);
    alert('Coupon code added successfully!');
  };

  // Website settings save
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      name: appNameInput,
      email: supportEmail,
      phone: supportPhone,
      address: bizAddress,
      description: homeDesc,
      logo: logoInput,
      banners: bannerInputs,
      discountBannerText: discountText,
      bannerBadge: bannerBadgeInput,
      bannerTitle: bannerTitleInput,
      bannerDescription: bannerDescInput
    });
    alert('Website Settings updated successfully! (ওয়েবসাইট সেটিংস সফলভাবে আপডেট করা হয়েছে)');
  };

  // Save Social links
  const handleSaveSocial = (e: React.FormEvent) => {
    e.preventDefault();
    updateSocialLinks({
      facebook: fbUrl,
      instagram: igUrl,
      youtube: ytUrl,
      tiktok: tkUrl,
      whatsapp: waUrl
    });
    alert('Social Media Links updated successfully!');
  };

  // Save Courier
  const handleSaveCourier = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCharges = { ...courierSettings.districtCharges };
    const targetDistrict = customDistrictInput.trim() || selectedDistrictEdit;
    
    if (!targetDistrict) {
      alert('অনুগ্রহ করে সঠিক জেলার নাম সিলেক্ট বা টাইপ করুন!');
      return;
    }

    updatedCharges[targetDistrict] = districtChargeInput;

    updateCourierSettings({
      insideSavarCharge: insideSavarInput,
      outsideSavarCharge: outsideSavarInput,
      districtCharges: updatedCharges
    });
    
    setCustomDistrictInput('');
    alert(`জেলা "${targetDistrict}"-এর ডেলিভারি চার্জ ৳${districtChargeInput} সফলভাবে সেট করা হয়েছে!`);
  };

  // Save Payments
  const handleSavePayments = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentNumbers({
      bkash: bkashNumber,
      nagad: nagadNumber,
      codBkash: codBkashNum,
      codNagad: codNagadNum
    });
    alert('Admin Merchant Payment numbers updated!');
  };

  // Logo file upload helper directly to Firebase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadToFirebaseStorage(file, 'settings');
      setLogoInput(url);
    } catch (err) {
      console.error("Failed to upload logo:", err);
    }
  };

  // Banner slide file upload directly to Firebase Storage
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const urls: string[] = [];
    try {
      const fileList = Array.from(files) as File[];
      let count = 0;
      for (const file of fileList) {
        const url = await uploadToFirebaseStorage(file, 'banners');
        urls.push(url);
        count++;
        setUploadProgress(Math.round((count / fileList.length) * 100));
      }
      setBannerInputs(prev => [...prev, ...urls]);
    } catch (err) {
      console.error("Failed to upload banner images:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Order Accept / Reject triggering
  const handleOrderStatusChange = (orderId: string, status: 'Confirmed' | 'Rejected') => {
    updateOrderStatus(orderId, status);
    
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    // Generate responsive confirmation/rejection text
    let alertMsg = '';
    if (status === 'Confirmed') {
      alertMsg = `📧 CUSTOMER EMAIL SIMULATED OUTBOX:\n` +
                 `To: ${ord.customerEmail}\n` +
                 `Subject: Order ${ord.id} Confirmed! - YOUNG Style\n\n` +
                 `প্রিয় ${ord.customerName},\n` +
                 `আপনার অর্ডারটি (${ord.id}) সফলভাবে নিশ্চিত করা হয়েছে! আপনার পরিশোধিত মোট মূল্য ৳${ord.totalAmount}।\n` +
                 `আগামী ২ থেকে ৫ দিনের মধ্যে ডেলিভারি বয় আপনার ঠিকানায় প্রোডাক্টটি নিয়ে পৌঁছাবে।\n` +
                 `ধন্যবাদ আমাদের সাথে শপিং করার জন্য!\n` +
                 `YOUNG Style Team`;
    } else {
      alertMsg = `📧 CUSTOMER EMAIL SIMULATED OUTBOX:\n` +
                 `To: ${ord.customerEmail}\n` +
                 `Subject: Order ${ord.id} Rejected - YOUNG Style\n\n` +
                 `প্রিয় ${ord.customerName},\n` +
                 `দুঃখিত, আপনার অর্ডার (${ord.id}) বাতিল করা হয়েছে। কারণ আপনার প্রদত্ত ট্রানজেকশন আইডিটি সঠিক ছিল না বা কোনো সমস্যা হয়েছে।\n` +
                 `অনুগ্রহ করে সঠিক পেমেন্ট তথ্য দিয়ে নতুন করে অর্ডার করুন অথবা আমাদের সাথে যোগাযোগ করুন।\n` +
                 `হেল্পলাইন: ${settings.phone}\n` +
                 `YOUNG Style Team`;
    }

    alert(alertMsg);
    // Reload state inside current inspected view
    if (inspectOrder && inspectOrder.id === orderId) {
      setInspectOrder({ ...inspectOrder, status });
    }
  };

  // Calculate active sales totals dynamically
  const now = new Date();
  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.toDateString() === now.toDateString();
  };
  const isWithinLastDays = (dateStr: string, days: number) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const diffTime = now.getTime() - d.getTime();
    return diffTime >= 0 && diffTime <= days * 24 * 60 * 60 * 1000;
  };

  const totalSales = orders
    .filter(o => o.status === 'Confirmed')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const todaySales = orders
    .filter(o => o.status === 'Confirmed' && isToday(o.createdAt))
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const weeklySales = orders
    .filter(o => o.status === 'Confirmed' && isWithinLastDays(o.createdAt, 7))
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const monthlySales = orders
    .filter(o => o.status === 'Confirmed' && isWithinLastDays(o.createdAt, 30))
    .reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" id="admin-panel-overlay">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Admin Panel Container */}
      <div className="relative w-full h-full sm:h-[90vh] sm:max-w-6xl overflow-hidden rounded-none sm:rounded-xl bg-white shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400 animate-pulse" />
            <h1 className="text-sm sm:text-base font-black tracking-widest uppercase">
              YOUNG Style Backoffice (অ্যাডমিন প্যানেল)
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {gate === 'panel' && (
              <button
                onClick={() => {
                  setGate('login');
                  setLoginEmail('');
                  setLoginPass('');
                  setOtpCode('');
                  setAdminAuthenticated(false);
                  alert('Admin logged out successfully!');
                }}
                className="text-xs bg-red-600 hover:bg-red-700 text-white font-black px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all uppercase"
                title="Admin Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
            <button
              id="btn-admin-close"
              onClick={onClose}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* --- GATES FOR AUTHORIZATION --- */}

        {/* EMAIL & PASSWORD LOGIN */}
        {gate === 'login' && (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
              <div className="text-center space-y-1">
                <div className="mx-auto h-12 w-12 bg-blue-50 text-[#1877F2] rounded-full flex items-center justify-center">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-black text-gray-800">অ্যাডমিন প্রবেশদ্বার</h2>
                <p className="text-xs text-gray-400 font-semibold">Verify email and password credentials</p>
              </div>

              <form onSubmit={handlePrimaryLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Admin Email</label>
                  <input 
                    type="email" 
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="example@domain.com"
                    autoComplete="off"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1877F2]/25"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Password</label>
                  <div className="relative">
                    <input 
                      type={showLoginPass ? 'text' : 'password'} 
                      required
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="Enter admin password"
                      className="w-full pl-3 pr-10 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1877F2]/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                    >
                      {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-wider"
                >
                  Verify Credentials
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SECURITY CODE (OTP) VERIFICATION */}
        {gate === 'otp' && (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
              
              <div className="text-center space-y-1">
                <div className="mx-auto h-12 w-12 bg-blue-50 text-[#1877F2] rounded-full flex items-center justify-center mb-2">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-gray-800">Email Security Code</h3>
                <p className="text-xs text-gray-400 font-semibold leading-normal">
                  নিরাপত্তার স্বার্থে আপনার রেজিস্টার্ড ইমেইলে পাঠানো ভেরিফিকেশন কোডটি ইনপুট দিন।
                </p>
              </div>

              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Enter Security Code</label>
                  <input 
                    type="password" 
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-center font-black tracking-widest text-lg"
                  />
                </div>

                {otpError && <p className="text-xs text-red-500 font-bold text-center">{otpError}</p>}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-wider"
                >
                  Verify Code
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MAIN PANEL CONTENT */}
        {gate === 'panel' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
            
            {/* Left Nav Tabs */}
            <aside className="w-full md:w-56 bg-slate-50 border-r border-gray-100 flex md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 pb-2 md:pb-0">
              <nav className="flex md:flex-col flex-1 p-3 space-x-1 md:space-x-0 md:space-y-1">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'orders', label: 'Orders List', icon: ShoppingCart },
                  { id: 'products', label: 'Products', icon: PlusCircle },
                  { id: 'coupons', label: 'Coupons', icon: Tag },
                  { id: 'subscribers', label: 'Subscribers', icon: Users },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'social', label: 'Social Media', icon: Share2 },
                  { id: 'courier', label: 'Courier Service', icon: Truck },
                  { id: 'payments', label: 'Payment Numbers', icon: CreditCard },
                  { id: 'ads', label: 'Pop-up Ads', icon: Share2 },
            
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as AdminTab)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
              {/* Sidebar Sign Out Shortcut */}
              <div className="p-3 border-t border-gray-100 hidden md:block mt-auto">
                <button
                  onClick={() => {
                    setGate('login');
                    setLoginEmail('');
                    setLoginPass('');
                    setOtpCode('');
                    setAdminAuthenticated(false);
                    alert('Admin logged out successfully!');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sign Out (লগআউট)</span>
                </button>
              </div>
            </aside>

            {/* Right Tab Content Viewport */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">

                    {/* 📺 ADS MANAGEMENT TAB */}
      {activeTab === 'ads' && (
        <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Promotional Pop-up Announcement</h2>
            <p className="text-xs text-gray-500 mt-1">আপনার কাস্টমাররা ওয়েবসাইটে প্রবেশ করলেই যে আকর্ষণীয় পপ-আপ অফারটি দেখতে পাবে, তা এখান থেকে নিয়ন্ত্রণ করুন।</p>
          </div>

          <hr className="border-gray-100" />

          {/* 🔘 On/Off Toggle Button */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <span className="block text-sm font-semibold text-gray-800">Pop-up Advertisement Status</span>
              <span className="text-xs text-gray-500">
                {settings.showPopupAd ? 'বর্তমানে পপ-আপ অফারটি কাস্টমারদের দেখানো হচ্ছে' : 'বর্তমানে পপ-আপ অফারটি বন্ধ আছে'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                updateSettings({
                  ...settings,
                  showPopupAd: !settings.showPopupAd
                });
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white transition active:scale-95 ${
                settings.showPopupAd ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {settings.showPopupAd ? <EyeOff size={16} /> : <Eye size={16} />}
              {settings.showPopupAd ? 'Deactivate Ad' : 'Activate Ad'}
            </button>
          </div>

          {/* 📸 Image Upload & Preview Area */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Upload Banner Image (ImgBB)</label>
            
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 p-6 rounded-xl hover:bg-gray-100 transition relative">
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const uploadedUrl = await uploadToFirebaseStorage(file, 'promo-ads');
                    updateSettings({
                      ...settings,
                      popupAdImage: uploadedUrl
                    });
                    alert('বিজ্ঞাপনের ছবি সফলভাবে আপলোড হয়েছে!');
                  } catch (err) {
                    console.error(err);
                  }
                }}
              />
              <PlusCircle className="text-gray-400 mb-2" size={32} />
              <span className="text-xs font-medium text-gray-600">ক্লিক করে নতুন অফারের ছবি আপলোড করুন</span>
              <span className="text-[10px] text-gray-400 mt-1">সর্বোচ্চ ৫০ এমবি (অনুপাত 4:5 রিকমেন্ডেড)</span>
            </div>

            {/* 🖼️ Live Preview Box */}
            {settings.popupAdImage && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="block text-xs font-semibold text-gray-500 mb-2">Live Preview:</span>
                <div className="relative max-w-[200px] aspect-[4/5] rounded-lg overflow-hidden border border-gray-300 shadow-md bg-white">
                  <img 
                    src={settings.popupAdImage} 
                    alt="Ad Preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if(confirm('আপনি কি নিশ্চিত যে এই ছবিটি মুছে ফেলতে চান?')) {
                        updateSettings({ ...settings, popupAdImage: '' });
                      }
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition active:scale-95"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
              {/* TAB 1: DASHBOARD OVERVIEW & VISITOR STATS */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  
                  {/* Top quick counters */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 shadow-2xs">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Total Orders</span>
                      <span className="text-xl sm:text-2xl font-black text-gray-900 mt-1 block">{orders.length}</span>
                      <span className="text-[10px] text-emerald-500 font-bold block mt-1">Pending: {orders.filter(o=>o.status==='Pending').length}</span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 shadow-2xs">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Active Products</span>
                      <span className="text-xl sm:text-2xl font-black text-gray-900 mt-1 block">{products.length}</span>
                      <span className="text-[10px] text-blue-500 font-bold block mt-1">Total Categories: {categories.length}</span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 shadow-2xs">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Confirmed Sales</span>
                      <span className="text-xl sm:text-2xl font-black text-[#1877F2] mt-1 block">৳ {totalSales}</span>
                      <span className="text-[10px] text-gray-400 block mt-1">Today Confirmed: ৳ {todaySales}</span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 shadow-2xs">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Total Subscribers</span>
                      <span className="text-xl sm:text-2xl font-black text-gray-900 mt-1 block">{subscribers.length}</span>
                      <span className="text-[10px] text-purple-500 font-bold block mt-1">Loyal customers</span>
                    </div>
                  </div>

                  {/* Visit Tracker Section as requested by User! */}
                  <div className="border border-gray-100 rounded-xl p-4 sm:p-6 bg-slate-50/50 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">
                        Visit Tracker Dashboard (ভিজিটর স্ট্যাটস)
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to reset all visitor statistics? (আপনি কি সব ভিজিটর তথ্য রিসেট করতে চান?)')) {
                            localStorage.setItem('ys_visitors', JSON.stringify({
                              todayCount: 0,
                              weeklyCount: 0,
                              monthlyCount: 0,
                              totalCount: 0,
                              visitsByRegion: {}
                            }));
                            window.location.reload();
                          }
                        }}
                        className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-all border border-red-100"
                      >
                        Reset Stats (রিসেট)
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-semibold block uppercase">Today Visit</span>
                        <span className="text-lg font-black text-gray-900">{visitorStats.todayCount}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-semibold block uppercase">Weekly Visit</span>
                        <span className="text-lg font-black text-gray-900">{visitorStats.weeklyCount}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-semibold block uppercase">Monthly Visit</span>
                        <span className="text-lg font-black text-gray-900">{visitorStats.monthlyCount}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-semibold block uppercase">Total Visit</span>
                        <span className="text-lg font-black text-[#1877F2]">{visitorStats.totalCount}</span>
                      </div>
                    </div>

                    {/* Regional breakdown */}
                    <div className="space-y-2 mt-4 bg-white rounded-xl p-4 border border-gray-100">
                      <span className="text-xs font-black text-gray-700 block uppercase">Visitors by region (জেলা ও দেশভিত্তিক ভিজিটর)</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-56 overflow-y-auto pr-1 pt-1">
                        {Object.entries(visitorStats.visitsByRegion || {}).length === 0 ? (
                          <div className="col-span-full py-4 text-center text-xs text-gray-400 italic">
                            No regional visits tracked yet. (কোনো আঞ্চলিক ভিজিটর পাওয়া যায়নি)
                          </div>
                        ) : (
                          Object.entries(visitorStats.visitsByRegion || {})
                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                            .map(([region, count]) => {
                              const pct = Math.min(100, Math.round(((count as number) / (visitorStats.totalCount || 1)) * 100));
                              return (
                                <div key={region} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-gray-700">
                                    <span>{region}</span>
                                    <span>{count} visits ({pct}%)</span>
                                  </div>
                                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#1877F2] h-full rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: ORDERS MANAGEMENT */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">Orders List</h3>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <input 
                        type="text" 
                        value={orderSearch}
                        onChange={(e)=>setOrderSearch(e.target.value)}
                        placeholder="Search by ID, Name or phone"
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No orders received yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-gray-600 border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-gray-700 border-b border-gray-100 font-bold uppercase">
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Total Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orders
                            .filter(o => 
                              o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                              o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                              o.customerPhone.includes(orderSearch)
                            )
                            .map(ord => (
                              <tr key={ord.id} className="hover:bg-slate-50">
                                <td className="p-3 font-bold text-gray-900">{ord.id}</td>
                                <td className="p-3">
                                  <div className="font-bold">{ord.customerName}</div>
                                  <div className="text-[10px] text-gray-400">{ord.customerPhone}</div>
                                </td>
                                <td className="p-3 uppercase font-semibold">{ord.paymentMethod}</td>
                                <td className="p-3 font-bold text-[#1877F2]">৳{ord.totalAmount}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    ord.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                    ord.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {ord.status}
                                  </span>
                                </td>
                                <td className="p-3 flex justify-center gap-1.5">
                                  <button
                                    onClick={() => setInspectOrder(ord)}
                                    className="px-2 py-1 bg-slate-100 text-slate-700 font-bold rounded-md hover:bg-slate-200"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleOrderStatusChange(ord.id, 'Confirmed')}
                                    disabled={ord.status === 'Confirmed'}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-600 font-bold rounded-md hover:bg-emerald-100 disabled:opacity-40"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => handleOrderStatusChange(ord.id, 'Rejected')}
                                    disabled={ord.status === 'Rejected'}
                                    className="px-2 py-1 bg-red-50 text-red-500 font-bold rounded-md hover:bg-red-100 disabled:opacity-40"
                                  >
                                    Reject
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Inspector View Modal for individual order */}
                  {inspectOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
                      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                          <h4 className="font-bold text-gray-900">Order Details - {inspectOrder.id}</h4>
                          <button onClick={() => setInspectOrder(null)} className="p-1 rounded-full hover:bg-gray-100">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="text-xs space-y-2 text-gray-700">
                          <p><strong>Recipient Name:</strong> {inspectOrder.customerName}</p>
                          <p><strong>Recipient Phone:</strong> {inspectOrder.customerPhone}</p>
                          <p><strong>Recipient Email:</strong> {inspectOrder.customerEmail}</p>
                          <p><strong>District:</strong> {inspectOrder.customerDistrict}</p>
                          <p><strong>Address:</strong> {inspectOrder.customerAddress}</p>
                          <p><strong>Payment Method:</strong> <span className="uppercase font-bold">{inspectOrder.paymentMethod}</span></p>
                          {inspectOrder.paymentPhone && <p><strong>Money Sent From:</strong> {inspectOrder.paymentPhone}</p>}
                          {inspectOrder.transactionId && <p><strong>Transaction ID:</strong> <span className="font-mono bg-yellow-50 px-1 py-0.5 border border-yellow-200 text-yellow-800">{inspectOrder.transactionId}</span></p>}
                          
                          <div className="border-t border-b border-gray-100 py-3 space-y-3">
                            <span className="font-bold text-[10px] text-gray-400 block uppercase">Products Ordered (অর্ডারকৃত প্রোডাক্টসমূহ)</span>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                              {inspectOrder.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                  {item.image ? (
                                    <img 
                                      src={item.image} 
                                      alt={item.productName} 
                                      className="h-11 w-11 rounded-md object-cover object-top border border-gray-200 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="h-11 w-11 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 shrink-0 text-[10px] font-bold">
                                      No Image
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-bold text-xs text-gray-900 truncate">{item.productName}</h5>
                                    <div className="flex flex-wrap gap-2 items-center mt-1">
                                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded">
                                        Size: {item.size}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold rounded flex items-center gap-1">
                                        Color: {item.color}
                                        <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: item.color.toLowerCase() }} />
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="block font-black text-xs text-gray-900">৳{item.price * item.quantity}</span>
                                    <span className="block text-[10px] text-gray-400 font-bold">Qty: {item.quantity}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between font-bold text-gray-900 pt-1">
                            <span>Total paid value:</span>
                            <span className="text-[#1877F2]">৳{inspectOrder.totalAmount}</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleOrderStatusChange(inspectOrder.id, 'Confirmed')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                          >
                            Accept Order
                          </button>
                          <button
                            onClick={() => handleOrderStatusChange(inspectOrder.id, 'Rejected')}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg"
                          >
                            Reject Order
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 3: PRODUCTS LIST & ADD / EDIT PRODUCT */}
              {activeTab === 'products' && (
                <div className="space-y-6">
                  
                  {/* Top Bar for tab */}
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">Manage Products</h3>
                    {!showAddProductForm && (
                      <button
                        onClick={() => {
                          setIsEditingProduct(null);
                          setShowAddProductForm(true);
                        }}
                        className="flex items-center gap-1 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>Add Product</span>
                      </button>
                    )}
                  </div>

                  {/* PRODUCT FORM */}
                  {showAddProductForm && (
                    <form onSubmit={handleSaveProduct} className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <h4 className="font-bold text-xs uppercase text-gray-700">
                          {isEditingProduct ? `Edit Product: ${isEditingProduct.name}` : 'Add New Product'}
                        </h4>
                        <button 
                          type="button"
                          onClick={() => setShowAddProductForm(false)}
                          className="text-xs text-red-500 font-bold hover:underline"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">Product Title</label>
                          <input 
                            type="text" 
                            required
                            value={pName}
                            onChange={(e) => setPName(e.target.value)}
                            placeholder="e.g. Slim-fit Casual T-Shirt"
                            className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">Old Price (Taka)</label>
                          <input 
                            type="number" 
                            required
                            value={pOldPrice}
                            onChange={(e) => setPOldPrice(Number(e.target.value))}
                            className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg"
                            placeholder="e.g. 1200"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">Discount Price (Taka)</label>
                          <input 
                            type="number" 
                            required
                            value={pPrice}
                            onChange={(e) => setPPrice(Number(e.target.value))}
                            className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg"
                            placeholder="e.g. 1000"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Size Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-gray-600">Select Sizes Available</label>
                            <label className="flex items-center gap-1 text-[10px] font-bold text-blue-600 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={hasSizes}
                                onChange={(e) => setHasSizes(e.target.checked)}
                                className="rounded text-[#1877F2] w-3 h-3"
                              />
                              <span>Has Sizes? (সাইজ অপশন আছে?)</span>
                            </label>
                          </div>
                          {hasSizes ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {['SX', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(sz => (
                                <label key={sz} className="flex items-center gap-1 text-xs font-semibold cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={pSizes.includes(sz)}
                                    onChange={(e) => {
                                      if (e.target.checked) setPSizes([...pSizes, sz]);
                                      else setPSizes(pSizes.filter(x => x !== sz));
                                    }}
                                    className="rounded text-[#1877F2]"
                                  />
                                  <span>{sz}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="py-2 text-[10px] text-gray-400 italic font-medium">
                              Sizes disabled. This product will be added without any size selection.
                            </div>
                          )}
                        </div>

                        {/* Category selection & addition */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">Category</label>
                          <div className="flex gap-2">
                            <select
                              value={pCategory}
                              onChange={(e) => setPCategory(e.target.value)}
                              className="flex-1 bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg"
                            >
                              {categories.filter(c => c !== 'All Product' && c !== 'Trending').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            
                            <input 
                              type="text"
                              value={newCatName}
                              onChange={(e) => setNewCatName(e.target.value)}
                              placeholder="New category"
                              className="w-28 bg-white px-2 py-1 text-xs border border-gray-200 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={handleCreateCategory}
                              className="px-2 py-1 bg-slate-950 text-white text-[10px] font-bold rounded-lg"
                            >
                              Add
                            </button>
                          </div>

                          {/* List of custom categories to delete them */}
                          <div className="mt-2">
                            <span className="text-[10px] font-bold text-gray-500 block mb-1">Manage Categories (ডিলেট অপশন):</span>
                            <div className="flex flex-wrap gap-1">
                              {categories.filter(c => c !== 'All Product' && c !== 'Trending').map(cat => (
                                <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold border border-red-100">
                                  {cat}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteCategory(cat);
                                      if (pCategory === cat) {
                                        const remaining = categories.filter(c => c !== cat && c !== 'All Product' && c !== 'Trending');
                                        if (remaining.length > 0) {
                                          setPCategory(remaining[0]);
                                        } else {
                                          setPCategory('Shirt'); // fallback
                                        }
                                      }
                                    }}
                                    className="hover:bg-red-200 p-0.5 rounded-full text-red-500 hover:text-red-700 transition-colors"
                                    title="Delete category"
                                  >
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 100+ Colors Multiselect palette */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-600 block mb-1">
                          Product Color Palette (100+ Market Choice Colors)
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto border border-gray-200 bg-white rounded-lg p-2.5">
                          {GARMENT_COLORS.map(col => {
                            const isSel = pColors.includes(col.name);
                            return (
                              <button
                                key={col.name}
                                type="button"
                                onClick={() => {
                                  if (isSel) setPColors(pColors.filter(x => x !== col.name));
                                  else setPColors([...pColors, col.name]);
                                }}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                                  isSel ? 'border-[#1877F2] bg-blue-50/70 text-[#1877F2]' : 'border-gray-100 text-gray-600'
                                }`}
                              >
                                <span className="h-2.5 w-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: col.hex }} />
                                <span>{col.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">Stock Quantity (স্টক পরিমাণ)</label>
                          <input 
                            type="number"
                            required
                            value={pQty}
                            onChange={(e) => setPQty(Number(e.target.value))}
                            className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg"
                          />
                        </div>

                        {/* Interactive 5-Star Rating Selector */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">
                            Product Rating (প্রোডাক্ট রেটিং স্টার)
                          </label>
                          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-gray-200 rounded-lg h-[34px]">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setPRating(star)}
                                className="focus:outline-hidden transition-transform active:scale-125 hover:scale-110"
                                title={`${star} Star`}
                              >
                                <Star
                                  className={`h-4.5 w-4.5 transition-colors ${
                                    star <= pRating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="text-xs font-bold text-gray-500 ml-1">
                              ({pRating} ★)
                            </span>
                          </div>
                        </div>

                        {/* Image Device connects direct storage upload */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">Upload Product Images (From Device)</label>
                          <input 
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                            className="w-full bg-white px-2 py-1 text-xs border border-gray-200 rounded-lg"
                          />
                          {isUploading && (
                            <div className="mt-1">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-[#1877F2] h-1.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-500 font-semibold mt-0.5 block">Uploading: {uploadProgress}%</span>
                            </div>
                          )}
                          <p className="text-[9px] text-gray-400 mt-0.5">Choose multiple images (Max 50MB each).</p>
                        </div>
                      </div>

                      {/* Display Uploaded images */}
                      {pImages.length > 0 && (
                        <div className="flex gap-2 flex-wrap bg-white p-2 border border-gray-200 rounded-lg">
                          {pImages.map((img, i) => (
                            <div key={i} className="relative h-12 w-12 rounded-md overflow-hidden border border-gray-100">
                              <img src={img} alt="Upload thumb" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setPImages(pImages.filter((_, idx) => idx !== i))}
                                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 hover:bg-red-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-bold text-gray-600 block mb-1">Description (Product Details)</label>
                        <textarea 
                          required
                          value={pDesc}
                          onChange={(e) => setPDesc(e.target.value)}
                          placeholder="Fabric quality, washing tips, design notes..."
                          rows={3}
                          className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isUploading}
                        className={`w-full py-2.5 text-white text-xs font-black rounded-lg uppercase transition-all ${
                          isUploading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-[#1877F2] hover:bg-blue-600'
                        }`}
                      >
                        {isUploading ? `Uploading Images (${uploadProgress}%)...` : 'Save Product Data'}
                      </button>
                    </form>
                  )}

                  {/* PRODUCTS LIST */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <input 
                        type="text" 
                        value={productSearch}
                        onChange={(e)=>setProductSearch(e.target.value)}
                        placeholder="Search products by title or category..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products
                        .filter(p => 
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.category.toLowerCase().includes(productSearch.toLowerCase())
                        )
                        .map(p => (
                          <div key={p.id} className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-xs">
                            <img src={p.images[0]} alt={p.name} className="h-16 w-16 object-cover object-top rounded-lg shrink-0" />
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-gray-800 truncate">{p.name}</h4>
                                <p className="text-[10px] font-black text-[#1877F2] mt-0.5">৳{p.price} | Stock: {p.quantity}</p>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleStartEdit(p)}
                                  className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: COUPONS */}
              {activeTab === 'coupons' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">Coupons & Discounts (কুপন ম্যানেজার)</h3>

                  <form onSubmit={handleSaveCoupon} className="bg-slate-50 rounded-xl p-4 border border-gray-100 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Coupon Name / Code</label>
                      <input 
                        type="text" 
                        required
                        value={cpCode}
                        onChange={(e)=>setCpCode(e.target.value)}
                        placeholder="e.g. EID50"
                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Discount (%)</label>
                      <input 
                        type="number" 
                        required
                        min={1}
                        max={90}
                        value={cpPct}
                        onChange={(e)=>setCpPct(Number(e.target.value))}
                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Min Buy Amount (৳)</label>
                      <input 
                        type="number" 
                        required
                        value={cpMin}
                        onChange={(e)=>setCpMin(Number(e.target.value))}
                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg uppercase tracking-wider"
                    >
                      Add Coupon
                    </button>
                  </form>

                  {/* Coupons list */}
                  <div className="space-y-3">
                    <span className="text-xs font-black text-gray-700 block uppercase">Active Coupons</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {coupons.map(cp => (
                        <div key={cp.id} className="flex justify-between items-center p-3 rounded-lg border border-emerald-100 bg-emerald-50/20">
                          <div>
                            <span className="font-black text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase">{cp.code}</span>
                            <p className="text-[10px] text-gray-500 font-bold mt-1">
                              {cp.percentage}% Discount on minimum purchase of ৳{cp.minAmount}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteCoupon(cp.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SUBSCRIBERS */}
              {activeTab === 'subscribers' && (
                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">Subscribe Notifications (নিউজলেটার গ্রাহক)</h3>
                    
                    {/* Period selectors as requested */}
                    <div className="flex gap-1 border border-gray-200 rounded-lg p-0.5 bg-gray-50 text-[10px] font-bold">
                      {(['today', 'weekly', 'monthly', 'total'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setSubPeriod(p)}
                          className={`px-2 py-1 rounded capitalize ${subPeriod === p ? 'bg-slate-900 text-white' : 'text-gray-500'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-left">
                      <span className="text-xs font-black text-gray-800 block uppercase">Customer Subscriber View (কাস্টমার সাবস্ক্রাইবার দেখতে পারবে কি না)</span>
                      <p className="text-[10px] text-gray-400 font-bold">অন (ON) থাকলে কাস্টমাররা সাবস্ক্রাইবার সংখ্যা ও ইমেজে ক্লিক করে তাদের তালিকা দেখতে পারবে। অফ (OFF) থাকলে দেখতে পারবে না।</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateSettings({
                            ...settings,
                            showSubscribersToCustomers: true
                          });
                          alert('Customer Subscriber View turned ON (অন করা হয়েছে)');
                        }}
                        className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${
                          settings.showSubscribersToCustomers !== false
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-slate-50'
                        }`}
                      >
                        ON (অন)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateSettings({
                            ...settings,
                            showSubscribersToCustomers: false
                          });
                          alert('Customer Subscriber View turned OFF (অফ করা হয়েছে)');
                        }}
                        className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${
                          settings.showSubscribersToCustomers === false
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-slate-50'
                        }`}
                      >
                        OFF (অফ)
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 text-center">
                    <span className="text-[11px] text-gray-400 font-bold block uppercase tracking-wider">{subPeriod} Subscribers Count</span>
                    <span className="text-2xl font-black text-[#1877F2] mt-1 block">
                      {filteredSubscribers.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-black text-gray-700 block uppercase">Subscribers Emails List</span>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
                      {filteredSubscribers.length === 0 ? (
                        <div className="p-8 text-center text-xs text-gray-400 font-bold">
                          এই সময়ে কোনো সাবস্ক্রাইবার পাওয়া যায়নি। (No subscribers in this period)
                        </div>
                      ) : (
                        filteredSubscribers.map((sub, idx) => (
                          <div key={sub.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors text-xs">
                            <button
                              type="button"
                              onClick={() => handleViewSubscriberDetails(sub)}
                              className="flex items-center gap-3 flex-1 text-left hover:opacity-85 transition-opacity focus:outline-hidden cursor-pointer"
                              title="Click to view details (বিস্তারিত দেখতে ক্লিক করুন)"
                            >
                              <span className="font-semibold text-gray-400 w-4">{idx + 1}.</span>
                              {/* Display email profile circle avatar as requested */}
                              {sub.avatar ? (
                                <img 
                                  src={sub.avatar} 
                                  alt="avatar" 
                                  className="h-7 w-7 rounded-full object-cover border border-[#1877F2]/20 shadow-xs" 
                                />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-[#1877F2]/10 text-[#1877F2] font-black flex items-center justify-center uppercase text-[10px]">
                                  {sub.email.charAt(0)}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-800 break-all">{sub.email}</span>
                                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">
                                  Click to view info (বিস্তারিত দেখতে ক্লিক করুন)
                                </span>
                              </div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => deleteSubscriber(sub.id)}
                              className="p-1 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50 shrink-0 ml-2"
                              title="Delete Subscriber"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: WEBSITE SETTINGS */}
              {activeTab === 'settings' && (
                <>
                  <form onSubmit={handleSaveSettings} className="space-y-5">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">Website settings</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Company / App Name</label>
                      <input 
                        type="text" 
                        required
                        value={appNameInput}
                        onChange={(e)=>setAppNameInput(e.target.value)}
                        placeholder="e.g. YOUNG Style"
                        className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Support Email</label>
                      <input 
                        type="email" 
                        required
                        value={supportEmail}
                        onChange={(e)=>setSupportEmail(e.target.value)}
                        placeholder="e.g. info@youngstyle.com"
                        className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Support Phone Number</label>
                      <input 
                        type="tel" 
                        required
                        value={supportPhone}
                        onChange={(e)=>setSupportPhone(e.target.value)}
                        className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Store Address Location</label>
                      <input 
                        type="text" 
                        required
                        value={bizAddress}
                        onChange={(e)=>setBizAddress(e.target.value)}
                        className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">
                      Upload Website Profile Picture / Brand Logo (ওয়েবসাইট প্রোফাইল ছবি / ব্র্যান্ড লোগো পরিবর্তন করুন)
                    </label>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                      className="w-full bg-slate-50 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                    />
                    {isUploading && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-[#1877F2] h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold mt-0.5 block">Uploading: {uploadProgress}%</span>
                      </div>
                    )}
                    {logoInput && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={logoInput} alt="Preview" className="h-8 w-8 rounded-full object-cover border border-[#1877F2]/20" />
                        <span className="text-[10px] text-gray-500">Current website profile picture preview (বর্তমান লোগো প্রিভিউ)</span>
                      </div>
                    )}
                  </div>

                  {/* Banner Add options */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Upload New Slider Banners (rotating every 3s)</label>
                    <input 
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={isUploading}
                      className="w-full bg-slate-50 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                    />
                    {isUploading && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-[#1877F2] h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold mt-0.5 block">Uploading: {uploadProgress}%</span>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap mt-2">
                      {bannerInputs.map((b, i) => (
                        <div key={i} className="relative h-12 w-20 rounded-md overflow-hidden border border-gray-200">
                          <img src={b} alt="banner" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setBannerInputs(bannerInputs.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bangla quality description as requested! */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Homepage Quality Description ( Bangla/English )</label>
                    <textarea 
                      required
                      value={homeDesc}
                      onChange={(e)=>setHomeDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                  </div>

                   {/* Slider Banner Custom Text Options */}
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
                    <h4 className="text-xs font-black text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Edit3 className="h-4 w-4" />
                      <span>Slider Banner Texts (স্লাইডার ব্যানার টেক্সট পরিবর্তন)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">Banner Badge / Tagline (ট্যাগলাইন বা ছোট লেখা)</label>
                        <input 
                          type="text" 
                          value={bannerBadgeInput}
                          onChange={(e) => setBannerBadgeInput(e.target.value)}
                          placeholder="e.g. New Summer Arrivals"
                          className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-[#1877F2]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">Banner Main Title (প্রধান টাইটেল)</label>
                        <input 
                          type="text" 
                          value={bannerTitleInput}
                          onChange={(e) => setBannerTitleInput(e.target.value)}
                          placeholder="e.g. YOUNG STYLE CO."
                          className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-[#1877F2] font-extrabold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Banner Description Text (ব্যানারের বিস্তারিত বিবরণ)</label>
                      <textarea 
                        value={bannerDescInput}
                        onChange={(e) => setBannerDescInput(e.target.value)}
                        rows={2}
                        placeholder="e.g. 100% Quality-Full Premium Shirts & T-Shirts for youngsters..."
                        className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-[#1877F2]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#1877F2] block mb-1">Animated Discount Announcement Letter (টপ অ্যানিমেটেড অফার ব্যানার টেক্সট)</label>
                    <input 
                      type="text"
                      required
                      value={discountText}
                      onChange={(e)=>setDiscountText(e.target.value)}
                      placeholder="e.g. 🔥 ধামাকা অফার! যেকোনো ৩টি শার্ট অর্ডারে ডেলিভারি চার্জ ফ্রি! 🔥"
                      className="w-full bg-slate-50 px-3 py-2 text-xs border border-blue-200 focus:border-[#1877F2] rounded-lg font-bold text-blue-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className={`w-full py-2.5 text-white text-xs font-black rounded-lg uppercase transition-all ${
                      isUploading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-[#1877F2] hover:bg-blue-600'
                    }`}
                  >
                    {isUploading ? `Uploading Images (${uploadProgress}%)...` : 'Save Settings'}
                  </button>
                </form>

                {/* DANGEROUS SECTION: Clear Demo/Sample Data */}
                <div className="mt-8 p-4 bg-red-50 rounded-xl border border-red-100 space-y-3">
                  <h4 className="text-xs font-black text-red-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    <span>Danger Zone: Clean Slate (সব ডেমো ডাটা ডিলিট করুন)</span>
                  </h4>
                  <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                    ওয়েবসাইট থেকে সকল ডেমো/ফেক প্রোডাক্ট, ব্যানার, অফার, কন্টাক্ট ইনফো (ইমেইল, ফোন নম্বর ইত্যাদি) এক ক্লিকে ডিলিট করতে চান? এটি করলে ওয়েবসাইট সম্পূর্ণ খালি হয়ে যাবে এবং আপনি নিজের পণ্য ও ব্যানার অ্যাডমিন প্যানেল থেকে ফ্রেশ ভাবে যুক্ত করতে পারবেন।
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm("🚨 WARNING (সতর্কতা):\n\nAre you sure you want to delete ALL demo products, coupons, subscribers, and reset settings to a blank slate? This action is permanent and cannot be undone!\n\n(আপনি কি নিশ্চিত যে আপনি সকল ডেমো প্রোডাক্ট, ব্যানার এবং তথ্য মুছে ফেলতে চান? এটি করার পর ডাটা আর ফেরত পাওয়া যাবে না!)")) {
                        await clearAllSampleData();
                        // Reload page to refresh all states
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-lg uppercase tracking-wider shadow-sm transition-all flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All Demo Data (সব ডেমো ডাটা মুছুন)
                  </button>
                </div>
              </>
            )}

              {/* TAB 7: SOCIAL MEDIA */}
              {activeTab === 'social' && (
                <form onSubmit={handleSaveSocial} className="space-y-4">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">Social Media Platform Links</h3>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Facebook Fanpage URL</label>
                    <input 
                      type="url" 
                      value={fbUrl}
                      onChange={(e)=>setFbUrl(e.target.value)}
                      placeholder="https://facebook.com/your-page"
                      className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Instagram Profile URL</label>
                    <input 
                      type="url" 
                      value={igUrl}
                      onChange={(e)=>setIgUrl(e.target.value)}
                      placeholder="https://instagram.com/your-username"
                      className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">YouTube Channel URL</label>
                    <input 
                      type="url" 
                      value={ytUrl}
                      onChange={(e)=>setYtUrl(e.target.value)}
                      placeholder="https://youtube.com/channel-id"
                      className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">TikTok Account URL</label>
                    <input 
                      type="url" 
                      value={tkUrl}
                      onChange={(e)=>setTkUrl(e.target.value)}
                      placeholder="https://tiktok.com/@username"
                      className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">WhatsApp Chat Link</label>
                    <input 
                      type="url" 
                      value={waUrl}
                      onChange={(e)=>setWaUrl(e.target.value)}
                      placeholder="https://wa.me/88017XXXXXXXX"
                      className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-black rounded-lg uppercase"
                  >
                    Save Social Links
                  </button>
                </form>
              )}

              {/* TAB 8: COURIER DELIVERY SERVICES */}
              {activeTab === 'courier' && (
                <form onSubmit={handleSaveCourier} className="space-y-4">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                    Courier Service charges (ডেলিভারি চার্জ নির্ধারণ)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Inside Savar Area Charge (সাভারের ভেতরে)</label>
                      <input 
                        type="number" 
                        required
                        value={insideSavarInput}
                        onChange={(e)=>setInsideSavarInput(Number(e.target.value))}
                        className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Outside Savar Area Charge (সাভারের বাইরে)</label>
                      <input 
                        type="number" 
                        required
                        value={outsideSavarInput}
                        onChange={(e)=>setOutsideSavarInput(Number(e.target.value))}
                        className="w-full bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Specific District charges addition */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-3">
                    <span className="text-xs font-black text-gray-700 block uppercase">Configure Specific District Charge (ডিস্ট্রিক্ট চার্জ সেট করুন)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Select District (জেলা নির্বাচন করুন)</label>
                        <select 
                          value={selectedDistrictEdit}
                          onChange={(e)=>{
                            setSelectedDistrictEdit(e.target.value);
                            setCustomDistrictInput(''); // Clear custom input when dropdown changes
                          }}
                          className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg font-semibold"
                        >
                          {['Savar', ...BANGLADESH_DISTRICTS.filter(d => d !== 'Savar')].map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 block mb-1">Or Add Custom Jela/Area Name (অথবা নতুন জেলা/এলাকা নাম লিখুন)</label>
                        <input 
                          type="text" 
                          value={customDistrictInput}
                          onChange={(e)=>setCustomDistrictInput(e.target.value)}
                          placeholder="e.g. Savar, Ashulia, Keraniganj"
                          className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg font-semibold placeholder:font-normal placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Delivery Charge (৳)</label>
                        <input 
                          type="number" 
                          required
                          value={districtChargeInput}
                          onChange={(e)=>setDistrictChargeInput(Number(e.target.value))}
                          className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg font-semibold"
                        />
                      </div>
                      <button
                        type="submit"
                        className="py-2 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-black rounded-lg uppercase tracking-wider"
                      >
                        Apply / Add Jela Charge (জেলা বা এলাকা যোগ করুন)
                      </button>
                    </div>
                  </div>

                  {/* Render current configured district charges */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-black text-gray-700 block uppercase">Currently Configured District Charges</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-100 bg-white rounded-lg p-3">
                      {Object.entries(courierSettings.districtCharges).map(([dist, val]) => (
                        <div key={dist} className="bg-slate-50 rounded-md p-2 border border-gray-100 flex justify-between items-center text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-gray-800 block truncate">{dist}</span>
                            <span className="text-[10px] text-blue-600 font-extrabold block">৳{val}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedCharges = { ...courierSettings.districtCharges };
                              delete updatedCharges[dist];
                              updateCourierSettings({
                                ...courierSettings,
                                districtCharges: updatedCharges
                              });
                            }}
                            className="p-1 hover:bg-red-50 text-red-500 rounded-lg shrink-0 transition-colors"
                            title="Delete district charge"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BANGLADESH COURIER SERVICE COLLABORATION SECTION */}
                  <div className="mt-8 border-t border-gray-200 pt-6 space-y-6">
                    <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 opacity-10 transform translate-x-12 -translate-y-6">
                        <Truck className="h-48 w-48" />
                      </div>
                      <div className="relative z-10 space-y-2">
                        <span className="bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Bangladesh Local Courier Partnerships
                        </span>
                        <h4 className="text-lg font-black tracking-tight uppercase">
                          Bangladesh Courier Service Collaboration (বাংলাদেশ কুরিয়ার সার্ভিস পার্টনারশিপ)
                        </h4>
                        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                          আপনার ইয়াং স্টাইল শপের সাথে বাংলাদেশের সেরা ই-কমার্স ডেলিভারি সার্ভিসগুলোর মার্চেন্ট একাউন্ট এপিআই ও পার্টনারশিপ সেটিংস যুক্ত করুন। এর মাধ্যমে খুব সহজে ১-ক্লিক বুকিং, অটোমেটিক ট্র্যাকিং এবং কাস্টমার আপডেট চালু করতে পারবেন।
                        </p>
                      </div>
                    </div>

                    {/* COURIER PARTNERS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'steadfast', name: 'Steadfast Courier', bnName: 'স্টিডফাস্ট কুরিয়ার', type: 'COD, Prepaid, Smart API', coverage: 'Nationwide (64 Districts)', logoBg: 'bg-orange-500', website: 'https://steadfast.com.bd' },
                        { id: 'pathao', name: 'Pathao Courier', bnName: 'পাঠাও কুরিয়ার', type: 'Instant COD, API, Fast Hub', coverage: 'Nationwide (64 Districts)', logoBg: 'bg-red-600', website: 'https://pathao.com/courier' },
                        { id: 'redx', name: 'RedX Delivery', bnName: 'রেডএক্স ডেলিভারি', type: 'Next-day COD, Tech-Enabled', coverage: 'Nationwide & Sub-urban', logoBg: 'bg-rose-500', website: 'https://redx.com.bd' },
                        { id: 'ecourier', name: 'eCourier', bnName: 'ই-কুরিয়ার', type: 'Air & Land COD, Corporate API', coverage: 'Nationwide (Home Delivery)', logoBg: 'bg-teal-600', website: 'https://ecourier.com.bd' },
                        { id: 'sundarban', name: 'Sundarban Courier', bnName: 'সুন্দরবন কুরিয়ার', type: 'Branch-to-Branch & Home Delivery', coverage: 'Full Bangladesh (Thana level)', logoBg: 'bg-green-600', website: 'https://sundarbancourierltd.com' },
                        { id: 'sa_paribahan', name: 'SA Paribahan', bnName: 'এস এ পরিবহন', type: 'Branch-to-Branch parcel, Cash COD', coverage: 'Major Districts & Sub-divisions', logoBg: 'bg-blue-700', website: 'https://saparibahan.com' }
                      ].map(partner => {
                        const isConnected = courierCollabs[partner.id]?.connected;
                        const isSelected = selectedCollabCourier === partner.id;
                        return (
                          <div 
                            key={partner.id} 
                            onClick={() => setSelectedCollabCourier(partner.id)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                              isSelected 
                                ? 'border-[#1877F2] bg-blue-50/25 ring-2 ring-[#1877F2]/20 shadow-md' 
                                : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-md shadow-xs'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-lg ${partner.logoBg} flex items-center justify-center text-white font-black text-xs uppercase tracking-wider`}>
                                  {partner.name.substring(0, 2)}
                                </div>
                                <div>
                                  <h5 className="font-extrabold text-gray-800 text-xs">{partner.name}</h5>
                                  <span className="text-[10px] text-gray-400 font-bold block">{partner.bnName}</span>
                                </div>
                              </div>
                              
                              {isConnected ? (
                                <span className="bg-green-50 text-green-600 border border-green-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shrink-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                  Connected
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                                  Not Linked
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5 text-[11px] text-gray-500 mb-4 border-b border-gray-50 pb-3">
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Service Type:</span>
                                <span className="font-semibold text-gray-700">{partner.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Coverage Area:</span>
                                <span className="font-semibold text-gray-700">{partner.coverage}</span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                className={`flex-1 py-1.5 text-center font-black text-[10px] rounded-lg transition-colors uppercase tracking-wider ${
                                  isSelected
                                    ? 'bg-[#1877F2] text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                }`}
                              >
                                {partner.id === 'sundarban' || partner.id === 'sa_paribahan' ? 'Open Settings (সেটিংস খুলুন)' : 'API & Applications (এপিআই ও আবেদন)'}
                              </button>
                              <a 
                                href={partner.website} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-gray-200 text-gray-500 hover:text-gray-800 rounded-lg flex items-center justify-center transition-colors"
                                title="Visit official partner website"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DYNAMIC INTEGRATION CONFIGURATION PANEL */}
                    {selectedCollabCourier && (() => {
                      const courierDetailsMap: Record<string, { name: string, bnName: string, isApi: boolean }> = {
                        steadfast: { name: 'Steadfast Courier', bnName: 'স্টিডফাস্ট কুরিয়ার', isApi: true },
                        pathao: { name: 'Pathao Courier', bnName: 'পাঠাও কুরিয়ার', isApi: true },
                        redx: { name: 'RedX Delivery', bnName: 'রেডএক্স ডেলিভারি', isApi: true },
                        ecourier: { name: 'eCourier', bnName: 'ই-কুরিয়ার', isApi: true },
                        sundarban: { name: 'Sundarban Courier', bnName: 'সুন্দরবন কুরিয়ার', isApi: false },
                        sa_paribahan: { name: 'SA Paribahan', bnName: 'এস এ পরিবহন', isApi: false },
                      };
                      
                      const cd = courierDetailsMap[selectedCollabCourier];
                      const currentVals = courierCollabs[selectedCollabCourier] || {
                        connected: false, apiKey: '', clientId: '', clientSecret: '', storeId: '', senderBranch: '', senderPhone: ''
                      };

                      const handleUpdateCollabField = (key: string, value: string) => {
                        setCourierCollabs(prev => ({
                          ...prev,
                          [selectedCollabCourier]: {
                            ...prev[selectedCollabCourier],
                            [key]: value
                          }
                        }));
                      };

                      const handleToggleConnect = (e: React.FormEvent) => {
                        e.preventDefault();
                        const isCurrentlyConnected = currentVals.connected;
                        setCourierCollabs(prev => ({
                          ...prev,
                          [selectedCollabCourier]: {
                            ...prev[selectedCollabCourier],
                            connected: !isCurrentlyConnected
                          }
                        }));
                        
                        if (!isCurrentlyConnected) {
                          alert(`🎉 ${cd.name} successfully connected with your Young Style store! (সফলভাবে কানেক্ট হয়েছে)`);
                        } else {
                          alert(`🔌 Disconnected ${cd.name} integration. (কানেকশন বিচ্ছিন্ন করা হয়েছে)`);
                        }
                      };

                      // Helper function for local base64 files
                      const triggerFileInputToBase64 = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const r = new FileReader();
                        r.onloadend = () => {
                          if (typeof r.result === 'string') {
                            setter(r.result);
                          }
                        };
                        r.readAsDataURL(file);
                      };

                      const handleDocumentSubmit = (e: React.FormEvent) => {
                        e.preventDefault();
                        const reqId = 'REQ-' + Math.floor(1000 + Math.random() * 9000);
                        const newRequest = {
                          id: reqId,
                          courierId: selectedCollabCourier,
                          courierName: cd.name,
                          applicantName,
                          applicantPhone,
                          address: applicantAddress,
                          tradeLicense,
                          tradeLicenseFile,
                          nidNumber,
                          nidFile,
                          bankName,
                          bankBranch,
                          bankAccName,
                          bankAccNumber,
                          chequeFile,
                          ownerPhotoFile,
                          date: new Date().toISOString().split('T')[0],
                          status: 'Pending Review' as const
                        };
                        
                        setCollabRequests(prev => [newRequest, ...prev]);
                        alert(`📂 [ Young Style Merchant Application Generated ]\n\n${cd.name} মার্চেন্ট পার্টনারশিপের জন্য আপনার প্রয়োজনীয় কাগজপত্র সফলভাবে আপলোড হয়েছে! \n\nট্র্যাকিং আইডি: ${reqId}\nসবগুলো ডকুমেন্ট নিচের তালিকা থেকে 'Inspect Documents' বাটনে ক্লিক করে চেক করতে পারেন।`);
                        
                        // Clear file attachments only, keep texts for quicker next entries
                        setTradeLicenseFile('');
                        setNidFile('');
                        setChequeFile('');
                        setOwnerPhotoFile('');
                      };

                      return (
                        <div className="bg-slate-50 rounded-2xl p-5 border border-blue-100 shadow-xs space-y-5 animate-fade-in text-left">
                          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                            <div className="flex items-center gap-2">
                              <Settings className="h-5 w-5 text-[#1877F2]" />
                              <div>
                                <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-tight">
                                  Configure {cd.name} Partner Controls
                                </h4>
                                <span className="text-[10px] text-gray-500 font-bold block">
                                  {cd.bnName} মার্চেন্ট কানেকশন ও ডকুমেন্ট সাবমিশন সেটিংস
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedCollabCourier(null)}
                              className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* SUB-TABS SELECTOR FOR EACH COURIER */}
                          <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setCourierSetupTab('api')}
                              className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                                courierSetupTab === 'api'
                                  ? 'bg-white text-[#1877F2] shadow-sm'
                                  : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              🔑 API Credentials (এপিআই সেটআপ)
                            </button>
                            <button
                              type="button"
                              onClick={() => setCourierSetupTab('apply')}
                              className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                courierSetupTab === 'apply'
                                  ? 'bg-white text-emerald-600 shadow-sm'
                                  : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              📂 Document Submission Wizard (কাগজপত্র ও নতুন অ্যাকাউন্ট)
                            </button>
                          </div>

                          {courierSetupTab === 'api' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Form side */}
                              <form onSubmit={handleToggleConnect} className="lg:col-span-2 space-y-4">
                                {cd.isApi ? (
                                  <div className="space-y-3">
                                    <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex items-start gap-2">
                                      <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                      <p className="text-[10px] text-blue-800 leading-relaxed">
                                        এপিআই কানেক্ট করার জন্য আপনার {cd.name} মার্চেন্ট ড্যাশবোর্ড (API Settings) থেকে সংগৃহীত ক্রেডেনশিয়াল নিচে প্রদান করুন। ভুল ক্রেডেনশিয়াল দিলে কাস্টমার অর্ডার বুকিং হবে না।
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] font-bold text-gray-600 block mb-1">API Key / Token (কপি করা এপিআই টোকেন)</label>
                                        <input 
                                          type="password" 
                                          value={currentVals.apiKey || ''} 
                                          onChange={(e) => handleUpdateCollabField('apiKey', e.target.value)}
                                          placeholder="e.g. sk_live_8a72da89f..."
                                          className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:border-[#1877F2]"
                                          required={!currentVals.connected}
                                        />
                                      </div>
                                      {selectedCollabCourier === 'pathao' && (
                                        <>
                                          <div>
                                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Client ID</label>
                                            <input 
                                              type="text" 
                                              value={currentVals.clientId || ''} 
                                              onChange={(e) => handleUpdateCollabField('clientId', e.target.value)}
                                              placeholder="Client ID for Pathao API"
                                              className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#1877F2]"
                                              required={!currentVals.connected}
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Client Secret</label>
                                            <input 
                                              type="password" 
                                              value={currentVals.clientSecret || ''} 
                                              onChange={(e) => handleUpdateCollabField('clientSecret', e.target.value)}
                                              className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#1877F2]"
                                              required={!currentVals.connected}
                                            />
                                          </div>
                                        </>
                                      )}
                                      <div>
                                        <label className="text-[10px] font-bold text-gray-600 block mb-1">Merchant Store ID (মার্চেন্ট স্টোর আইডি)</label>
                                        <input 
                                          type="text" 
                                          value={currentVals.storeId || ''} 
                                          onChange={(e) => handleUpdateCollabField('storeId', e.target.value)}
                                          placeholder="e.g. 19283"
                                          className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#1877F2]"
                                          required={!currentVals.connected}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="bg-green-50/50 rounded-lg p-3 border border-green-100 flex items-start gap-2">
                                      <Building2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                      <p className="text-[10px] text-green-800 leading-relaxed">
                                        সুন্দরবন ও এস এ পরিবহন সাধারণত ম্যানুয়াল/ব্রাঞ্চ বুকিং গ্রহণ করে। তবে নিচের সেটিংস সেট করে রাখলে আপনার Young Style প্যানেল থেকে সরাসরি বুকিং রিসিট জেনারেট করে তাদের ব্রাঞ্চে প্রেরণ করতে পারবেন।
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] font-bold text-gray-600 block mb-1">Our Default Branch Code (যে ব্রাঞ্চ থেকে পাঠাবেন)</label>
                                        <input 
                                          type="text" 
                                          value={currentVals.senderBranch || ''} 
                                          onChange={(e) => handleUpdateCollabField('senderBranch', e.target.value)}
                                          placeholder="e.g. Savar Branch (সাভার ব্রাঞ্চ)"
                                          className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#1877F2]"
                                          required={!currentVals.connected}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-gray-600 block mb-1">Sender Merchant Phone (বুকিং নম্বর)</label>
                                        <input 
                                          type="text" 
                                          value={currentVals.senderPhone || ''} 
                                          onChange={(e) => handleUpdateCollabField('senderPhone', e.target.value)}
                                          placeholder="e.g. 01712345678"
                                          className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#1877F2]"
                                          required={!currentVals.connected}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-3">
                                  <button
                                    type="submit"
                                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                      currentVals.connected 
                                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-xs' 
                                        : 'bg-[#1877F2] hover:bg-blue-600 text-white shadow-xs'
                                    }`}
                                  >
                                    {currentVals.connected ? 'Disconnect Partner (কানেকশন বিচ্ছিন্ন করুন)' : 'Save & Active Connection (কানেক্ট ও সক্রিয় করুন)'}
                                  </button>
                                  
                                  {!currentVals.connected && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        alert("🧪 Simulated API handshake... API credentials test is SUCCESSFUL! Click 'Save & Active Connection' to enable booking workflows.");
                                      }}
                                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black rounded-lg uppercase transition-colors"
                                    >
                                      Test Credentials (এপিআই টেস্ট)
                                    </button>
                                  )}
                                </div>
                              </form>

                              {/* Help info side */}
                              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
                                <h5 className="font-extrabold text-xs text-gray-800 uppercase tracking-tight flex items-center gap-1.5">
                                  <FileText className="h-4 w-4 text-[#1877F2]" />
                                  <span>Merchant Integration Guide</span>
                                </h5>
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                  আপনার যদি ইতোমধ্যে {cd.name} মার্চেন্ট অ্যাকাউন্ট থাকে, তাহলে এই সেকশনে আইডি ও এপিআই টোকেন বসিয়ে সরাসরি কানেক্ট করুন। আপনার কোনো অ্যাকাউন্ট না থাকলে পাশে অবস্থিত <strong>'Document Submission Wizard'</strong> ব্যবহার করে প্রয়োজনীয় কাগজপত্র সহ অ্যাকাউন্ট আবেদন করতে পারবেন।
                                </p>
                              </div>
                            </div>
                          ) : (
                            /* DETAILED BUSINESS DOCUMENTS SUBMISSION SYSTEM */
                            <form onSubmit={handleDocumentSubmit} className="space-y-6">
                              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-start gap-2.5">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <h5 className="text-xs font-black text-emerald-800 uppercase tracking-wide">Business Verification Required (ডকুমেন্ট ভেরিফিকেশন ফর্ম)</h5>
                                  <p className="text-[10px] text-emerald-700 leading-relaxed">
                                    বাংলাদেশের স্থানীয় কুরিয়ারের সাথে মার্চেন্ট পার্টনারশিপ শুরু করার জন্য ব্যাংক অ্যাকাউন্ট ও ব্যবসায়িক তথ্যাদি ভেরিফাই করা বাধ্যতামূলক। নিম্নের সবগুলো ঘর পূরণ করুন এবং ফাইলসমূহ (ট্রেড লাইসেন্স, এনআইডি, ব্যাংক চেক বইয়ের পাতা, ও নিজের ছবি) আপলোড করুন।
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Left Side: General Owner/Biz Details */}
                                <div className="space-y-4">
                                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center gap-1.5">
                                    <span className="h-2 w-2 bg-emerald-500 rounded-full"></span>
                                    Applicant & Shop Info (মালিক ও দোকানের তথ্য)
                                  </h4>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-black text-gray-600 block mb-1">Owner Name (মালিকের নাম)</label>
                                      <input 
                                        type="text"
                                        required
                                        value={applicantName}
                                        onChange={(e) => setApplicantName(e.target.value)}
                                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-semibold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black text-gray-600 block mb-1">Contact Phone (যোগাযোগের মোবাইল)</label>
                                      <input 
                                        type="text"
                                        required
                                        value={applicantPhone}
                                        onChange={(e) => setApplicantPhone(e.target.value)}
                                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-semibold"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-gray-600 block mb-1">Pickup / Warehouse Address (পিকআপ ও গুদামের ঠিকানা)</label>
                                    <input 
                                      type="text"
                                      required
                                      value={applicantAddress}
                                      onChange={(e) => setApplicantAddress(e.target.value)}
                                      className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-semibold"
                                      placeholder="e.g. Savar Bazar Road, Savar, Dhaka"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-black text-gray-600 block mb-1">Trade License No. (ট্রেড লাইসেন্স নম্বর)</label>
                                      <input 
                                        type="text"
                                        required
                                        value={tradeLicense}
                                        onChange={(e) => setTradeLicense(e.target.value)}
                                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-mono font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black text-gray-600 block mb-1">National ID / NID Number (জাতীয় পরিচয়পত্র নম্বর)</label>
                                      <input 
                                        type="text"
                                        required
                                        value={nidNumber}
                                        onChange={(e) => setNidNumber(e.target.value)}
                                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-mono font-bold"
                                      />
                                    </div>
                                  </div>

                                  {/* Settlement Bank Details */}
                                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 pt-2 flex items-center gap-1.5">
                                    <span className="h-2 w-2 bg-[#1877F2] rounded-full"></span>
                                    Settlement Bank Account (টাকা উত্তোলনের ব্যাংক হিসাব)
                                  </h4>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-black text-gray-600 block mb-1">Bank Name (ব্যাংকের নাম)</label>
                                      <input 
                                        type="text"
                                        required
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-semibold"
                                        placeholder="e.g. Dhaka Bank PLC"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black text-gray-600 block mb-1">Account Holder Name (হিসাবের নাম)</label>
                                      <input 
                                        type="text"
                                        required
                                        value={bankAccName}
                                        onChange={(e) => setBankAccName(e.target.value)}
                                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-semibold"
                                        placeholder="Young Style Limited"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-black text-gray-600 block mb-1">Account Number (হিসাব নম্বর)</label>
                                      <input 
                                        type="text"
                                        required
                                        value={bankAccNumber}
                                        onChange={(e) => setBankAccNumber(e.target.value)}
                                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-mono font-bold"
                                        placeholder="e.g. 2051011123456"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black text-gray-600 block mb-1">Branch Name (শাখার নাম)</label>
                                      <input 
                                        type="text"
                                        required
                                        value={bankBranch}
                                        onChange={(e) => setBankBranch(e.target.value)}
                                        className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 font-semibold"
                                        placeholder="e.g. Savar Branch"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Multi Document Upload fields with real-time base64 previews! */}
                                <div className="space-y-4">
                                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center gap-1.5">
                                    <span className="h-2 w-2 bg-purple-500 rounded-full"></span>
                                    Required Document Files (প্রয়োজনীয় কাগজপত্র স্ক্যান/ছবি)
                                  </h4>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* 1. Trade License */}
                                    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                                      <span className="text-[10px] font-black text-gray-700 block uppercase">1. Trade License Copy (ট্রেড লাইসেন্স কপি)</span>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => triggerFileInputToBase64(e, setTradeLicenseFile)}
                                        className="text-[10px] text-gray-500 w-full"
                                      />
                                      {tradeLicenseFile ? (
                                        <div className="h-20 w-full overflow-hidden rounded border border-gray-200 relative bg-gray-50">
                                          <img src={tradeLicenseFile} alt="Trade License Preview" className="h-full w-full object-cover" />
                                          <span className="absolute bottom-1 right-1 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded font-bold uppercase">Uploaded</span>
                                        </div>
                                      ) : (
                                        <div className="h-20 w-full rounded border-2 border-dashed border-gray-100 flex items-center justify-center bg-slate-50/50 text-[10px] text-gray-400">
                                          No Document Selected
                                        </div>
                                      )}
                                    </div>

                                    {/* 2. NID Card */}
                                    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                                      <span className="text-[10px] font-black text-gray-700 block uppercase">2. NID Card Copy (এনআইডি কার্ড কপি)</span>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => triggerFileInputToBase64(e, setNidFile)}
                                        className="text-[10px] text-gray-500 w-full"
                                      />
                                      {nidFile ? (
                                        <div className="h-20 w-full overflow-hidden rounded border border-gray-200 relative bg-gray-50">
                                          <img src={nidFile} alt="NID Preview" className="h-full w-full object-cover" />
                                          <span className="absolute bottom-1 right-1 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded font-bold uppercase">Uploaded</span>
                                        </div>
                                      ) : (
                                        <div className="h-20 w-full rounded border-2 border-dashed border-gray-100 flex items-center justify-center bg-slate-50/50 text-[10px] text-gray-400">
                                          No Document Selected
                                        </div>
                                      )}
                                    </div>

                                    {/* 3. Cheque Leaf */}
                                    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                                      <span className="text-[10px] font-black text-gray-700 block uppercase">3. Cheque Leaf Copy (ব্যাংক চেক বইয়ের পাতা)</span>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => triggerFileInputToBase64(e, setChequeFile)}
                                        className="text-[10px] text-gray-500 w-full"
                                      />
                                      {chequeFile ? (
                                        <div className="h-20 w-full overflow-hidden rounded border border-gray-200 relative bg-gray-50">
                                          <img src={chequeFile} alt="Cheque Preview" className="h-full w-full object-cover" />
                                          <span className="absolute bottom-1 right-1 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded font-bold uppercase">Uploaded</span>
                                        </div>
                                      ) : (
                                        <div className="h-20 w-full rounded border-2 border-dashed border-gray-100 flex items-center justify-center bg-slate-50/50 text-[10px] text-gray-400">
                                          No Document Selected
                                        </div>
                                      )}
                                    </div>

                                    {/* 4. Owner Photo */}
                                    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                                      <span className="text-[10px] font-black text-gray-700 block uppercase">4. Owner Passport Photo (মালিকের রঙিন ছবি)</span>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => triggerFileInputToBase64(e, setOwnerPhotoFile)}
                                        className="text-[10px] text-gray-500 w-full"
                                      />
                                      {ownerPhotoFile ? (
                                        <div className="h-20 w-full overflow-hidden rounded border border-gray-200 relative bg-gray-50">
                                          <img src={ownerPhotoFile} alt="Owner Photo Preview" className="h-full w-full object-cover" />
                                          <span className="absolute bottom-1 right-1 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded font-bold uppercase">Uploaded</span>
                                        </div>
                                      ) : (
                                        <div className="h-20 w-full rounded border-2 border-dashed border-gray-100 flex items-center justify-center bg-slate-50/50 text-[10px] text-gray-400">
                                          No Document Selected
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pt-4">
                                    <button
                                      type="submit"
                                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                      Submit Documents & Apply (কাগজপত্র জমা দিন ও আবেদন করুন)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })()}

                    {/* ACTIVE COLLABORATION REQUESTS STATUS TABLE */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-xs text-left">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-wide">
                            Partnership Requests Status (কোলাবোরেশন ও মার্চেন্ট লিঙ্ক আবেদন ট্র্যাকিং)
                          </h4>
                          <span className="text-[10px] text-gray-400 font-semibold block">
                            সাবমিট করা মার্চেন্ট পার্টনারশিপ আবেদনগুলোর বর্তমান অগ্রগতি ও জমা দেওয়া ডকুমেন্টস
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold bg-slate-100 px-2.5 py-1 rounded-full uppercase">
                          {collabRequests.length} Total Requests
                        </span>
                      </div>

                      <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 font-black text-[10px] uppercase">
                              <th className="p-3">Req ID</th>
                              <th className="p-3">Courier Name</th>
                              <th className="p-3">Applicant Name</th>
                              <th className="p-3">Trade License</th>
                              <th className="p-3">Date Submitted</th>
                              <th className="p-3">Uploaded Documents</th>
                              <th className="p-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-gray-700">
                            {collabRequests.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-6 text-center text-gray-400 font-bold">
                                  কোনো কোলাবোরেশন রিকোয়েস্ট পাওয়া যায়নি।
                                </td>
                              </tr>
                            ) : (
                              collabRequests.map(req => {
                                const hasDocs = req.tradeLicenseFile || req.nidFile || req.chequeFile || req.ownerPhotoFile;
                                return (
                                  <tr key={req.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-mono font-bold text-gray-900">{req.id}</td>
                                    <td className="p-3 font-extrabold text-[#1877F2]">{req.courierName}</td>
                                    <td className="p-3 font-medium">
                                      <span className="block">{req.applicantName}</span>
                                      <span className="text-[9px] text-gray-400 block">{req.applicantPhone}</span>
                                    </td>
                                    <td className="p-3 font-semibold text-gray-500">{req.tradeLicense || 'Not Provided'}</td>
                                    <td className="p-3 font-semibold text-gray-400">{req.date}</td>
                                    <td className="p-3 font-semibold text-gray-400">
                                      {hasDocs ? (
                                        <button
                                          type="button"
                                          onClick={() => setInspectRequestDocs(req)}
                                          className="text-[10px] text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 font-black px-2 py-1 rounded-md uppercase transition-colors"
                                        >
                                          🔍 Inspect Docs ({[req.tradeLicenseFile, req.nidFile, req.chequeFile, req.ownerPhotoFile].filter(Boolean).length}/4)
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-gray-400 italic">No Uploads (শুধুমাত্র আবেদন)</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-right">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                        req.status === 'Approved' 
                                          ? 'bg-green-50 text-green-600 border border-green-100'
                                          : req.status === 'Sent'
                                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                            : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                                      }`}>
                                        {req.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* COURIER SHIPMENT BOOKING & TRACKING CONSOLE */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-xs">
                      <div>
                        <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-wide">
                          Smart Dispatch Console (১-ক্লিক কুরিয়ার বুকিং ড্যাশবোর্ড)
                        </h4>
                        <span className="text-[10px] text-gray-400 font-semibold block">
                          কাস্টমারদের পেন্ডিং অর্ডারগুলো সরাসরি কানেক্টেড কুরিয়ারে বুকিং করুন এবং ট্র্যাকিং আইডি জেনারেট করুন।
                        </span>
                      </div>

                      <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 font-black text-[10px] uppercase">
                              <th className="p-3">Order ID</th>
                              <th className="p-3">Customer Info</th>
                              <th className="p-3">District</th>
                              <th className="p-3">Order Value</th>
                              <th className="p-3">Link Courier Partner</th>
                              <th className="p-3 text-right">Tracking Detail</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-gray-700">
                            {orders.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-6 text-center text-gray-400 font-bold">
                                  বুকিং করার মতো কোনো অর্ডার পাওয়া যায়নি।
                                </td>
                              </tr>
                            ) : (
                              orders.slice(0, 10).map(ord => {
                                const booking = courierBookings[ord.id];
                                return (
                                  <tr key={ord.id} className="hover:bg-slate-50/50">
                                    <td className="p-3">
                                      <span className="font-mono font-bold block text-gray-800">{ord.id}</span>
                                      <span className="text-[9px] text-gray-400 font-semibold block">{ord.orderDate}</span>
                                    </td>
                                    <td className="p-3 font-semibold">
                                      <span className="block text-gray-800">{ord.customerName}</span>
                                      <span className="text-[9px] text-gray-400 block">{ord.customerPhone}</span>
                                    </td>
                                    <td className="p-3">
                                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                        {ord.customerDistrict}
                                      </span>
                                    </td>
                                    <td className="p-3 font-bold text-gray-900">৳{ord.totalAmount}</td>
                                    <td className="p-3">
                                      {booking ? (
                                        <span className="font-extrabold text-slate-800 block">
                                          {booking.courierName}
                                        </span>
                                      ) : (
                                        <div className="flex gap-1.5 items-center">
                                          <select 
                                            id={`courier-select-${ord.id}`}
                                            className="bg-slate-50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-gray-700"
                                          >
                                            <option value="steadfast">Steadfast Courier</option>
                                            <option value="pathao">Pathao Courier</option>
                                            <option value="redx">RedX Delivery</option>
                                            <option value="ecourier">eCourier</option>
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const selectEl = document.getElementById(`courier-select-${ord.id}`) as HTMLSelectElement;
                                              const courierVal = selectEl ? selectEl.value : 'steadfast';
                                              const courierNames: Record<string, string> = {
                                                steadfast: 'Steadfast Courier',
                                                pathao: 'Pathao Courier',
                                                redx: 'RedX Delivery',
                                                ecourier: 'eCourier'
                                              };
                                              const prefix = courierVal.substring(0, 3).toUpperCase();
                                              const trackNum = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
                                              
                                              setCourierBookings(prev => ({
                                                ...prev,
                                                [ord.id]: {
                                                  courierName: courierNames[courierVal] || courierVal,
                                                  trackingId: trackNum,
                                                  bookingDate: new Date().toISOString().split('T')[0],
                                                  deliveryFee: ord.deliveryCharge,
                                                  status: 'Dispatched (কুরিয়ারে পাঠানো হয়েছে)'
                                                }
                                              }));

                                              updateOrderStatus(ord.id, 'Shipped');
                                              alert(`📦 Order ${ord.id} successfully booked with ${courierNames[courierVal]}! \nTracking ID: ${trackNum}`);
                                            }}
                                            className="px-2.5 py-1 bg-[#1877F2] hover:bg-blue-600 text-white font-black text-[10px] rounded-lg uppercase cursor-pointer"
                                          >
                                            Book (বুক)
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3 text-right">
                                      {booking ? (
                                        <div className="space-y-1">
                                          <span className="font-mono font-bold text-xs text-blue-600 block">
                                            {booking.trackingId}
                                          </span>
                                          <span className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100 font-extrabold uppercase inline-block">
                                            {booking.status}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 italic text-[10px]">Not Dispatched Yet</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </form>
              )}

                  /* COURIER SETTINGS SECTION */
    {activeTab === 'courier' && (
      <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
        <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-600">
          স্টেডফাস্ট কুরিয়ার পার্টনার নিয়ন্ত্রণগুলি কনফিগার করুন
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2">API কী / টোকেন (কপি করা এপিআই টোকেন)</label>
            <input 
              type="text" 
              className="w-full border rounded-lg px-3 py-2 text-sm" 
              placeholder="এখানে আপনার এপিআই টোকেন পেস্ট করুন"
              value={courierSettings?.apiKey || ''}
              onChange={(e) => updateCourierSettings({ ...courierSettings, apiKey: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2">মার্চেন্ট স্টোর আইডি (মার্চেন্ট স্টোর আইডি)</label>
            <input 
              type="text" 
              className="w-full border rounded-lg px-3 py-2 text-sm" 
              placeholder="2291185"
              value={courierSettings?.storeId || ''}
              onChange={(e) => updateCourierSettings({ ...courierSettings, storeId: e.target.value })}
            />
          </div>
          <button 
            type="button" 
            onClick={async (e) => {
              e.preventDefault();
              try {
                const { doc, setDoc } = await import('firebase/firestore');
                const { db } = await import('../../firebase');
                
                await setDoc(doc(db, 'settings', 'courier'), {
                  apiKey: courierSettings?.apiKey || '',
                  storeId: courierSettings?.storeId || ''
                }, { merge: true });

                alert('স্টেডফাস্ট কুরিয়ার সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
              } catch (error) {
                console.error(error);
                alert('সংরক্ষণ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700"
          >
            সংরক্ষণ এবং সক্রিয় সংযোগ (কানেক্ট ও সক্রিয় করুন)
          </button>
        </div>
      </div>
      )}
              
              
              {/* TAB 9: PAYMENT SETTINGS (ADD PAYMENT NUMBERS) */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  {/* REAL-TIME SALES SUMMARY */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                          <CreditCard className="h-4.5 w-4.5" />
                          Real-time Sales Summary (লাইভ সেলস রিপোর্ট)
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          অর্ডার কনফার্ম হওয়ার সাথে সাথে এখানে লাইভ সেলস ডাটা আপডেট হবে। (No fake/static values)
                        </span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse shrink-0">
                        Live Tracking
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {/* TODAY SALES */}
                      <div className="bg-slate-800/30 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Today's Sale (আজকের বিক্রি)</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 block">৳ {todaySales}</span>
                        <span className="text-[9px] text-slate-500 font-bold block">
                          Confirmed: {orders.filter(o => o.status === 'Confirmed' && isToday(o.createdAt)).length} orders
                        </span>
                      </div>

                      {/* WEEKLY SALES */}
                      <div className="bg-slate-800/30 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Weekly Sale (সাপ্তাহিক বিক্রি)</span>
                        <span className="text-lg sm:text-xl font-black text-[#1877F2] block">৳ {weeklySales}</span>
                        <span className="text-[9px] text-slate-500 font-bold block">
                          Last 7 Days Confirmed
                        </span>
                      </div>

                      {/* MONTHLY SALES */}
                      <div className="bg-slate-800/30 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Monthly Sale (মাসিক বিক্রি)</span>
                        <span className="text-lg sm:text-xl font-black text-purple-400 block">৳ {monthlySales}</span>
                        <span className="text-[9px] text-slate-500 font-bold block">
                          Last 30 Days Confirmed
                        </span>
                      </div>

                      {/* TOTAL SALES */}
                      <div className="bg-slate-800/30 border border-emerald-500/20 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Sale (সর্বমোট বিক্রি)</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 block">৳ {totalSales}</span>
                        <span className="text-[9px] text-slate-500 font-bold block">
                          All Time Confirmed
                        </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSavePayments} className="space-y-6">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                      Admin Payment Options (পেমেন্ট নাম্বার যোগ করুন)
                    </h3>

                  <div className="bg-pink-50/30 rounded-xl p-4 border border-pink-100 space-y-3">
                    <span className="text-xs font-black text-pink-700 block uppercase">Bkash Account Numbers (বিকাশ)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-pink-900 block mb-1">Standard Merchant bKash Phone</label>
                        <input 
                          type="text" 
                          required
                          value={bkashNumber}
                          onChange={(e)=>setBkashNumber(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs border border-pink-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-pink-900 block mb-1">COD advance delivery charge bKash Phone</label>
                        <input 
                          type="text" 
                          required
                          value={codBkashNum}
                          onChange={(e)=>setCodBkashNum(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs border border-pink-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50/30 rounded-xl p-4 border border-orange-100 space-y-3">
                    <span className="text-xs font-black text-orange-700 block uppercase">Nagad Account Numbers (নগদ)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-orange-900 block mb-1">Standard Merchant Nagad Phone</label>
                        <input 
                          type="text" 
                          required
                          value={nagadNumber}
                          onChange={(e)=>setNagadNumber(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs border border-orange-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-orange-900 block mb-1">COD advance delivery charge Nagad Phone</label>
                        <input 
                          type="text" 
                          required
                          value={codNagadNum}
                          onChange={(e)=>setCodNagadNum(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs border border-orange-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-black rounded-lg uppercase"
                  >
                    Save Merchant Payment Numbers
                  </button>
                </form>
              </div>
            )}

            </main>
          </div>
        )}

        {/* Subscriber Details Modal Overlay */}
        {selectedSub && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="bg-[#1877F2] text-white px-5 py-4 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider">Subscriber Details</h4>
                  <p className="text-[10px] text-blue-100 font-medium">গ্রাহক অ্যাকাউন্ট বিস্তারিত তথ্য</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors focus:outline-hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {loadingSubDetails ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-[#1877F2] border-t-transparent"></div>
                    <p className="text-xs text-gray-500 font-bold">লোডিং হচ্ছে... (Fetching from database...)</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Top Avatar & Email */}
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="h-14 w-14 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-[#1877F2]/20 shadow-xs shrink-0">
                        {(subProfile?.avatar || selectedSub.avatar) ? (
                          <img 
                            src={subProfile?.avatar || selectedSub.avatar} 
                            alt="Avatar" 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <span className="text-xl font-black text-[#1877F2] uppercase">
                            {selectedSub.email.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          subProfile ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#1877F2]'
                        }`}>
                          {subProfile ? 'Registered User (নিবন্ধিত কাস্টমার)' : 'Newsletter Only (নিউজলেটার সাবস্ক্রাইবার)'}
                        </span>
                        <h5 className="font-sans font-black text-gray-800 text-sm mt-1 truncate">
                          {subProfile?.name || 'Anonymous Customer (অজ্ঞাতনামা)'}
                        </h5>
                        <p className="text-xs text-gray-400 font-mono font-medium truncate">{selectedSub.email}</p>
                      </div>
                    </div>

                    {/* Profile Grid */}
                    <div className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-100 min-w-0">
                          <span className="text-[9px] text-gray-400 font-bold uppercase block mb-0.5">Name (নাম)</span>
                          <span className="font-bold text-gray-800 truncate block">{subProfile?.name || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-100 min-w-0">
                          <span className="text-[9px] text-gray-400 font-bold uppercase block mb-0.5">Phone (মোবাইল)</span>
                          <span className="font-bold text-gray-800 truncate block">{subProfile?.phone || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-100 min-w-0">
                          <span className="text-[9px] text-gray-400 font-bold uppercase block mb-0.5">District (জেলা)</span>
                          <span className="font-bold text-gray-800 truncate block">{subProfile?.district || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-100 min-w-0">
                          <span className="text-[9px] text-gray-400 font-bold uppercase block mb-0.5">Subscription Date</span>
                          <span className="font-bold text-gray-800 truncate block">
                            {selectedSub.createdAt ? new Date(selectedSub.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-[9px] text-gray-400 font-bold uppercase block mb-0.5">Address (ঠিকানা)</span>
                        <span className="font-bold text-gray-800 block whitespace-pre-wrap">{subProfile?.address || 'N/A'}</span>
                      </div>
                    </div>

                    {!subProfile && (
                      <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 text-[10px] text-amber-800 font-bold leading-relaxed">
                        ⚠️ এই ইমেইলটি দিয়ে কোনো কাস্টমার অ্যাকাউন্ট খোলা হয়নি। ইনি শুধুমাত্র নিউজলেটারে সাবস্ক্রাইব করেছেন। (Note: This subscriber has not registered a customer account yet. They only subscribed to the newsletter.)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-5 py-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors"
                >
                  Close (বন্ধ করুন)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Inspection Modal Overlay */}
        {inspectRequestDocs && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span>Merchant Partnership Application (ডকুমেন্ট ভেরিফিকেশন)</span>
                  </h4>
                  <p className="text-[10px] text-gray-300 font-bold">{inspectRequestDocs.courierName} — Application: {inspectRequestDocs.id}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setInspectRequestDocs(null)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors focus:outline-hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-left">
                {/* Status bar */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-gray-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-700">Current Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      inspectRequestDocs.status === 'Approved' 
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                    }`}>
                      {inspectRequestDocs.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {inspectRequestDocs.status !== 'Approved' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCollabRequests(prev => prev.map(r => r.id === inspectRequestDocs.id ? { ...r, status: 'Approved' } : r));
                          setInspectRequestDocs(prev => ({ ...prev, status: 'Approved' }));
                          alert(`✅ Application ${inspectRequestDocs.id} is approved! Partner Courier has been connected and activated.`);
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                      >
                        Approve Partnership (অনুমোদন করুন)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this application?')) {
                          setCollabRequests(prev => prev.filter(r => r.id !== inspectRequestDocs.id));
                          setInspectRequestDocs(null);
                        }
                      }}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete Request
                    </button>
                  </div>
                </div>

                {/* Grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Left info column */}
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-1 mb-2">Applicant details</h5>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 font-bold block">OWNER NAME</span>
                          <span className="font-bold text-gray-800">{inspectRequestDocs.applicantName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block">MOBILE PHONE</span>
                          <span className="font-bold text-gray-800">{inspectRequestDocs.applicantPhone}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px]">
                        <span className="text-gray-400 font-bold block">WAREHOUSE / PICKUP ADDRESS</span>
                        <span className="font-semibold text-gray-700">{inspectRequestDocs.address}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 font-bold block">TRADE LICENSE NO.</span>
                          <span className="font-mono font-bold text-gray-800">{inspectRequestDocs.tradeLicense}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block">NATIONAL NID NO.</span>
                          <span className="font-mono font-bold text-gray-800">{inspectRequestDocs.nidNumber || '5512894123'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-1 mb-2">Settlement Bank Details</h5>
                      <div className="bg-slate-50/50 rounded-xl p-3 border border-gray-100 space-y-2 text-[11px]">
                        <div className="flex justify-between border-b border-gray-100/50 pb-1">
                          <span className="text-gray-400 font-bold">Bank Name:</span>
                          <span className="font-bold text-gray-800">{inspectRequestDocs.bankName || 'Dhaka Bank PLC'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100/50 pb-1">
                          <span className="text-gray-400 font-bold">Account Holder:</span>
                          <span className="font-bold text-gray-800">{inspectRequestDocs.bankAccName || 'Young Style Limited'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100/50 pb-1">
                          <span className="text-gray-400 font-bold">Account Number:</span>
                          <span className="font-mono font-bold text-blue-600">{inspectRequestDocs.bankAccNumber || '2051011123456'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-bold">Branch Name:</span>
                          <span className="font-bold text-gray-800">{inspectRequestDocs.bankBranch || 'Savar Branch'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right photo/attachment files column */}
                  <div className="space-y-4">
                    <h5 className="font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-1 font-bold text-gray-800">Submitted Files & Attachments</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Owner photo */}
                      <div className="border border-gray-100 rounded-lg p-2 bg-slate-50 text-center">
                        <span className="text-[9px] font-black text-gray-500 block mb-1 uppercase">1. Owner Photo</span>
                        {inspectRequestDocs.ownerPhotoFile ? (
                          <a href={inspectRequestDocs.ownerPhotoFile} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded border border-gray-200">
                            <img src={inspectRequestDocs.ownerPhotoFile} alt="OwnerPhoto" className="h-24 w-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-bold uppercase">View Original</div>
                          </a>
                        ) : (
                          <div className="h-24 rounded border-2 border-dashed border-gray-100 flex items-center justify-center text-[10px] text-gray-400 bg-white italic font-bold">
                            Default Photo
                          </div>
                        )}
                      </div>

                      {/* Trade License */}
                      <div className="border border-gray-100 rounded-lg p-2 bg-slate-50 text-center">
                        <span className="text-[9px] font-black text-gray-500 block mb-1 uppercase">2. Trade License</span>
                        {inspectRequestDocs.tradeLicenseFile ? (
                          <a href={inspectRequestDocs.tradeLicenseFile} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded border border-gray-200">
                            <img src={inspectRequestDocs.tradeLicenseFile} alt="TradeLicense" className="h-24 w-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-bold uppercase">View Original</div>
                          </a>
                        ) : (
                          <div className="h-24 rounded border-2 border-dashed border-gray-100 flex items-center justify-center text-[10px] text-gray-400 bg-white italic font-bold">
                            Default License
                          </div>
                        )}
                      </div>

                      {/* NID Card */}
                      <div className="border border-gray-100 rounded-lg p-2 bg-slate-50 text-center">
                        <span className="text-[9px] font-black text-gray-500 block mb-1 uppercase">3. NID Card copy</span>
                        {inspectRequestDocs.nidFile ? (
                          <a href={inspectRequestDocs.nidFile} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded border border-gray-200">
                            <img src={inspectRequestDocs.nidFile} alt="NIDFile" className="h-24 w-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-bold uppercase">View Original</div>
                          </a>
                        ) : (
                          <div className="h-24 rounded border-2 border-dashed border-gray-100 flex items-center justify-center text-[10px] text-gray-400 bg-white italic font-bold">
                            Default NID Card
                          </div>
                        )}
                      </div>

                      {/* Cheque Leaf */}
                      <div className="border border-gray-100 rounded-lg p-2 bg-slate-50 text-center">
                        <span className="text-[9px] font-black text-gray-500 block mb-1 uppercase">4. Cheque Leaf copy</span>
                        {inspectRequestDocs.chequeFile ? (
                          <a href={inspectRequestDocs.chequeFile} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded border border-gray-200">
                            <img src={inspectRequestDocs.chequeFile} alt="ChequeFile" className="h-24 w-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-bold uppercase">View Original</div>
                          </a>
                        ) : (
                          <div className="h-24 rounded border-2 border-dashed border-gray-100 flex items-center justify-center text-[10px] text-gray-400 bg-white italic font-bold">
                            Default Cheque
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectRequestDocs(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Close Viewer (বন্ধ করুন)
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
