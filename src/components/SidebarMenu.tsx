import React from 'react';
import { X, Sparkles, Shirt, Layers, ShoppingBag } from 'lucide-react';
import { useAppState } from '../AppContext';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ isOpen, onClose }) => {
  const { categories, activeCategory, setActiveCategory } = useAppState();

  if (!isOpen) return null;

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    onClose();
  };

  // Helper icons for categories
  const getCategoryIcon = (category: string) => {
    const norm = category.toLowerCase();
    if (norm.includes('trending')) return <Sparkles className="h-5 w-5" />;
    if (norm.includes('shirt')) return <Shirt className="h-5 w-5" />;
    if (norm.includes('all')) return <Layers className="h-5 w-5" />;
    return <ShoppingBag className="h-5 w-5" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex" id="sidebar-container">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer */}
      <div className="relative flex w-full max-w-xs flex-col bg-white py-4 shadow-xl">
        <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
          <h2 className="font-sans text-xl font-extrabold text-[#1877F2]">CATEGORIES</h2>
          <button
            id="btn-sidebar-close"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Categories List */}
        <div className="mt-4 flex-1 overflow-y-auto px-4 space-y-2">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                id={`btn-category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => handleCategoryClick(category)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-[#1877F2] border-l-4 border-[#1877F2]' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#1877F2]'
                }`}
              >
                <span className={isActive ? 'text-[#1877F2]' : 'text-gray-400 group-hover:text-[#1877F2]'}>
                  {getCategoryIcon(category)}
                </span>
                <span className="capitalize">{category}</span>
              </button>
            );
          })}
        </div>

        {/* Footer info inside sidebar */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Shop premium shirts & t-shirts at <span className="font-bold text-[#1877F2]">YOUNG Style</span>
          </p>
        </div>
      </div>
    </div>
  );
};
