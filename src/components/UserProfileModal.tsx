import React, { useState, useEffect } from 'react';
import { X, User, LogIn, Lock, Eye, EyeOff, Clipboard, AlertCircle, CheckCircle, Mail, Phone } from 'lucide-react';
import { useAppState } from '../AppContext';
import { BANGLADESH_DISTRICTS } from '../initialData';
import { 
  auth, 
  googleProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup,
  db,
  doc,
  setDoc,
  getDoc
} from '../firebase';
import { 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'firebase/auth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile, orders } = useAppState();

  // Auth steps: 'login' | 'register' | 'profile'
  const [authView, setAuthView] = useState<'login' | 'register' | 'profile'>(
    currentUser.isLoggedIn ? 'profile' : 'login'
  );

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Profile Edit States
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDistrict, setEditDistrict] = useState('Dhaka');

  // Loading & Error states for Firebase integration
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Password reset inside profile
  const [oldPassword, setOldPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Temp state for uploading profile photo
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);

  // Registration Method: 'email' | 'phone'
  const [regMethod, setRegMethod] = useState<'email' | 'phone'>('email');

  // Resolve login input to proper Firebase email format
  const resolveLoginEmail = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.includes('@')) {
      return trimmed.toLowerCase();
    }
    // Strip non-digits to find the phone number
    const cleanPhone = trimmed.replace(/\D/g, '');
    let finalPhone = cleanPhone;
    if (cleanPhone.startsWith('880') && cleanPhone.length > 10) {
      finalPhone = cleanPhone.substring(3); // e.g. 8801712345678 -> 1712345678
    } else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) {
      finalPhone = cleanPhone.substring(1); // e.g. 01712345678 -> 1712345678
    }
    // Always prefix with 0 to make it consistent 11-digit representation
    if (!finalPhone.startsWith('0')) {
      finalPhone = '0' + finalPhone;
    }
    return `phone_${finalPhone}@youngstyle.com`;
  };

  // Helper to get deterministic user document key for Firestore
  const getUserDocKey = (user: any): string => {
    if (!user || !user.isLoggedIn) return '';
    if (user.loginMethod === 'google') {
      return user.email.toLowerCase();
    }
    if (user.loginMethod === 'phone') {
      const cleanPhone = user.phone.replace(/\D/g, '');
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
    return user.email.toLowerCase();
  };

  // Synchronize edit profile form states whenever currentUser updates
  useEffect(() => {
    if (currentUser.isLoggedIn) {
      setEditName(currentUser.name || '');
      setEditPhone(currentUser.phone || '');
      setEditAddress(currentUser.address || '');
      setEditDistrict(currentUser.district || 'Dhaka');
      setEditEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Handle saving the user details form
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      const userKey = getUserDocKey(currentUser);
      if (!userKey) {
        throw new Error("লগইন সেশন পাওয়া যায়নি। দয়া করে আবার লগইন করুন। (Login session not found. Please log in again.)");
      }

      const avatarToSave = tempAvatar || currentUser.avatar || '';

      // Update in App State immediately so the UI updates instantly
      updateUserProfile({
        name: editName,
        email: editEmail,
        phone: editPhone,
        address: editAddress,
        district: editDistrict,
        avatar: avatarToSave || undefined
      });

      // Clear temp image since it is now saved in state
      setTempAvatar(null);

      // Save details to Firestore in a non-blocking background process
      setDoc(doc(db, 'users', userKey), {
        name: editName,
        email: editEmail,
        phone: editPhone,
        address: editAddress,
        district: editDistrict,
        avatar: avatarToSave
      }, { merge: true }).catch(err => {
        console.warn("Firestore sync warning (continues offline):", err);
      });

      alert('আপনার প্রোফাইল তথ্য সফলভাবে সংরক্ষণ করা হয়েছে! (Profile updated successfully!)');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setAuthError('প্রোফাইল তথ্য সেভ করা যায়নি: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Sync oldPassword with currentUser.password when loaded/changed
  useEffect(() => {
    if (currentUser.isLoggedIn && currentUser.password) {
      setOldPassword(currentUser.password);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  // Track customer order history
  const customerOrders = orders.filter(
    ord => ord.customerEmail.toLowerCase() === currentUser.email.toLowerCase() || 
           ord.customerPhone === currentUser.phone
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('দয়া করে ইমেইল বা মোবাইল নাম্বার এবং পাসওয়ার্ড পূরণ করুন। (Please fill out all fields.)');
      return;
    }
    
    setLoading(true);
    setAuthError(null);
    
    try {
      const firebaseEmail = resolveLoginEmail(email);
      const userCredential = await signInWithEmailAndPassword(auth, firebaseEmail, password);
      const user = userCredential.user;
      
      let nameVal = email.includes('@') ? email.split('@')[0].toUpperCase() : 'Phone User';
      let emailVal = email.includes('@') ? email.toLowerCase() : `${email}@youngstyle.com`;
      let phoneVal = email.includes('@') ? '' : email;
      let addressVal = '';
      let districtVal = '';
      let avatarVal: string | undefined = undefined;
      let loginMethodVal: 'email' | 'phone' | 'google' = email.includes('@') ? 'email' : 'phone';

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseEmail.toLowerCase()));
        if (userDoc.exists()) {
          const data = userDoc.data();
          nameVal = data.name || nameVal;
          emailVal = data.email || emailVal;
          phoneVal = data.phone || phoneVal;
          addressVal = data.address || addressVal;
          districtVal = data.district || districtVal;
          avatarVal = data.avatar || undefined;
          loginMethodVal = data.loginMethod || loginMethodVal;
          
        } else {
          // Backward compatibility: create Firestore doc
          await setDoc(doc(db, 'users', firebaseEmail.toLowerCase()), {
            name: nameVal,
            email: emailVal,
            phone: phoneVal,
            address: addressVal,
            district: districtVal,
            loginMethod: loginMethodVal,
          });
        }
      } catch (dbErr) {
        console.warn("Firestore loading profile warning:", dbErr);
      }

      updateUserProfile({
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        address: addressVal,
        district: districtVal,
        isLoggedIn: true,
        loginMethod: loginMethodVal,
        avatar: avatarVal,
      });
      setAuthView('profile');
    } catch (err: any) {
      console.error(err);
      let errMsg = 'লগইন ব্যর্থ হয়েছে। দয়া করে আপনার সঠিক ইমেইল/মোবাইল এবং পাসওয়ার্ড দিন।';
      if (err.code === 'auth/user-not-found') {
        errMsg = 'এই ইমেইল বা মোবাইল নাম্বারে কোনো অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে রেজিস্ট্রেশন করুন।';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = 'ভুল পাসওয়ার্ড। দয়া করে আবার চেষ্টা করুন।';
      } else if (err.code === 'auth/invalid-credential') {
        errMsg = 'ভুল ইমেইল/মোবাইল অথবা পাসওয়ার্ড। দয়া করে সঠিক তথ্য দিন।';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'ইমেইল বা মোবাইল নাম্বারটি সঠিক নয়।';
      }
      setAuthError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEmail = regMethod === 'email';
    if (isEmail) {
      if (!regName || !regEmail || !regPhone || !regAddress || !regPassword) {
        setAuthError('দয়া করে সব তথ্য পূরণ করুন। (Please fill out all fields.)');
        return;
      }
    } else {
      if (!regName || !regPhone || !regAddress || !regPassword) {
        setAuthError('দয়া করে সব তথ্য পূরণ করুন। (Please fill out all fields.)');
        return;
      }
    }

    setLoading(true);
    setAuthError(null);

    try {
      const firebaseEmail = isEmail ? regEmail : resolveLoginEmail(regPhone);
      alert("REG STEP 1");
      const userCredential = await createUserWithEmailAndPassword(
    auth,
    firebaseEmail,
    regPassword
);

alert("REG STEP 2");

const user = userCredential.user;

alert("REG STEP 3");
      
      const emailValue = isEmail ? regEmail.toLowerCase() : `${regPhone}@youngstyle.com`;

      try {
        const userRef = doc(db, 'users', firebaseEmail.toLowerCase());
        await setDoc(userRef, {
          name: regName,
          email: emailValue,
          phone: regPhone,
          address: regAddress,
          district: 'Dhaka',
          avatar: '',
          loginMethod: isEmail ? 'email' : 'phone',
        });
        
        alert("REG STEP 4");
        
      } catch (dbErr) {
        console.warn("Firestore saving profile warning:", dbErr);
      }

      updateUserProfile({
        name: regName,
        email: emailValue,
        phone: regPhone,
        address: regAddress,
        district: 'Dhaka',
        isLoggedIn: true,
        loginMethod: isEmail ? 'email' : 'phone',
        avatar: undefined,
      });

      alert("REG STEP 5");
      
      setAuthView('profile');
    } catch (err: any) {
      console.error(err);
      let errMsg = 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'এই ইমেইল বা মোবাইল নাম্বারটি ইতিমধ্যে নিবন্ধিত রয়েছে। দয়া করে লগইন করুন।';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'পাসওয়ার্ডটি অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে।';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'ইমেইল বা মোবাইল নাম্বারটি সঠিক নয়।';
      }
      setAuthError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      let nameVal = user.displayName || 'Google User';
      let emailVal = user.email || '';
      let phoneVal = 'Please Update';
      let addressVal = '';
      let districtVal = '';
      let avatarVal = user.photoURL || undefined;

      if (emailVal) {
        try {
          const userDoc = await getDoc(doc(db, 'users', emailVal.toLowerCase()));
          if (userDoc.exists()) {
            const data = userDoc.data();
            nameVal = data.name || nameVal;
            phoneVal = data.phone || phoneVal;
            addressVal = data.address || addressVal;
            districtVal = data.district || districtVal;
            avatarVal = data.avatar || avatarVal;
          } else {
            await setDoc(doc(db, 'users', emailVal.toLowerCase()), {
              name: nameVal,
              email: emailVal,
              phone: phoneVal,
              address: addressVal,
              district: districtVal,
              avatar: avatarVal || '',
              loginMethod: 'google'
            });
          }
        } catch (dbErr) {
          console.warn("Google user profile database sync warning:", dbErr);
        }
      }

      updateUserProfile({
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        address: addressVal,
        district: districtVal,
        isLoggedIn: true,
        loginMethod: 'google',
        avatar: avatarVal
      });
      setAuthView('profile');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setAuthError(
          `গুগল লগইন সম্পন্ন করতে ডোমেইন অথোরাইজেশন প্রয়োজন (auth/unauthorized-domain)।\n\n` +
          `দয়া করে আপনার Firebase কনসোলে নিচের ডোমেইনটি এড করুন:\n` +
          `👉 ${window.location.hostname}\n\n` +
          `সমাধান করার নিয়ম:\n` +
          `১. Firebase Console (https://console.firebase.google.com/) এ যান।\n` +
          `২. Build > Authentication > Settings > Authorized domains ট্যাবে যান।\n` +
          `৩. "Add domain" বাটনে ক্লিক করে "${window.location.hostname}" টাইপ করে সেভ করুন।\n\n` +
          `-----------------------------------------\n` +
          `Firebase Error: (auth/unauthorized-domain).\n` +
          `Please authorize this active domain in your Firebase project settings:\n` +
          `👉 ${window.location.hostname}\n\n` +
          `Steps to authorize:\n` +
          `1. Open Firebase Console.\n` +
          `2. Navigate to Authentication > Settings > Authorized domains.\n` +
          `3. Click "Add domain", enter "${window.location.hostname}", and save.`
        );
      } else {
        setAuthError(`গুগল লগইন সম্পন্ন করা যায়নি বা ব্রাউজারে পপআপ ব্লক রয়েছে। (${err.message || err.code || err})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    const ph = prompt('আপনার ১১ ডিজিটের মোবাইল নাম্বার দিন (e.g. 017XXXXXXXX):');
    if (!ph || ph.length < 11) {
      alert('সঠিক মোবাইল নাম্বার দিন।');
      return;
    }
    const code = prompt('আপনার নাম্বারে পাঠানো ৪ ডিজিটের OTP দিন:');
    if (code && code.trim().length >= 4) {
      const dummyEmail = `phone_${ph}@youngstyle.com`;
      
      try {
        setLoading(true);
        let nameVal = 'Phone User';
        let addressVal = 'Dhaka, Bangladesh';
        let districtVal = 'Dhaka';
        let avatarVal: string | undefined = undefined;

        try {
          const userDoc = await getDoc(doc(db, 'users', dummyEmail));
          if (userDoc.exists()) {
            const data = userDoc.data();
            nameVal = data.name || nameVal;
            addressVal = data.address || addressVal;
            districtVal = data.district || districtVal;
            avatarVal = data.avatar || undefined;
          } else {
            await setDoc(doc(db, 'users', dummyEmail), {
              name: nameVal,
              email: `${ph}@youngstyle.com`,
              phone: ph,
              address: addressVal,
              district: districtVal,
              loginMethod: 'phone'
            });
          }
        } catch (dbErr) {
          console.warn("Phone profile Firestore sync warning:", dbErr);
        }

        updateUserProfile({
          name: nameVal,
          email: `${ph}@youngstyle.com`,
          phone: ph,
          address: addressVal,
          district: districtVal,
          isLoggedIn: true,
          loginMethod: 'phone',
          avatar: avatarVal
        });
        setAuthView('profile');
        alert('সফলভাবে লগইন করা হয়েছে!');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else if (code !== null) {
      alert('ভুল OTP কোড! দয়া করে সঠিক ৪ ডিজিটের কোড দিন।');
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Firebase signout error:', e);
    }
    updateUserProfile({
      name: '',
      email: '',
      phone: '',
      address: '',
      isLoggedIn: false
    });
    setAuthView('login');
    setLoading(false);
    alert('Logged out successfully!');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      alert('দয়া করে আপনার পূর্বের পাসওয়ার্ডটি দিন! (Please enter your old password)');
      return;
    }
    if (!newPassword) {
      alert('দয়া করে আপনার নতুন পাসওয়ার্ডটি দিন! (Please enter your new password)');
      return;
    }
    if (newPassword.length < 6) {
      alert('নতুন পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে। (New password must be at least 6 characters)');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        alert('ইউজার লগইন সেশন পাওয়া যায়নি। দয়া করে আবার লগইন করুন।');
        setLoading(false);
        return;
      }

      // Reauthenticate the user first using their old password
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // Now update the password in Firebase Auth
      await updatePassword(user, newPassword);

      // Also update the password in Firestore!
      try {
        const userRef = doc(db, 'users', user.email.toLowerCase());
        await setDoc(userRef, {
          password: newPassword
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Failed to sync new password to Firestore:", dbErr);
      }

      // Update in local app state
      updateUserProfile({ password: newPassword });

      alert('পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে! পরবর্তী লগইনে এই নতুন পাসওয়ার্ডটি ব্যবহার করুন। (Password updated successfully!)');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      let errMsg = 'পাসওয়ার্ড পরিবর্তন করা যায়নি।';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'ভুল পূর্বের পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন। (Incorrect old password)';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'নতুন পাসওয়ার্ডটি অত্যন্ত দুর্বল। কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।';
      } else {
        errMsg = `ত্রুটি: ${err.message || 'পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে।'}`;
      }
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="user-profile-modal">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl transition-all flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#1877F2]" />
            <h2 className="text-base font-black text-gray-900 uppercase">
              {authView === 'login' ? 'My Account Login' : authView === 'register' ? 'Create Account' : 'My Account Profile'}
            </h2>
          </div>
          <button
            id="btn-profile-close"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold flex items-start gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap flex-1 leading-relaxed">{authError}</span>
            </div>
          )}

          {/* VIEW 1: LOGIN FLOW */}
          {authView === 'login' && (
            <div className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Email or Phone Number (ইমেইল অথবা মোবাইল নাম্বার)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com or 017XXXXXXXX"
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-hidden"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1877F2] text-white text-xs font-black rounded-lg hover:bg-blue-600 transition-all uppercase flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>

              {/* Social Login Alternatives */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest">Or login via</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <span className="font-extrabold text-[#1877F2]">G</span>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handlePhoneLogin}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Phone className="h-3 w-3 text-[#1877F2]" />
                    <span>Phone OTP</span>
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  New to YOUNG Style?{' '}
                  <button 
                    disabled={loading}
                    onClick={() => {
                      setAuthView('register');
                      setAuthError(null);
                    }}
                    className="text-[#1877F2] font-bold hover:underline disabled:opacity-50"
                  >
                    Create an Account
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* VIEW 2: REGISTER FLOW */}
          {authView === 'register' && (
            <div className="space-y-4">
              {/* Method Toggle Buttons */}
              <div className="flex border-b border-gray-100 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegMethod('email');
                    setAuthError(null);
                  }}
                  className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider border-b-2 text-center transition-all ${
                    regMethod === 'email'
                      ? 'border-[#1877F2] text-[#1877F2]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Register with Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegMethod('phone');
                    setAuthError(null);
                  }}
                  className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider border-b-2 text-center transition-all ${
                    regMethod === 'phone'
                      ? 'border-[#1877F2] text-[#1877F2]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Register with Phone
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Full Name (পূর্ণ নাম)</label>
                  <input 
                    type="text" 
                    required
                    disabled={loading}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Imam Hossain"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {regMethod === 'email' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Email Address (ইমেইল)</label>
                      <input 
                        type="email" 
                        required
                        disabled={loading}
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@gmail.com"
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Phone Number (মোবাইল)</label>
                      <input 
                        type="tel" 
                        required
                        disabled={loading}
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Phone Number (মোবাইল নাম্বার)</label>
                    <input 
                      type="tel" 
                      required
                      disabled={loading}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Full Shipping Address (ঠিকানা)</label>
                  <textarea 
                    required
                    disabled={loading}
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Your home address details for auto-fill checkout..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Password (পাসওয়ার্ড)</label>
                  <div className="relative">
                    <input 
                      type={showRegPassword ? 'text' : 'password'} 
                      required
                      disabled={loading}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1877F2] text-white text-xs font-black rounded-lg hover:bg-blue-600 transition-all uppercase flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register and Login</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-gray-500">
                    Already have an account?{' '}
                    <button 
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setAuthView('login');
                        setAuthError(null);
                      }}
                      className="text-[#1877F2] font-bold hover:underline disabled:opacity-50"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </form>

              {/* Social Register Alternatives */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest">Or register via</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <span className="font-extrabold text-[#1877F2]">G</span>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handlePhoneLogin}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Phone className="h-3 w-3 text-[#1877F2]" />
                    <span>Phone OTP</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: PROFILE DASHBOARD & ORDER STATUSES */}
          {authView === 'profile' && (
            <div className="space-y-6">
              
              {/* User Meta Card */}
              <div className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 items-center">
                <div className="shrink-0">
                  {currentUser.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.name || 'User'} 
                      className="h-14 w-14 rounded-full object-cover border-2 border-[#1877F2]/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-14 w-14 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center font-black text-xl uppercase border-2 border-[#1877F2]/20">
                      {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-gray-900 truncate">{currentUser.name || 'Young Style Customer'}</h3>
                  <p className="text-[11px] text-gray-500 truncate">{currentUser.email || 'No email saved'}</p>
                  <p className="text-[11px] text-gray-500">{currentUser.phone || 'No phone saved'}</p>
                  <span className="inline-block mt-1.5 rounded bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-[#1877F2] capitalize">
                    Logged in via {currentUser.loginMethod || 'Email'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold text-red-500 hover:underline shrink-0 self-start"
                >
                  Log Out
                </button>
              </div>

              {/* Profile Image Device Upload & Save Option */}
              <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1">
                    <span>Profile Picture (প্রোফাইল ছবি)</span>
                  </h4>
                  {currentUser.avatar && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const userKey = getUserDocKey(currentUser);
                          
                          // Update locally first
                          updateUserProfile({ avatar: undefined });
                          setTempAvatar(null);

                          // Write to Firestore asynchronously
                          if (userKey) {
                            setDoc(doc(db, 'users', userKey), { avatar: '' }, { merge: true }).catch(err => {
                              console.warn("Firestore remove avatar warning:", err);
                            });
                          }
                          
                          alert('প্রোফাইল পিকচার রিমুভ করা হয়েছে! (Profile picture removed)');
                        } catch (err: any) {
                          console.error("Error removing avatar:", err);
                          alert("প্রোফাইল ছবি রিমুভ করা যায়নি। (Failed to remove profile picture.)");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="text-[10px] font-bold text-red-500 hover:underline disabled:opacity-50"
                    >
                      Remove (বাদ দিন)
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Current Image / Preview */}
                  <div className="h-14 w-14 rounded-full border border-gray-200 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center relative">
                    {tempAvatar ? (
                      <img src={tempAvatar} alt="Upload Preview" className="h-full w-full object-cover" />
                    ) : currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="h-6 w-6 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label 
                      htmlFor="profile-avatar-upload"
                      className="inline-block px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors border border-gray-200"
                    >
                      Choose Image (ছবি সিলেক্ট করুন)
                    </label>
                    <input
                      id="profile-avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={loading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert('ছবিটির সাইজ অনেক বড় (সর্বোচ্চ ১০MB পর্যন্ত গ্রহণযোগ্য)');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setTempAvatar(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <p className="text-[9px] text-gray-400 font-medium">JPEG, PNG format (Max 10MB)</p>
                  </div>

                  {tempAvatar && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const userKey = getUserDocKey(currentUser);
                          
                          // Update locally first so it is instant
                          updateUserProfile({ avatar: tempAvatar });
                          
                          // Save in Firestore asynchronously
                          if (userKey) {
                            setDoc(doc(db, 'users', userKey), { avatar: tempAvatar }, { merge: true }).catch(err => {
                              console.warn("Firestore save avatar warning:", err);
                            });
                          }
                          
                          setTempAvatar(null);
                          alert('প্রোফাইল পিকচার সফলভাবে সেভ করা হয়েছে! (Profile picture saved successfully)');
                        } catch (err: any) {
                          console.error("Error saving avatar:", err);
                          alert("প্রোফাইল ছবি সেভ করা যায়নি। (Failed to save profile picture.)");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg shadow-sm transition-all uppercase disabled:bg-emerald-400"
                    >
                      Save (সেভ)
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Details Form (ব্যক্তিগত তথ্য পরিবর্তন ও সংরক্ষণ) */}
              <form onSubmit={handleSaveProfile} className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#1877F2]" />
                  <span>Personal Details (ব্যক্তিগত তথ্য)</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Full Name (পূর্ণ নাম)</label>
                    <input 
                      type="text"
                      required
                      disabled={loading}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="আপনার নাম"
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1877F2] disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Email Address (ইমেইল)</label>
                      <input 
                        type="email"
                        required
                        disabled={loading || currentUser.loginMethod === 'google'}
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1877F2] disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Mobile (মোবাইল)</label>
                      <input 
                        type="text"
                        required
                        disabled={loading}
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1877F2] disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">District / City (জেলা)</label>
                      <select
                        disabled={loading}
                        value={editDistrict}
                        onChange={(e) => setEditDistrict(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1877F2] bg-white font-semibold disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {BANGLADESH_DISTRICTS.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Full Address (পূর্ণ ঠিকানা)</label>
                      <input 
                        type="text"
                        required
                        disabled={loading}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="বাসা নং, রোড নং, এলাকা"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1877F2] disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-black rounded-lg transition-all uppercase flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <span>Save Profile (প্রোফাইল সংরক্ষণ করুন)</span>
                  )}
                </button>
              </form>

              {/* Order Tracking System */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                  <Clipboard className="h-4 w-4 text-[#1877F2]" />
                  <span>My Orders & Verification (অর্ডার ট্র্যাকিং)</span>
                </h3>

                {customerOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500 font-bold">You haven't ordered any shirts yet!</p>
                    <p className="text-[10px] text-gray-400">Order from checkout to track updates here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {customerOrders.map(ord => (
                      <div key={ord.id} className="p-3 rounded-lg border border-gray-100 bg-white shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-gray-800">{ord.id}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{new Date(ord.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="text-[11px] text-gray-600">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-0.5">
                              <span className="truncate max-w-[200px]">{item.productName} ({item.size}/{item.color})</span>
                              <span className="font-bold shrink-0">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                          <div>
                            <span className="text-gray-400 font-medium">Total: </span>
                            <span className="font-bold text-[#1877F2]">৳{ord.totalAmount}</span>
                          </div>
                          
                          {/* Order Status Badge */}
                          <div className="flex items-center gap-1.5">
                            {ord.status === 'Pending' && (
                              <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                <span>Pending</span>
                              </span>
                            )}
                            {ord.status === 'Confirmed' && (
                              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <CheckCircle className="h-3 w-3" />
                                <span>Confirmed</span>
                              </span>
                            )}
                            {ord.status === 'Rejected' && (
                              <span className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <X className="h-3 w-3" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Password update form inside profile */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 border-b border-gray-100 pb-1.5">Update Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Old Password (পূর্বের পাসওয়ার্ড)</label>
                    <div className="relative">
                      <input 
                        type={showOldPassword ? 'text' : 'password'}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password to re-authenticate"
                        className="w-full pl-3 pr-10 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">New Password (নতুন পাসওয়ার্ড)</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new secure password"
                        className="w-full pl-3 pr-10 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors uppercase"
                  >
                    {loading ? 'Updating...' : 'Save Password (সেভ করুন)'}
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
