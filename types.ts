export interface ProductComment {
  id: string;
  userName: string;
  rating: number;
  text: string;
  image?: string; // base64 representation of attached image
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  sizes: string[]; // e.g., ['S', 'M', 'L']
  colors: string[]; // list of select colors
  quantity: number; // stock
  sold: number; // number of products sold
  images: string[]; // base64 or urls
  category: string; // 'Shirt' | 'T-Shirt' | custom
  description: string;
  ratings: number[]; // array of ratings, e.g., [5, 4, 5]
  comments?: ProductComment[];
}

export interface Order {
  id: string; // Order number e.g. ORD-1001
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDistrict: string;
  customerAddress: string;
  selectedSize: string;
  selectedColor: string;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    size: string;
    color: string;
    image: string;
  }[];
  paymentMethod: 'cod' | 'bkash' | 'nagad';
  paymentPhone?: string;
  transactionId?: string;
  couponUsed?: string;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  createdAt: string; // ISO String
}

export interface Coupon {
  id: string;
  code: string;
  percentage: number;
  minAmount: number; // minimum order value to apply
}

export interface Subscriber {
  id: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface CourierSettings {
  insideSavarCharge: number;
  outsideSavarCharge: number;
  districtCharges: { [districtName: string]: number };
}

export interface PaymentNumbers {
  bkash: string;
  nagad: string;
  codBkash: string; // bkash number for COD advance delivery charge
  codNagad: string; // nagad number for COD advance delivery charge
}

export interface WebsiteSettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo: string; // base64 or URL
  banners: string[]; // list of banners
  description: string; // homepage paragraph
  discountBannerText?: string;
  showSubscribersToCustomers?: boolean; // Toggle to view subscribers
  bannerBadge?: string;
  bannerTitle?: string;
  bannerDescription?: string;
}

export interface SocialMediaLinks {
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  whatsapp: string;
}

export interface VisitorStats {
  todayCount: number;
  weeklyCount: number;
  monthlyCount: number;
  totalCount: number;
  visitsByRegion: { [regionName: string]: number };
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  isLoggedIn: boolean;
  loginMethod?: 'email' | 'google' | 'phone';
  avatar?: string;
  password?: string;
}
