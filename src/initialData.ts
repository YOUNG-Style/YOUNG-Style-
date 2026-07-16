import { Product, Coupon, Subscriber, WebsiteSettings, SocialMediaLinks, VisitorStats, CourierSettings, PaymentNumbers } from './types';

// Bangladesh 64 Districts
export const BANGLADESH_DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra", "Brahmanbaria",
  "Chandpur", "Chapai Nawabganj", "Chittagong", "Chuadanga", "Comilla", "Cox's Bazar",
  "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj",
  "Habiganj", "Jamalpur", "Jessore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachari",
  "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur",
  "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon",
  "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali",
  "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati",
  "Rangpur", "Satkhira", "Sariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet",
  "Tangail", "Thakurgaon"
];

// Rich list of 100+ standard garment colors with Name and Hex
export const GARMENT_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy Blue', hex: '#000080' },
  { name: 'Royal Blue', hex: '#4169E1' },
  { name: 'Sky Blue', hex: '#87CEEB' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Crimson', hex: '#DC143C' },
  { name: 'Dark Green', hex: '#006400' },
  { name: 'Olive Green', hex: '#556B2F' },
  { name: 'Bottle Green', hex: '#004B23' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Mustard Yellow', hex: '#FFDB58' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Ash', hex: '#B2BEB5' },
  { name: 'Heather Ash', hex: '#D3D3D3' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Peach', hex: '#FFDAB9' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Cream', hex: '#FFFDD0' },
  { name: 'Khaki', hex: '#C3B091' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'Indigo', hex: '#4B0082' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Turquoise', hex: '#40E0D0' },
  { name: 'Cyan', hex: '#00FFFF' },
  { name: 'Magenta', hex: '#FF00FF' },
  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Brown', hex: '#A52A2A' },
  { name: 'Coffee', hex: '#6F4E37' },
  { name: 'Chocolate', hex: '#7B3F00' },
  { name: 'Tan', hex: '#D2B48C' },
  { name: 'Rust', hex: '#B7410E' },
  { name: 'Emerald', hex: '#50C878' },
  { name: 'Forest Green', hex: '#228B22' },
  { name: 'Mint Green', hex: '#98FF98' },
  { name: 'Sage Green', hex: '#BCB88A' },
  { name: 'Coral Pink', hex: '#F88379' },
  { name: 'Hot Pink', hex: '#FF69B4' },
  { name: 'Plum', hex: '#8E4585' },
  { name: 'Violet', hex: '#EE82EE' },
  { name: 'Mauve', hex: '#E0B0FF' },
  { name: 'Periwinkle', hex: '#CCCCFF' },
  { name: 'Bronze', hex: '#CD7F32' },
  { name: 'Copper', hex: '#B87333' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Cobalt', hex: '#0047AB' },
  { name: 'Steel Blue', hex: '#4682B4' },
  { name: 'Slate Gray', hex: '#708090' },
  { name: 'Cadet Blue', hex: '#5F9EA0' },
  { name: 'Denim', hex: '#1560BD' },
  { name: 'Moss Green', hex: '#8A9A5B' },
  { name: 'Seafoam Green', hex: '#9FE2BF' },
  { name: 'Sand', hex: '#C2B280' },
  { name: 'Wheat', hex: '#F5DEB3' },
  { name: 'Mustard', hex: '#E1AD01' },
  { name: 'Amber', hex: '#FFBF00' },
  { name: 'Apricot', hex: '#FBCEB1' },
  { name: 'Tangerine', hex: '#F28500' },
  { name: 'Terracotta', hex: '#E2725B' },
  { name: 'Ochre', hex: '#CC7722' },
  { name: 'Siena', hex: '#882D17' },
  { name: 'Umber', hex: '#635147' },
  { name: 'Mahogany', hex: '#C04000' },
  { name: 'Auburn', hex: '#A17A74' },
  { name: 'Salmon', hex: '#FA8072' },
  { name: 'Rose', hex: '#FF007F' },
  { name: 'Fuchsia', hex: '#FF00FF' },
  { name: 'Orchid', hex: '#DA70D6' },
  { name: 'Lilac', hex: '#C8A2C8' },
  { name: 'Amethyst', hex: '#9966CC' },
  { name: 'Mulberry', hex: '#C54B8C' },
  { name: 'Eggplant', hex: '#614051' },
  { name: 'Raisin', hex: '#242124' },
  { name: 'Onyx', hex: '#353839' },
  { name: 'Obsidian', hex: '#080808' },
  { name: 'Jet Black', hex: '#0A0A0A' },
  { name: 'Ivory', hex: '#FFFFF0' },
  { name: 'Alabaster', hex: '#F2F0EA' },
  { name: 'Pearl', hex: '#EAE0C8' },
  { name: 'Vanilla', hex: '#F3E5AB' },
  { name: 'Butter', hex: '#F3E5AB' },
  { name: 'Lemon', hex: '#FFF700' },
  { name: 'Sunflower', hex: '#FFDA03' },
  { name: 'Chartreuse', hex: '#7FFF00' },
  { name: 'Celadon', hex: '#ACE1AF' },
  { name: 'Khaki Green', hex: '#8A865D' },
  { name: 'Pine Green', hex: '#01796F' },
  { name: 'Teal Blue', hex: '#01889F' },
  { name: 'Ocean Blue', hex: '#2B65EC' },
  { name: 'Cerulean', hex: '#007BA7' },
  { name: 'Lapis Blue', hex: '#26619C' },
  { name: 'Sapphire', hex: '#0F52BA' },
  { name: 'Plum Purple', hex: '#522A4E' },
  { name: 'Wine Red', hex: '#722F37' },
  { name: 'Lilac Pink', hex: '#D896FF' },
  { name: 'Forest Shadow', hex: '#1E352F' },
  { name: 'Ice Blue', hex: '#DFF0FF' },
  { name: 'Pistachio', hex: '#93C572' }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'P-101',
    name: 'Premium Cotton Oxford Shirt',
    price: 1450,
    sizes: ['M', 'L', 'XL'],
    colors: ['White', 'Sky Blue', 'Gray'],
    quantity: 45,
    sold: 12,
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80'],
    category: 'Shirt',
    description: '100% premium cotton Oxford casual shirt. Perfect fit for corporate as well as semi-formal hangouts. Breathable and comfortable material designed for local weather.',
    ratings: [5, 4, 5, 5, 4]
  },
  {
    id: 'P-102',
    name: 'Vintage Stripe Casual Shirt',
    price: 1250,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Navy Blue', 'Black'],
    quantity: 30,
    sold: 5,
    images: ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80'],
    category: 'Shirt',
    description: 'Elegant stripe shirts for teenagers and young adults. Features dual breast pockets and button-down collar.',
    ratings: [4, 5, 4, 4]
  },
  {
    id: 'P-103',
    name: 'Minimalist Youth T-Shirt',
    price: 520,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'White', 'Ash', 'Maroon'],
    quantity: 120,
    sold: 40,
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'],
    category: 'T-Shirt',
    description: 'Premium heavy cotton t-shirt with durable seam stitched collar. Designed to stand out in crowds. Minimalist, tagless design for modern comfort.',
    ratings: [5, 5, 5, 4, 5]
  },
  {
    id: 'P-104',
    name: 'Oversized Streetwear Tee',
    price: 680,
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['Mustard Yellow', 'Charcoal', 'Olive Green'],
    quantity: 60,
    sold: 22,
    images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80'],
    category: 'T-Shirt',
    description: 'Trendy oversized drop-shoulder graphic t-shirt. High-density screen print with comfortable fit. Perfect streetwear vibe for youngsters.',
    ratings: [4, 5, 5, 5, 3]
  },
  {
    id: 'P-105',
    name: 'Premium Mandarin Collar Linen Shirt',
    price: 1550,
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['Beige', 'White', 'Olive Green'],
    quantity: 18,
    sold: 8,
    images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80'],
    category: 'Shirt',
    description: 'Linen blend luxury mandarin collar shirt. Soft pre-washed texture. Elegant option for summer festivities and evening events.',
    ratings: [5, 4, 5]
  },
  {
    id: 'P-106',
    name: 'Retro Acid Wash T-Shirt',
    price: 750,
    sizes: ['M', 'L', 'XL'],
    colors: ['Charcoal', 'Navy Blue', 'Maroon'],
    quantity: 35,
    sold: 14,
    images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80'],
    category: 'T-Shirt',
    description: 'Specially dyed vintage acid washed cotton tee. Highly comfortable textured look. Durable print that survives daily washes easily.',
    ratings: [5, 5, 4, 5]
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  { id: 'C-1', code: 'YOUNG10', percentage: 10, minAmount: 1000 },
  { id: 'C-2', code: 'EID20', percentage: 20, minAmount: 2000 },
  { id: 'C-3', code: 'FREE50', percentage: 50, minAmount: 5000 }
];

export const INITIAL_SUBSCRIBERS: Subscriber[] = [
  { id: 'S-1', email: 'rakibul.hasan@gmail.com', createdAt: '2026-07-01T10:00:00Z' },
  { id: 'S-2', email: 'sharmin.keya@hotmail.com', createdAt: '2026-07-03T14:30:00Z' },
  { id: 'S-3', email: 'taskin_ahmed@yahoo.com', createdAt: '2026-07-05T08:15:00Z' },
  { id: 'S-4', email: 'nusrat.jahan22@gmail.com', createdAt: '2026-07-08T18:20:00Z' }
];

export const INITIAL_SETTINGS: WebsiteSettings = {
  name: 'YOUNG Style',
  email: 'info.youngstyle@gmail.com',
  phone: '+8801712345678',
  address: 'Savar Bazar Road, Savar, Dhaka - 1340',
  logo: '', // Fallback to icon text if empty
  banners: [], // 👈 পুরাতন ৩টি লিংক কেটে এখানে খালি অ্যারে করে দেওয়া হয়েছে
  description: 'Welcome to YOUNG Style. We represent the youth spirit, bringing 100% quality-full premium shirts and t-shirts directly to your doorsteps. Discover your customized sizes, brilliant color ranges, and feel the ultimate fabric comforts crafted strictly for the active and stylish generation.',
  discountBannerText: '🔥 ধামাকা অফার! যেকোনো ৩টি শার্ট অর্ডারে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি! কুপন কোড ব্যবহার করুন: YOUNG10 🔥',
  showSubscribersToCustomers: true,
  bannerBadge: 'New Summer Arrivals',
  bannerTitle: 'YOUNG STYLE CO.',
  bannerDescription: '100% Quality-Full Premium Shirts & T-Shirts for youngsters. Get discounts up to 50% using special coupon codes.'
};


export const INITIAL_SOCIAL_LINKS: SocialMediaLinks = {
  facebook: 'https://facebook.com/youngstyle.official',
  instagram: 'https://instagram.com/youngstyle',
  youtube: 'https://youtube.com/youngstyle.channel',
  tiktok: 'https://tiktok.com/@youngstyle',
  whatsapp: 'https://wa.me/8801712345678'
};

export const INITIAL_COURIER_SETTINGS: CourierSettings = {
  insideSavarCharge: 60,
  outsideSavarCharge: 120,
  districtCharges: {
    'Savar': 60,
    'Dhaka': 60,
    'Chittagong': 130,
    'Sylhet': 130,
    'Khulna': 130,
    'Rajshahi': 130,
    'Rangpur': 140,
    'Barisal': 140,
    'Mymensingh': 120
  }
};

export const INITIAL_PAYMENT_NUMBERS: PaymentNumbers = {
  bkash: '01815905159',
  nagad: '01915905159',
  codBkash: '01815905159',
  codNagad: '01915905159'
};

export const INITIAL_VISITOR_STATS: VisitorStats = {
  todayCount: 0,
  weeklyCount: 0,
  monthlyCount: 0,
  totalCount: 0,
  visitsByRegion: {}
};
