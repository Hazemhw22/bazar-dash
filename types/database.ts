
// نوع المستخدم الأساسي من Supabase Auth
export type User = {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
  app_metadata?: {
    provider?: string;
    [key: string]: any;
  };
  user_metadata?: {
    [key: string]: any;
  };
  aud?: string;
};

// نوع الملف الشخصي المرتبط بالمستخدم
export type Profile = {
  id: string; // يرتبط بـ auth.users.id
  full_name: string | null;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  address?: string | null;
};

// أدوار المستخدمين
export enum UserRole {
  ADMIN = "admin",
  CUSTOMER = "customer",
  VENDOR = "vendor",
  STAFF = "staff",
}

// نوع ساعات العمل
export type WorkingHours = {
  day: string;
  open_time: string;
  close_time: string;
  is_open: boolean;
};

// نوع المتجر
export type Shop = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  email: string;
  phone_number?: string | null;
  address?: string | null;
  logo_url?: string | null;
  background_image_url?: string | null;
  is_active: boolean;
  working_hours?: WorkingHours[] | null;
  timezone?: string | null;
  delivery_time_from: number;
  delivery_time_to: number;
  created_at: string;
  updated_at: string;
};

// نوع المنتج
export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_price?: number | null;
  stock_quantity: number;
  category_id: string;
  shop_id: string;
  main_image?: string | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  specifications?: Record<string, any> | null;
  properties?: { title: string; options: string[] }[] | null;
};

// نوع الفئة
export type Category = {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
};

// نوع العنوان
export type Address = {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone_number: string;
};

// نوع الطلب
export type Order = {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address: Address;
  billing_address: Address;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  tracking_number?: string | null;
  notes?: string | null;
};

// نوع عنصر الطلب
export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  product_image?: string | null;
};

// حالة الطلب
export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  RETURNED = "returned",
}

// حالة الدفع
export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

// طريقة الدفع
export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  PAYPAL = "paypal",
  BANK_TRANSFER = "bank_transfer",
  CASH_ON_DELIVERY = "cash_on_delivery",
}

// نوع المراجعة
export type Review = {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

// نوع السلة
export type Cart = {
  id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
};

// نوع عنصر السلة
export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
};

// نوع قائمة الرغبات
export type Wishlist = {
  id: string;
  customer_id: string;
  product_id: string;
  added_at: string;
};

// نوع الإشعارات
export type Notification = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
};

// نوع الكوبونات
export type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  usage_limit: number;
  usage_count: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

// واجهات Database للاستخدام مع Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      shops: {
        Row: Shop;
        Insert: Omit<Shop, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Shop, "id" | "created_at" | "updated_at">>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Category, "id" | "created_at" | "updated_at">>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id" | "created_at" | "updated_at">>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Order, "id" | "created_at" | "updated_at">>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id">;
        Update: Partial<Omit<OrderItem, "id">>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Review, "id" | "created_at" | "updated_at">>;
      };
      carts: {
        Row: Cart;
        Insert: Omit<Cart, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Cart, "id" | "created_at" | "updated_at">>;
      };
      cart_items: {
        Row: CartItem;
        Insert: Omit<CartItem, "id" | "added_at">;
        Update: Partial<Omit<CartItem, "id" | "added_at">>;
      };
      wishlists: {
        Row: Wishlist;
        Insert: Omit<Wishlist, "id" | "added_at">;
        Update: Partial<Omit<Wishlist, "id" | "added_at">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at">;
        Update: Partial<Omit<Notification, "id" | "created_at">>;
      };
      coupons: {
        Row: Coupon;
        Insert: Omit<
          Coupon,
          "id" | "created_at" | "updated_at" | "usage_count"
        >;
        Update: Partial<Omit<Coupon, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}

// نوع استجابة Supabase
export type SupabaseResponse<T> = {
  data: T | null;
  error: Error | null;
};

// أنواع مساعدة للإدراج والتحديث
export type ShopInsert = Database["public"]["Tables"]["shops"]["Insert"];
export type ShopUpdate = Database["public"]["Tables"]["shops"]["Update"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
export type CategoryInsert =
  Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate =
  Database["public"]["Tables"]["categories"]["Update"];
