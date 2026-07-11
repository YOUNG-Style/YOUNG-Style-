import React, { useState } from 'react';
import { Star, ShoppingBag, Send } from 'lucide-react';
import { Product } from '../types';
import { useAppState } from '../AppContext';

interface ProductCardProps {
  product: Product;
  onBuyNow: (p: Product, size: string, color: string) => void;
  onViewDetails?: (p: Product) => void;
  onAddToCart?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onBuyNow, onViewDetails, onAddToCart }) => {
  const { updateProduct, setCart } = useAppState();
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || 'Black');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Calculate average rating
  const avgRating = product.ratings && product.ratings.length > 0
    ? (product.ratings.reduce((a, b) => a + b, 0) / product.ratings.length).toFixed(1)
    : '5.0';

  const handleRating = (stars: number) => {
    const updatedRatings = product.ratings ? [...product.ratings, stars] : [stars];
    updateProduct({
      ...product,
      ratings: updatedRatings
    });
    // Visual alert of rating
    alert(`Thank you! You rated this product ${stars} stars.`);
  };

  const handleAddToBag = () => {
    if (product.quantity <= 0) return;
    setCart(prev => {
      // Find if item already exists
      const idx = prev.findIndex(item => 
        item.product.id === product.id && 
        item.size === selectedSize && 
        item.color === selectedColor
      );

      if (idx > -1) {
        const newCart = [...prev];
        // Check stock limit
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

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs hover:shadow-md transition-all duration-300">
      
      {/* Product Image */}
      <div 
        className="relative aspect-square w-full overflow-hidden bg-gray-50 cursor-pointer"
        onClick={() => onViewDetails?.(product)}
      >
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'}
          alt={product.name}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Stock Status Badge */}
        {product.quantity <= 0 ? (
          <span className="absolute top-2 left-2 rounded-md bg-red-500 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
            Stock Out
          </span>
        ) : product.quantity <= 5 ? (
          <span className="absolute top-2 left-2 rounded-md bg-orange-500 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
            Only {product.quantity} Left
          </span>
        ) : (
          <span className="absolute top-2 left-2 rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
            In Stock ({product.quantity})
          </span>
        )}

        {/* Category Badge */}
        <span className="absolute top-2 right-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[9px] font-medium text-white uppercase">
          {product.category}
        </span>
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        
        {/* Rating and Interactive Stars */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = hoveredStar !== null 
                ? star <= hoveredStar 
                : star <= Math.round(Number(avgRating));

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  className="p-0 text-amber-400 transition-transform hover:scale-120 cursor-pointer"
                  title={`Rate ${star} Stars`}
                >
                  <Star 
                    className={`h-3.5 w-3.5 ${filled ? 'fill-current' : 'text-gray-300'}`} 
                  />
                </button>
              );
            })}
          </div>
          <span className="text-[11px] font-bold text-gray-500">
            ({avgRating})
          </span>
        </div>

        {/* Product Name */}
        <h3 
          className="font-sans text-xs sm:text-sm font-bold text-gray-800 line-clamp-2 hover:text-[#1877F2] transition-colors mb-1 min-h-[32px] sm:min-h-[40px] cursor-pointer"
          onClick={() => onViewDetails?.(product)}
        >
          {product.name}
        </h3>

        {/* Product Price */}
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-sm sm:text-base font-black text-[#1877F2]">
            ৳ {product.price}
          </span>
          <span className="text-[10px] text-gray-400 font-medium line-through">
            ৳ {product.oldPrice || Math.round(product.price * 1.25)}
          </span>
        </div>

        {/* Selectors inside Card to make checkout fast & beautiful */}
        <div className="space-y-2 mb-3 mt-auto">
          {/* Size Selector */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Size</label>
            <div className="flex flex-wrap gap-1">
              {product.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-1.5 py-0.5 text-[9px] font-black rounded border transition-all ${
                    selectedSize === size
                      ? 'border-[#1877F2] bg-blue-50 text-[#1877F2]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Color</label>
            <div className="flex flex-wrap gap-1">
              {product.colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border transition-all ${
                    selectedColor === color
                      ? 'border-[#1877F2] bg-blue-50 text-[#1877F2]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description snippet */}
        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-4">
          {product.description}
        </p>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button
            onClick={handleAddToBag}
            disabled={product.quantity <= 0}
            className={`flex items-center justify-center gap-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg border transition-all ${
              product.quantity <= 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'border-[#1877F2] text-[#1877F2] hover:bg-blue-50'
            }`}
          >
            <ShoppingBag className="h-3 w-3" />
            <span>Add Bag</span>
          </button>
          
          <button
            onClick={handleBuyNow}
            disabled={product.quantity <= 0}
            className={`flex items-center justify-center gap-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
              product.quantity <= 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#1877F2] text-white hover:bg-blue-600 shadow-xs'
            }`}
          >
            <Send className="h-3 w-3" />
            <span>Buy Now</span>
          </button>
        </div>

      </div>
    </div>
  );
};
