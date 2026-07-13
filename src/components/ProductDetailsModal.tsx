import React, { useState, useEffect, useRef } from 'react';
import { X, Star, ShoppingBag, Send, Upload, Image as ImageIcon, MessageSquare, AlertCircle, Check, ArrowRight, Sparkles } from 'lucide-react';
import { Product, ProductComment } from '../types';
import { useAppState } from '../AppContext';

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: (p: Product, size: string, color: string) => void;
  onOpenProductDetails: (p: Product) => void;
  onAddToCart?: () => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  onBuyNow,
  onOpenProductDetails,
  onAddToCart
}) => {
  const { products, updateProduct, currentUser, setCart } = useAppState();

  // Selected Options
  const [selectedSize, setSelectedSize] = useState(product && product.sizes && product.sizes.length > 0 ? product.sizes[0] : '');
  const [selectedColor, setSelectedColor] = useState(product ? (product.colors[0] || 'Black') : 'Black');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // New Comment Form States
  const [commentText, setCommentText] = useState('');
  const [commentName, setCommentName] = useState('');
  const [selectedStars, setSelectedStars] = useState(5);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll details panel to top when product changes
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }, 20);

    // Reset selectors for the new product
    if (product) {
      setSelectedSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : '');
      setSelectedColor(product.colors[0] || 'Black');
    }
    setActiveImageIdx(0);
    setCommentText('');
    setAttachedImage(null);
    setSelectedStars(5);

    return () => clearTimeout(timer);
  }, [product]);

  if (!product || !isOpen) return null;

  // Calculate Average Rating
  const avgRating = product.ratings && product.ratings.length > 0
    ? (product.ratings.reduce((a, b) => a + b, 0) / product.ratings.length).toFixed(1)
    : '5.0';

  // Handle image attachment selection
  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Comment/Review
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      alert('অনুগ্রহ করে আপনার মন্তব্যটি লিখুন!');
      return;
    }

    const defaultName = currentUser.isLoggedIn 
      ? currentUser.name 
      : (commentName.trim() || 'সাধারন ক্রেতা');

    const newComment: ProductComment = {
      id: `comment-${Date.now()}`,
      userName: defaultName,
      rating: selectedStars,
      text: commentText.trim(),
      image: attachedImage || undefined,
      createdAt: new Date().toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    const updatedComments = product.comments ? [newComment, ...product.comments] : [newComment];
    const updatedRatings = product.ratings ? [...product.ratings, selectedStars] : [selectedStars];

    updateProduct({
      ...product,
      comments: updatedComments,
      ratings: updatedRatings
    });

    // Reset Form
    setCommentText('');
    setCommentName('');
    setAttachedImage(null);
    setSelectedStars(5);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    alert('ধন্যবাদ! আপনার মূল্যবান রিভিউটি যুক্ত করা হয়েছে।');
  };

  // Add item to shopping bag
  const handleAddToBag = () => {
    if (product.quantity <= 0) return;
    setCart(prev => {
      const idx = prev.findIndex(item => 
        item.product.id === product.id && 
        item.size === selectedSize && 
        item.color === selectedColor
      );

      if (idx > -1) {
        const newCart = [...prev];
        if (newCart[idx].quantity < product.quantity) {
          newCart[idx].quantity += 1;
          alert('Added another one to your bag!');
        } else {
          alert('Cannot add more. Reached maximum available stock!');
        }
        return newCart;
      } else {
        alert('Added to your bag!');
        return [...prev, { product, quantity: 1, size: selectedSize, color: selectedColor }];
      }
    });
    if (onAddToCart) {
      onAddToCart();
    }
  };

  const handleBuyNow = () => {
    if (product.quantity <= 0) return;
    onBuyNow(product, selectedSize, selectedColor);
  };

  // Get other products in same category (case-insensitive & trimmed)
  const relatedProducts = products.filter(p => 
    p.category.toLowerCase().trim() === product.category.toLowerCase().trim() && 
    p.id !== product.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs transition-opacity duration-300">
      <div 
        ref={scrollContainerRef}
        className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-y-auto"
      >
        
        {/* Header containing Close button */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#1877F2] uppercase tracking-widest block">
              PRODUCT SHOWCASE
            </span>
            <span className="text-xs font-bold text-gray-500 truncate max-w-xs block">
              {product.name}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-800 transition-colors"
            title="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 space-y-8">
          
          {/* Section 1: Product detail overview (Images on left, details on right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left Col (Images gallery) - Span 5 */}
            <div className="md:col-span-5 space-y-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-xs">
                <img 
                  src={product.images[activeImageIdx] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'} 
                  alt={product.name}
                  className="h-full w-full object-cover object-top transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
                
                {/* Stock Badge */}
                {product.quantity <= 0 ? (
                  <span className="absolute top-3 left-3 rounded-md bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                    Stock Out
                  </span>
                ) : product.quantity <= 5 ? (
                  <span className="absolute top-3 left-3 rounded-md bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                    Only {product.quantity} Left
                  </span>
                ) : (
                  <span className="absolute top-3 left-3 rounded-md bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                    In Stock ({product.quantity})
                  </span>
                )}

                <span className="absolute top-3 right-3 rounded-md bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[9px] font-medium text-white uppercase">
                  {product.category}
                </span>
              </div>

              {/* Slidable thumbnails of multiple product images */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative h-14 w-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIdx === idx 
                          ? 'border-[#1877F2] scale-95 shadow-sm' 
                          : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt="" 
                        className="h-full w-full object-cover object-top" 
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col (Options & Information) - Span 7 */}
            <div className="md:col-span-7 space-y-5">
              <div>
                <h1 className="text-lg sm:text-xl font-sans font-black text-gray-900 leading-tight">
                  {product.name}
                </h1>
                
                <div className="flex items-center gap-2 mt-2">
                  {/* Reviews rating */}
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`h-3.5 w-3.5 ${s <= Math.round(Number(avgRating)) ? 'fill-current' : 'text-gray-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    {avgRating} ({product.ratings?.length || 1} Ratings)
                  </span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {product.sold} Sold
                  </span>
                </div>
              </div>

              {/* Price section */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 border border-gray-100">
                <div>
                  <span className="text-xs text-gray-400 font-bold block">বর্তমান অফার মূল্য (Current Offer Price)</span>
                  <span className="text-2xl font-black text-[#1877F2]">৳ {product.price}</span>
                </div>
                {product.oldPrice && (
                  <div className="border-l border-gray-200 pl-4">
                    <span className="text-xs text-gray-400 font-bold block line-through">আগের মূল্য</span>
                    <span className="text-sm font-semibold text-gray-400 line-through">৳ {product.oldPrice}</span>
                  </div>
                )}
              </div>

              {/* Size & Color choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Size choice */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Select Size (সাইজ নির্বাচন করুন)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all ${
                            selectedSize === size
                              ? 'border-[#1877F2] bg-blue-50 text-[#1877F2] shadow-xs'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color choice */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Select Color (রং নির্বাচন করুন)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          selectedColor === color
                            ? 'border-[#1877F2] bg-blue-50 text-[#1877F2] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Product description paragraph */}
              <div className="space-y-1 pt-1 border-t border-gray-100">
                <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Product Details (পণ্য বিবরণ)</span>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  {product.description}
                </p>
              </div>

              {/* Action checkout buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <button
                  onClick={handleAddToBag}
                  disabled={product.quantity <= 0}
                  className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-black rounded-xl border transition-all ${
                    product.quantity <= 0
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'border-[#1877F2] text-[#1877F2] hover:bg-blue-50'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>কার্ট এ যোগ করুন (ADD TO BAG)</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={product.quantity <= 0}
                  className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-black rounded-xl transition-all ${
                    product.quantity <= 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[#1877F2] text-white hover:bg-blue-600 shadow-sm'
                  }`}
                >
                  <Send className="h-4 w-4" />
                  <span>সরাসরি অর্ডার করুন (BUY NOW)</span>
                </button>
              </div>

            </div>

          </div>

          {/* Section 2: Interactive Comment & Review Form */}
          <div className="border-t border-gray-100 pt-8 space-y-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#1877F2]" />
              <h3 className="text-sm font-black uppercase text-gray-900 tracking-tight">
                Customer Reviews & Comments (গ্রাহক মতামত ও ছবি সহ রিভিউ)
              </h3>
            </div>

            {/* Comment adding form */}
            <form onSubmit={handleAddComment} className="bg-slate-50 border border-gray-100 rounded-2xl p-4 sm:p-5 space-y-4">
              
              {/* Star review picker row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">আপনার রেটিং দিন:</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const filled = hoveredStar !== null 
                        ? star <= hoveredStar 
                        : star <= selectedStars;

                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedStars(star)}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(null)}
                          className="p-1 text-amber-400 transition-transform hover:scale-120"
                          title={`${star} Stars`}
                        >
                          <Star 
                            className={`h-5 w-5 ${filled ? 'fill-current' : 'text-gray-200'}`} 
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!currentUser.isLoggedIn && (
                  <div className="w-full sm:w-60">
                    <input 
                      type="text"
                      placeholder="আপনার নাম (ঐচ্ছিক)"
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      className="w-full bg-white px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
                    />
                  </div>
                )}
              </div>

              {/* Text input area */}
              <div className="relative">
                <textarea
                  rows={3}
                  required
                  placeholder="এই পণ্যটি সম্পর্কে আপনার মতামত লিখুন (যেমন: কাপড়ের মান, সাইজ ফিটিং কেমন হয়েছে)..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-white p-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1877F2] resize-none"
                />
              </div>

              {/* Upload image and submit row */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3">
                  <input 
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUploadChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 text-[#1877F2] text-xs font-bold rounded-lg border border-gray-200 shadow-2xs transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>ছবি সংযুক্ত করুন (Attach Photo)</span>
                  </button>

                  {attachedImage && (
                    <div className="relative h-10 w-10 border border-gray-200 rounded-md overflow-hidden bg-white">
                      <img src={attachedImage} alt="preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedImage(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-[8px] font-black hover:bg-black/80 uppercase"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-black rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Send className="h-3 w-3" />
                  <span>মন্তব্য পোস্ট করুন</span>
                </button>
              </div>

            </form>

            {/* List of comments render */}
            <div className="space-y-4 pt-2">
              {!product.comments || product.comments.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-gray-100">
                  <p className="text-gray-400 text-xs font-semibold">এই পণ্যটিতে এখনো কোনো রিভিউ দেয়া হয়নি। প্রথম রিভিউটি দিন!</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {product.comments.map((comm) => (
                    <div key={comm.id} className="bg-white border border-gray-100 rounded-xl p-4 space-y-2 shadow-2xs">
                      
                      {/* Name, Stars, Date */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-gray-800 text-xs block">{comm.userName}</span>
                          <div className="flex text-amber-400 mt-1">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <Star 
                                key={num} 
                                className={`h-3 w-3 ${num <= comm.rating ? 'fill-current' : 'text-gray-200'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold">{comm.createdAt}</span>
                      </div>

                      {/* Comment text content */}
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        {comm.text}
                      </p>

                      {/* Attached image if any */}
                      {comm.image && (
                        <div className="pt-2 max-w-sm">
                          <img 
                            src={comm.image} 
                            alt="Customer attached review" 
                            className="max-h-48 rounded-lg object-contain bg-slate-50 border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(comm.image, '_blank')}
                          />
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Section 3: Related Category Products List (oi categories baki product gulo) */}
          <div className="border-t border-gray-100 pt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-gray-900 tracking-tight">
                Related Category Products (এই ক্যাটাগরির অন্যান্য পণ্য)
              </h3>
              <span className="text-[10px] font-black text-[#1877F2] uppercase tracking-wider">
                Category: {product.category}
              </span>
            </div>

            {relatedProducts.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium bg-slate-50 rounded-xl p-4 text-center border border-dashed">
                এই ক্যাটাগরির অন্য কোনো পণ্য আপাতত স্টক এ নেই।
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedProducts.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => onOpenProductDetails(p)}
                    className="group border border-gray-100 rounded-xl bg-white p-2.5 shadow-2xs hover:shadow-xs transition-all duration-300 cursor-pointer"
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-50 mb-2">
                      <img 
                        src={p.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'} 
                        alt={p.name} 
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h4 className="text-[11px] font-bold text-gray-800 line-clamp-2 min-h-[32px] group-hover:text-[#1877F2] transition-colors leading-tight">
                      {p.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-black text-[#1877F2]">৳ {p.price}</span>
                      <span className="text-[9px] text-gray-400 line-through">৳ {p.oldPrice || Math.round(p.price * 1.25)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
