import { supabase } from "./supabase";

export interface HomepageOffer {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  link_url?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface HomepageFeaturedProduct {
  id: string;
  product_id: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    price: number;
    main_image?: string;
  };
}

export interface HomepageFeaturedStore {
  id: string;
  shop_id: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  shops?: {
    id: string;
    name: string;
    logo_url?: string;
    description?: string;
  };
}

// Fetch active offers for homepage display
export async function getActiveOffers(): Promise<HomepageOffer[]> {
  try {
    const { data, error } = await supabase
      .from("homepage_offers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter offers by date if they have start/end dates
    const now = new Date();
    return (data || []).filter((offer) => {
      if (offer.start_date && new Date(offer.start_date) > now) return false;
      if (offer.end_date && new Date(offer.end_date) < now) return false;
      return true;
    });
  } catch (error) {
    console.error("Error fetching active offers:", error);
    return [];
  }
}

// Fetch featured products for homepage display
export async function getFeaturedProducts(): Promise<HomepageFeaturedProduct[]> {
  try {
    const { data, error } = await supabase
      .from("homepage_featured_products")
      .select(`
        *,
        products:product_id (
          id,
          name,
          price,
          main_image
        )
      `)
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
}

// Fetch featured stores for homepage display
export async function getFeaturedStores(): Promise<HomepageFeaturedStore[]> {
  try {
    const { data, error } = await supabase
      .from("homepage_featured_stores")
      .select(`
        *,
        shops:shop_id (
          id,
          name,
          logo_url,
          description
        )
      `)
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching featured stores:", error);
    return [];
  }
}

// Create a new offer
export async function createOffer(offerData: Omit<HomepageOffer, "id" | "created_at" | "updated_at">): Promise<HomepageOffer | null> {
  try {
    const { data, error } = await supabase
      .from("homepage_offers")
      .insert([offerData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating offer:", error);
    return null;
  }
}

// Update an existing offer
export async function updateOffer(id: string, offerData: Partial<HomepageOffer>): Promise<HomepageOffer | null> {
  try {
    const { data, error } = await supabase
      .from("homepage_offers")
      .update(offerData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating offer:", error);
    return null;
  }
}

// Delete an offer
export async function deleteOffer(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("homepage_offers")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting offer:", error);
    return false;
  }
}

// Add a featured product
export async function addFeaturedProduct(productId: string, position: number = 1): Promise<HomepageFeaturedProduct | null> {
  try {
    // First check if the product is already featured
    const { data: existing } = await supabase
      .from("homepage_featured_products")
      .select("*")
      .eq("product_id", productId)
      .single();

    if (existing) {
      console.log("Product is already featured:", existing);
      return existing;
    }

    const { data, error } = await supabase
      .from("homepage_featured_products")
      .insert([{
        product_id: productId,
        position,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding featured product:", error);
    return null;
  }
}

// Remove a featured product
export async function removeFeaturedProduct(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("homepage_featured_products")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error removing featured product:", error);
    return false;
  }
}

// Add a featured store
export async function addFeaturedStore(shopId: string, position: number = 1): Promise<HomepageFeaturedStore | null> {
  try {
    // First check if the shop is already featured
    const { data: existing } = await supabase
      .from("homepage_featured_stores")
      .select("*")
      .eq("shop_id", shopId)
      .single();

    if (existing) {
      console.log("Shop is already featured:", existing);
      return existing;
    }

    const { data, error } = await supabase
      .from("homepage_featured_stores")
      .insert([{
        shop_id: shopId,
        position,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding featured store:", error);
    return null;
  }
}

// Remove a featured store
export async function removeFeaturedStore(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("homepage_featured_stores")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error removing featured store:", error);
    return false;
  }
}

// Get all homepage content for public display
export async function getHomepageContent() {
  try {
    const [offers, featuredProducts, featuredStores] = await Promise.all([
      getActiveOffers(),
      getFeaturedProducts(),
      getFeaturedStores()
    ]);

    return {
      offers,
      featuredProducts,
      featuredStores
    };
  } catch (error) {
    console.error("Error fetching homepage content:", error);
    return {
      offers: [],
      featuredProducts: [],
      featuredStores: []
    };
  }
} 