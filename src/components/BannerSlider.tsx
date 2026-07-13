import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppState } from '../AppContext';

export const BannerSlider: React.FC = () => {
  const { settings } = useAppState();
  const [currentIndex, setCurrentIndex] = useState(0);

  const banners = settings.banners && settings.banners.length > 0 
    ? settings.banners 
    : ['gradient_placeholder'];

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 3000); // 3 seconds interval as requested!

    return () => clearInterval(interval);
  }, [banners.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '380px' }} id="banner-slider">
      {/* Slides */}
      <div 
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <div key={index} className="relative h-full w-full shrink-0">
            {banner === 'gradient_placeholder' ? (
              <div className="h-full w-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950" />
            ) : (
              <img 
                src={banner} 
                alt={`Promotional Banner ${index + 1}`} 
                className="h-full w-full object-cover brightness-[0.7]" 
                referrerPolicy="no-referrer"
              />
            )}
            {/* Overlay Copy */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-20 text-white bg-linear-to-r from-black/50 via-transparent to-transparent">
              <span className="text-xs font-bold tracking-widest text-[#1877F2] uppercase bg-white/90 px-3 py-1 rounded-full w-max mb-3">
                {settings.bannerBadge || 'Exclusive Apparel'}
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md mb-2">
                {settings.bannerTitle || settings.name || 'Our Premium Store'}
              </h2>
              <p className="text-sm sm:text-lg max-w-md font-medium text-gray-200 drop-shadow-sm leading-relaxed mb-6">
                {settings.bannerDescription || 'Welcome to our premium fashion store! Customize all products, banners, and store information in the Admin Panel.'}
              </p>
              <button 
                onClick={() => {
                  const el = document.getElementById('product-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-max px-6 py-2.5 bg-[#1877F2] text-white hover:bg-blue-600 font-bold rounded-lg shadow-md transition-all uppercase text-xs tracking-wider"
              >
                Shop Collection
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/40 p-2 text-white hover:bg-white/70 hover:text-black transition-all focus:outline-hidden"
            aria-label="Previous Banner"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/40 p-2 text-white hover:bg-white/70 hover:text-black transition-all focus:outline-hidden"
            aria-label="Next Banner"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                currentIndex === index ? 'w-6 bg-[#1877F2]' : 'bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
