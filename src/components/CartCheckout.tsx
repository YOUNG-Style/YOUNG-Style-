import React, { useState, useEffect } from 'react';
import { X, Trash2, Tag, Truck, CreditCard, ShoppingBag, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAppState } from '../AppContext';
import { BANGLADESH_DISTRICTS } from '../initialData';
import { Product } from '../types';

interface CartCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  directProductCheckout?: { product: Product; size: string; color: string } | null;
  onClearDirectCheckout?: () => void;
}

export const CartCheckout: React.FC<CartCheckoutProps> = ({ 
  isOpen, 
  onClose, 
  directProductCheckout,
  onClearDirectCheckout
}) => {
  const { 
    cart, 
    setCart, 
    coupons, 
    courierSettings, 
    paymentNumbers, 
    addOrder, 
    currentUser,
    updateUserProfile
  } = useAppState();

  // Get a unique list of all available districts (combining BANGLADESH_DISTRICTS and any custom keys in courierSettings.districtCharges)
  const availableDistricts = Array.from(new Set([
    ...BANGLADESH_DISTRICTS,
    ...Object.keys(courierSettings?.districtCharges || {})
  ])).sort();

  // Step 1: 'cart' (Review items) | Step 2: 'checkout' (Add details & pay) | Step 3: 'success'
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  
  // Checkout Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [isInsideSavar, setIsInsideSavar] = useState(false);
  const [fullAddress, setFullAddress] = useState('');
  
  // Checkout Sizes/Colors if direct checkout
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Black');

  // Payment Fields
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [customerPaymentPhone, setCustomerPaymentPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percentage: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Newly placed order summary
  const [placedOrderId, setPlacedOrderId] = useState('');

  // Pre-fill user profile details if logged in
  useEffect(() => {
    if (currentUser.isLoggedIn) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setFullAddress(currentUser.address || '');
      if (currentUser.district && availableDistricts.includes(currentUser.district)) {
        setDistrict(currentUser.district);
      }
    }
  }, [currentUser]);

  // Set checkout mode details on direct checkout mount
  useEffect(() => {
    if (directProductCheckout) {
      setSelectedSize(directProductCheckout.size);
      setSelectedColor(directProductCheckout.color);
      setStep('cart'); // Go to cart review first so they see the item
    }
  }, [directProductCheckout]);

  if (!isOpen) return null;

  // Decide current active items to buy
  const activeItems = directProductCheckout 
    ? [{ 
        product: directProductCheckout.product, 
        quantity: 1, 
        size: selectedSize, 
        color: selectedColor 
      }]
    : cart;

  // Helpers to update size and color of products being ordered
  const handleUpdateItemSize = (index: number, size: string) => {
    if (directProductCheckout) {
      setSelectedSize(size);
    } else {
      setCart(prev => prev.map((item, i) => i === index ? { ...item, size } : item));
    }
  };

  const handleUpdateItemColor = (index: number, color: string) => {
    if (directProductCheckout) {
      setSelectedColor(color);
    } else {
      setCart(prev => prev.map((item, i) => i === index ? { ...item, color } : item));
    }
  };

  // Subtotal Calculation
  const subtotal = activeItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  // Delivery charge calculation
  const getDeliveryCharge = () => {
    if (isInsideSavar) {
      return courierSettings.insideSavarCharge;
    }
    // Check if custom district charge exists, else use outsideSavarCharge
    return courierSettings.districtCharges[district] !== undefined
      ? courierSettings.districtCharges[district]
      : courierSettings.outsideSavarCharge;
  };

  const deliveryCharge = getDeliveryCharge();

  // Coupon discount calculation
  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    const found = coupons.find(c => c.code.toLowerCase() === appliedCoupon.code.toLowerCase());
    if (!found) return 0;
    if (subtotal < found.minAmount) return 0; // double check threshold
    return Math.round((subtotal * found.percentage) / 100);
  };

  const discountAmount = getDiscountAmount();
  const totalAmount = paymentMethod === 'cod'
    ? (subtotal - discountAmount)
    : (subtotal + deliveryCharge - discountAmount);

  // Handlers
  const handleRemoveItem = (index: number) => {
    if (directProductCheckout) {
      if (onClearDirectCheckout) onClearDirectCheckout();
      onClose();
    } else {
      setCart(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (directProductCheckout) return; // direct checkout quantity is 1
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCart(prev => prev.map((item, i) => {
      if (i === index) {
        // limit to stock quantity
        const qty = Math.min(newQty, item.product.quantity);
        return { ...item, quantity: qty };
      }
      return item;
    }));
  };

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    const coupon = coupons.find(c => c.code.toUpperCase() === code);
    if (!coupon) {
      setCouponError('Invalid coupon code!');
      setAppliedCoupon(null);
      return;
    }

    if (subtotal < coupon.minAmount) {
      setCouponError(`Minimum purchase value of ৳${coupon.minAmount} is required for this coupon!`);
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon({ code: coupon.code, percentage: coupon.percentage });
    setCouponError('');
    alert(`Success! ${coupon.percentage}% discount applied.`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone || !fullAddress || !email) {
      alert('Please fill out all required fields!');
      return;
    }

    // Validate payment numbers for mobile banking
    if (paymentMethod !== 'cod' && (!customerPaymentPhone || !transactionId)) {
      alert('Please enter your sending phone number and Transaction ID!');
      return;
    }

    // Construct products structure for orders
    const itemsData = activeItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      image: item.product.images[0] || ''
    }));

    // Create the order via AppContext
    const placedOrder = addOrder({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerDistrict: district,
      customerAddress: `${fullAddress}${isInsideSavar ? ' (Inside Savar)' : ''}`,
      selectedSize: activeItems[0]?.size || 'M',
      selectedColor: activeItems[0]?.color || 'Black',
      paymentMethod,
      paymentPhone: customerPaymentPhone || undefined,
      transactionId: transactionId || undefined,
      couponUsed: appliedCoupon?.code || undefined,
      discountAmount,
      deliveryCharge,
      totalAmount,
      items: itemsData
    });

    // Save/update user profile with their address details if they wanted
    if (currentUser.isLoggedIn) {
      updateUserProfile({
        name,
        phone,
        address: fullAddress,
        district
      });
    }

    setPlacedOrderId(placedOrder.id);
    
    // Clear shopping cart if not direct checkout
    if (!directProductCheckout) {
      setCart([]);
    } else {
      if (onClearDirectCheckout) onClearDirectCheckout();
    }

    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" id="cart-drawer-container">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Cart Container */}
      <div className="relative flex w-full max-w-lg flex-col bg-white shadow-2xl h-full">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#1877F2]" />
            <h2 className="text-lg font-black text-gray-900 uppercase">
              {step === 'cart' ? 'Your Shopping Bag' : step === 'checkout' ? 'Shipping & Payment' : 'Order Success'}
            </h2>
          </div>
          <button
            id="btn-cart-close"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: CART ITEMS REVIEW */}
          {step === 'cart' && (
            <div className="space-y-6">
              {activeItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ShoppingBag className="h-16 w-16 text-gray-300 mb-4 animate-bounce" />
                  <p className="text-gray-500 font-medium mb-1">Your bag is empty!</p>
                  <p className="text-xs text-gray-400 mb-6">Choose premium products from YOUNG Style catalog.</p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-[#1877F2] text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Cart List */}
                  <div className="space-y-4">
                    {activeItems.map((item, index) => (
                      <div key={index} className="flex gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name} 
                          className="h-20 w-20 rounded-md object-cover object-top"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 flex flex-col">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-800 line-clamp-1">{item.product.name}</h4>
                          <p className="text-[10px] text-gray-500 font-semibold mt-1">
                            Size: <span className="text-[#1877F2]">{item.size}</span> | Color: <span className="text-[#1877F2]">{item.color}</span>
                          </p>
                          <div className="flex items-center justify-between mt-auto">
                            {/* Quantity Adjuster */}
                            {!directProductCheckout ? (
                              <div className="flex items-center border border-gray-200 rounded-md bg-white">
                                <button 
                                  onClick={() => handleUpdateQty(index, item.quantity - 1)}
                                  className="px-2 py-1 text-xs font-black text-gray-500 hover:text-[#1877F2]"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-bold text-gray-800">{item.quantity}</span>
                                <button 
                                  onClick={() => handleUpdateQty(index, item.quantity + 1)}
                                  className="px-2 py-1 text-xs font-black text-gray-500 hover:text-[#1877F2]"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 font-semibold">Qty: 1</span>
                            )}

                            {/* Price and Remove */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs sm:text-sm font-black text-[#1877F2]">
                                ৳ {item.product.price * item.quantity}
                              </span>
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Block */}
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex justify-between text-sm font-semibold text-gray-600">
                      <span>Subtotal</span>
                      <span>৳ {subtotal}</span>
                    </div>
                    
                    {/* Next step button */}
                    <button
                      onClick={() => setStep('checkout')}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#1877F2] text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all shadow-md mt-6 uppercase"
                    >
                      <span>Proceed to Checkout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: SHIPPING DETAILS & PAYMENT FORM */}
          {step === 'checkout' && (
            <form onSubmit={handleConfirmOrder} className="space-y-6">
              
              {/* Product Configurations: Size and Color Selector */}
              <div className="space-y-4 bg-blue-50/40 p-4 rounded-xl border border-blue-100/50">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span className="text-base">👕</span>
                  <span>পোশাকের সাইজ ও কালার সিলেক্ট করুন (Select Size & Color)</span>
                </h3>
                
                <div className="space-y-4">
                  {activeItems.map((item, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg border border-gray-100 space-y-3">
                      <div className="flex gap-3">
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name} 
                          className="h-12 w-12 rounded-md object-cover object-top border border-gray-100"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{item.product.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">Unit Price: ৳{item.product.price}</p>
                        </div>
                      </div>

                      {/* Color Options */}
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 block mb-1.5">কালার সিলেক্ট করুন (Available Colors):</span>
                        <div className="flex flex-wrap gap-2">
                          {item.product.colors.map(color => {
                            const isSelected = item.color === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleUpdateItemColor(index, color)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'border-[#1877F2] bg-blue-50 text-[#1877F2] ring-2 ring-blue-400/20 shadow-xs' 
                                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <span 
                                  className="inline-block w-3 h-3 rounded-full border border-gray-300" 
                                  style={{ backgroundColor: color.toLowerCase() }} 
                                />
                                <span>{color}</span>
                                {isSelected && <span className="text-[10px] text-[#1877F2]">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Size Options */}
                      {item.product.sizes && item.product.sizes.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 block mb-1.5">সাইজ সিলেক্ট করুন (Available Sizes):</span>
                          <div className="flex flex-wrap gap-2">
                            {item.product.sizes.map(size => {
                              const isSelected = item.size === size;
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => handleUpdateItemSize(index, size)}
                                  className={`px-4 py-1.5 rounded-lg border text-[11px] font-black transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'border-[#1877F2] bg-[#1877F2] text-white shadow-xs scale-105' 
                                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Details section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">1. Customer Information</h3>
                
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Your Full Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Phone Number <span className="text-red-500">*</span></label>
                    <input 
                      type="tel" 
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Email Address <span className="text-red-500">*</span></label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. customer@gmail.com"
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Select District <span className="text-red-500">*</span></label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] bg-white font-semibold"
                    >
                      {availableDistricts.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center pt-5 sm:pl-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isInsideSavar}
                        onChange={(e) => setIsInsideSavar(e.target.checked)}
                        className="rounded text-[#1877F2] focus:ring-[#1877F2]"
                      />
                      <span className="text-[11px] font-bold text-gray-700">Inside Savar (সাভারের ভিতরে)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Full Delivery Address <span className="text-red-500">*</span></label>
                  <textarea 
                    required
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="House, Road, Area details..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
                  />
                </div>
              </div>

              {/* Coupons section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">2. Coupon Code</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code (e.g. YOUNG10)"
                    disabled={!!appliedCoupon}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg uppercase"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-3 py-2 text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Tag className="h-3 w-3" />
                      <span>Apply</span>
                    </button>
                  )}
                </div>
                {couponError && <p className="text-[11px] font-semibold text-red-500">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-[11px] font-bold text-emerald-600">
                    Coupon applied! You got {appliedCoupon.percentage}% discount on products.
                  </p>
                )}
              </div>

              {/* Payment Select section */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">3. Payment Method</h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {/* COD */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cod');
                      setCustomerPaymentPhone('');
                      setTransactionId('');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-[#1877F2] bg-blue-50/50 text-[#1877F2]'
                        : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Truck className="h-5 w-5 mb-1" />
                    <span className="text-[10px] sm:text-xs font-black">Cash On Delivery</span>
                  </button>

                  {/* bKash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bkash')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                      paymentMethod === 'bkash'
                        ? 'border-pink-500 bg-pink-50/50 text-pink-600'
                        : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-1" />
                    <span className="text-[10px] sm:text-xs font-black">bKash (বিকাশ)</span>
                  </button>

                  {/* Nagad */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('nagad')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                      paymentMethod === 'nagad'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-600'
                        : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-1" />
                    <span className="text-[10px] sm:text-xs font-black">Nagad (নগদ)</span>
                  </button>
                </div>

                {/* Conditional Notice Messages based on Method selected */}
                {paymentMethod === 'cod' && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800 space-y-2 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 mt-0.5 text-blue-600 shrink-0" />
                      <div>
                        {/* Custom required Bengali prompt as requested! */}
                        <p className="font-bold text-red-600 mb-1 leading-normal">
                          ক্যাশ অন ডেলিভারিতে (Cash on Delivery) অর্ডার করলে আপনাকে প্রথমে কুরিয়ার সার্ভিস চার্জ অগ্রিম দিতে হবে।
                        </p>
                        <p className="text-[11px] text-gray-700 leading-normal">
                          দয়া করে নিচের বিকাশ অথবা নগদ নাম্বারে কুরিয়ার সার্ভিস চার্জ <strong>৳{deliveryCharge}</strong> পাঠিয়ে দিন। তারপর আপনার ট্রানজেকশন আইডি এবং মোবাইল নাম্বারটি নিচে বসিয়ে দিন।
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-blue-100 grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white rounded p-1.5 border border-blue-100">
                        <span className="block text-[10px] font-bold text-pink-600 uppercase">Bkash Cashout</span>
                        <span className="text-xs font-black text-gray-900">{paymentNumbers.codBkash}</span>
                      </div>
                      <div className="bg-white rounded p-1.5 border border-blue-100">
                        <span className="block text-[10px] font-bold text-orange-600 uppercase">Nagad Cashout</span>
                        <span className="text-xs font-black text-gray-900">{paymentNumbers.codNagad}</span>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'bkash' && (
                  <div className="rounded-lg bg-pink-50 border border-pink-200 p-3 text-xs text-pink-900 space-y-2 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 mt-0.5 text-pink-600 shrink-0" />
                      <div>
                        <p className="font-bold mb-1 text-pink-700">বিকাশ পেমেন্ট ইন্সট্রাকশন</p>
                        <p className="text-[11px] text-gray-700 leading-normal">
                          আমাদের বিকাশ পার্সোনাল নাম্বারে মোট <strong>৳{totalAmount}</strong> টাকা "Send Money" করুন। টাকা পাঠানোর পর আপনার মোবাইল নাম্বার এবং বিকাশ ট্রানজেকশন আইডিটি নিচে ইনপুট দিন।
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-2 text-center border border-pink-200">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Send Money to</span>
                      <span className="text-sm font-black text-pink-600 tracking-wider">{paymentNumbers.bkash}</span>
                    </div>
                  </div>
                )}

                {paymentMethod === 'nagad' && (
                  <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-900 space-y-2 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 mt-0.5 text-orange-600 shrink-0" />
                      <div>
                        <p className="font-bold mb-1 text-orange-700">নগদ পেমেন্ট ইন্সট্রাকশন</p>
                        <p className="text-[11px] text-gray-700 leading-normal">
                          আমাদের নগদ পার্সোনাল নাম্বারে মোট <strong>৳{totalAmount}</strong> টাকা "Send Money" করুন। টাকা পাঠানোর পর আপনার মোবাইল নাম্বার এবং নগদ ট্রানজেকশন আইডিটি নিচে ইনপুট দিন।
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-2 text-center border border-orange-200">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Send Money to</span>
                      <span className="text-sm font-black text-orange-600 tracking-wider">{paymentNumbers.nagad}</span>
                    </div>
                  </div>
                )}

                {/* Payment Input Fields for All Methods */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 animate-fade-in">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">
                      {paymentMethod === 'cod' ? 'Your Bkash/Nagad No. (অগ্রিম পাঠানোর নাম্বার)' : 'Your Payment Phone No.'} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel" 
                      required
                      value={customerPaymentPhone}
                      onChange={(e) => setCustomerPaymentPhone(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">
                      Transaction ID (ট্রানজেকশন আইডি) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. TRx9372KD9"
                      className="w-full bg-white px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-hidden uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Price Calculation Summary Block */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-1.5 mb-2">Order Price Summary</h4>
                
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Product Subtotal (প্রোডাক্টের মূল্য)</span>
                  <span>৳ {subtotal}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-xs text-emerald-600 font-medium">
                    <span>Coupon Discount ({appliedCoupon.percentage}%)</span>
                    <span>- ৳ {discountAmount}</span>
                  </div>
                )}

                {paymentMethod !== 'cod' && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3 text-gray-400" />
                      <span>Courier Service Charge</span>
                    </span>
                    <span>৳ {deliveryCharge}</span>
                  </div>
                )}

                {paymentMethod === 'cod' ? (
                  <div className="flex justify-between text-xs text-blue-700 font-extrabold border-t border-dashed border-gray-200 pt-1.5 mt-1.5">
                    <span>Due on Delivery (ডেলিভারিতে পরিশোধযোগ্য - প্রোডাক্টের দাম)</span>
                    <span>৳ {subtotal - discountAmount}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs text-[#1877F2] font-bold border-t border-dashed border-gray-200 pt-1.5 mt-1.5">
                    <span>Paid Total (Bkash/Nagad Full Advance)</span>
                    <span>৳ {totalAmount}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-2 mt-2">
                  <span>Total Order Value (সর্বমোট মূল্য)</span>
                  <span className="text-gray-900 font-black text-blue-600">৳ {totalAmount}</span>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors uppercase"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#1877F2] text-white text-xs font-extrabold rounded-lg hover:bg-blue-600 transition-all shadow-md uppercase tracking-wider"
                >
                  Confirm Order (অর্ডার নিশ্চিত করুন)
                </button>
              </div>

            </form>
          )}

          {/* STEP 3: ORDER SUCCESS STATEMENT */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border-2 border-emerald-300 animate-pulse">
                <ShieldCheck className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-gray-900 uppercase">Order Confirmed Successfully!</h3>
                <p className="text-xs font-bold text-[#1877F2]">Order ID: {placedOrderId}</p>
                <p className="text-xs text-gray-500 leading-relaxed px-4">
                  আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। অর্ডার ভেরিফিকেশনের পর আপনার ইমেইলে <strong>{email}</strong> কনফার্মেশন পাঠানো হবে এবং আগামী ২-৫ দিনের ভিতর আপনার ঠিকানায় ডেলিভারি পৌঁছে দেওয়া হবে।
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-left border border-gray-100 w-full space-y-1.5 text-xs text-gray-600">
                <p><strong>Recipient Name:</strong> {name}</p>
                <p><strong>Phone Number:</strong> {phone}</p>
                <p><strong>District:</strong> {district}</p>
                <p><strong>Delivery Address:</strong> {fullAddress}</p>
                <p><strong>Payment Method:</strong> {paymentMethod.toUpperCase()}</p>
                <p><strong>Total Paid Amount:</strong> ৳{totalAmount}</p>
              </div>

              <button
                onClick={() => {
                  setStep('cart');
                  onClose();
                }}
                className="px-8 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-lg transition-colors uppercase tracking-wider"
              >
                Close and Keep Shopping
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
