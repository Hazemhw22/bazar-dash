"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Plus, Edit, Trash2, Store, Package, Tag, TrendingUp, Star, Car, Diamond } from "lucide-react";
import { safeCreateNotification, NotificationTemplates } from "@/lib/notifications";
import { UserRole } from "@/types/database";
import { Shield } from "lucide-react";

// Types
interface Offer {
  id: string;
  title: string;
  description?: string | null;
  homepage_offer_products?: { product_id: string; products: any }[];
};

interface ShopPreview {
  id: string;
  name: string;
  logo_url?: string;
  description?: string | null;
};

export default function HomepageControlPage() {
  // State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [shops, setShops] = useState<ShopPreview[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("offers");
  
  // Offer creation and editing
  const [offerForm, setOfferForm] = useState({ title: "" });
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  
  // Add products to offer
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [addProductsDialogOpen, setAddProductsDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  
  // Featured stores management
  const [featuredStores, setFeaturedStores] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [addStoresDialogOpen, setAddStoresDialogOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Tab configuration
  const tabs = [
    {
      id: 'offers',
      label: 'Special Offers',
      icon: TrendingUp,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    {
      id: 'featured_products',
      label: 'Featured Products',
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    {
      id: 'featured_stores',
      label: 'Featured Stores',
      icon: Store,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
  ];

  const currentTab = tabs.find((tab) => tab.id === activeTab);

  // Fetch data
  async function fetchAll() {
    setLoading(true);
    try {
      // Test simple offers query first
      console.log("Testing simple offers query...");
      const { data: simpleOffersData, error: simpleOffersError } = await supabase
        .from("homepage_offers")
        .select("*");
      
      console.log("Simple offers result:", { data: simpleOffersData, error: simpleOffersError });
      
      if (simpleOffersError) {
        console.error("Simple offers error:", JSON.stringify(simpleOffersError, null, 2));
        toast({
          title: "Error",
          description: "Failed to fetch offers (RLS or table issue)",
          variant: "destructive",
        });
        return;
      }
      
      // If simple query works, try the complex query
      console.log("Testing complex offers query...");
      const { data: offersData, error: offersError } = await supabase
        .from("homepage_offers")
        .select("id, title, homepage_offer_products(product_id, products:product_id(id, name, price, main_image, shop_id, shops:shop_id(id, name, logo_url)))")
        .order("created_at", { ascending: false });
      
      if (offersError) {
        console.error("Complex offers error:", JSON.stringify(offersError, null, 2));
        toast({
          title: "Error",
          description: "Failed to fetch offers with joins",
          variant: "destructive",
        });
      } else {
        console.log("Complex offers data:", offersData);
      }

      // Products with shop info
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, price, main_image, shop_id, shops:shop_id(id, name, logo_url)")
        .order("name");
      
      if (productsError) {
        console.error("Error fetching products:", productsError);
      }

      // Shops
      const { data: shopsData, error: shopsError } = await supabase
        .from("shops")
        .select("id, name, logo_url, description")
        .order("name");
      
      if (shopsError) {
        console.error("Error fetching shops:", shopsError);
      }

      // Featured stores
      const { data: featuredStoresData, error: featuredStoresError } = await supabase
        .from("homepage_featured_stores")
        .select("id, shop_id, position, is_active, shops:shop_id(id, name, logo_url, description)")
        .eq("is_active", true)
        .order("position", { ascending: true });
      
      if (featuredStoresError) {
        console.error("Error fetching featured stores:", JSON.stringify(featuredStoresError, null, 2));
        // If table doesn't exist, just set empty array
        if (featuredStoresError.code === 'PGRST116') {
          console.log("Featured stores table doesn't exist yet");
        }
      }

      // Process offers data
      const processedOffers = (offersData || []).map((offer: any) => ({
        ...offer,
        homepage_offer_products: (offer.homepage_offer_products || []).map((p: any) => ({
          ...p,
          products: Array.isArray(p.products) ? p.products[0] : p.products
        }))
      }));

      // Process products data
      const processedProducts = (productsData || []).map((p: any) => ({ 
        ...p, 
        shops: Array.isArray(p.shops) ? p.shops[0] : p.shops 
      }));

      // Process featured stores data
      const processedFeaturedStores = (featuredStoresData || []).map((fs: any) => ({
        ...fs,
        shops: Array.isArray(fs.shops) ? fs.shops[0] : fs.shops
      }));

      setOffers(processedOffers);
      setProducts(processedProducts);
      setShops(shopsData || []);
      setFeaturedStores(processedFeaturedStores);
    } catch (error) {
      console.error("Error in fetchAll:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Fetch user role
  async function fetchUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        setCurrentUserRole(profile?.role || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setRoleLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    fetchUserRole();
  }, []);

  // Offer management functions
  async function handleCreateOffer() {
    try {
      if (!offerForm.title.trim()) {
        toast({
          title: "Error",
          description: "Offer title is required",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("homepage_offers")
        .insert([{ title: offerForm.title.trim() }])
        .select()
        .single();

      if (error) throw error;

      // Create notification
      await safeCreateNotification(NotificationTemplates.offerCreated(offerForm.title.trim()));

      toast({
        title: "Success",
        description: "Offer created successfully",
      });

      setOfferForm({ title: "" });
      setOfferDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error("Error creating offer:", error);
      toast({
        title: "Error",
        description: "Failed to create offer",
        variant: "destructive",
      });
    }
  }

  async function handleUpdateOffer() {
    try {
      if (!editingOffer || !offerForm.title.trim()) {
        toast({
          title: "Error",
          description: "Offer title is required",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("homepage_offers")
        .update({ title: offerForm.title.trim() })
        .eq("id", editingOffer.id);

      if (error) throw error;

      // Create notification
      await safeCreateNotification(NotificationTemplates.offerUpdated(offerForm.title.trim()));

      toast({
        title: "Success",
        description: "Offer updated successfully",
      });

      setEditingOffer(null);
      setOfferForm({ title: "" });
      fetchAll();
    } catch (error) {
      console.error("Error updating offer:", error);
      toast({
        title: "Error",
        description: "Failed to update offer",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteOffer(offerId: string) {
    try {
      const { error } = await supabase
        .from("homepage_offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;

      // Create notification
      await safeCreateNotification(NotificationTemplates.offerDeleted("Unknown Offer"));

      toast({
        title: "Success",
        description: "Offer deleted successfully",
      });
      
      fetchAll();
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast({
        title: "Error",
        description: "Failed to delete offer",
        variant: "destructive",
      });
    }
  }

  // Featured stores management functions
  async function handleRemoveFeaturedStore(featuredStoreId: string) {
    try {
      const { error } = await supabase
        .from("homepage_featured_stores")
        .delete()
        .eq("id", featuredStoreId);

      if (error) {
        console.error("Error removing featured store:", error);
        toast({ 
          title: "Error", 
          description: "Failed to remove store from featured stores", 
          variant: "destructive" 
        });
        return;
      }

      // Create notification
      const storeName = featuredStores.find(fs => fs.id === featuredStoreId)?.shops?.name || "Unknown Store"
      await safeCreateNotification(NotificationTemplates.featuredStoreRemoved(storeName))

      toast({
        title: "Success",
        description: "Store removed from featured stores",
      });
      
      fetchAll();
    } catch (error) {
      console.error("Error removing featured store:", error);
      toast({ 
        title: "Error", 
        description: "Failed to remove store from featured stores", 
        variant: "destructive" 
      });
    }
  }

  async function handleSaveFeaturedStores() {
    try {
      console.log("Saving featured stores:", selectedStores);
      
      // First check if the table exists and we have access
      const { data: testData, error: testError } = await supabase
        .from("homepage_featured_stores")
        .select("id")
        .limit(1);
      
      if (testError) {
        console.error("Error accessing homepage_featured_stores table:", JSON.stringify(testError, null, 2));
        toast({
          title: "Error",
          description: "Cannot access featured stores table. Please check database setup.",
          variant: "destructive",
        });
        return;
      }

      // Remove all existing featured stores
      const { error: deleteError } = await supabase
        .from("homepage_featured_stores")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

      if (deleteError) {
        console.error("Error removing existing featured stores:", JSON.stringify(deleteError, null, 2));
        toast({
          title: "Error",
          description: "Failed to remove existing featured stores",
          variant: "destructive",
        });
        return;
      }

      // Add new selected stores
      if (selectedStores.length > 0) {
        const storesToAdd = selectedStores.map((storeId, index) => ({
          shop_id: storeId,
          position: index + 1,
          is_active: true
        }));

        const { error: insertError } = await supabase
          .from("homepage_featured_stores")
          .insert(storesToAdd);

        if (insertError) {
          console.error("Error adding new featured stores:", JSON.stringify(insertError, null, 2));
          toast({
            title: "Error",
            description: "Failed to add new featured stores",
            variant: "destructive",
          });
          return;
        }
      }

      // Create notification for added stores
      if (selectedStores.length > 0) {
        const addedStores = shops.filter(shop => selectedStores.includes(shop.id))
        for (const store of addedStores) {
          await safeCreateNotification(NotificationTemplates.featuredStoreAdded(store.name))
        }
      }

      toast({
        title: "Success",
        description: "Featured stores updated successfully",
      });

      setAddStoresDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error("Error saving featured stores:", error);
      toast({
        title: "Error",
        description: "Failed to save featured stores",
        variant: "destructive",
      });
    }
  }

  if (loading || roleLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Check if user has permission to edit
  const canEdit = currentUserRole === "admin";

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Homepage Control</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage homepage content including offers, featured products, and featured stores</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 sm:mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 rtl:space-x-reverse overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1 sm:gap-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
                    ${
                      isActive
                        ? `border-primary text-primary ${tab.color}`
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? tab.color : ''}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {currentTab && (
        <div className="space-y-4 sm:space-y-6">
          {/* Offers Tab */}
          {activeTab === 'offers' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Add Offer Section */}
              <div className={`panel ${currentTab.bgColor} ${currentTab.borderColor} border-2`}>
                <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <Plus className={`w-5 h-5 sm:w-6 sm:h-6 ${currentTab.color}`} />
                  <h5 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Add New Offer
                  </h5>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="offer-title" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                      Offer Title
                    </Label>
                    <Input
                      id="offer-title"
                      placeholder="Enter offer title..."
                      value={offerForm.title}
                      onChange={(e) => setOfferForm({ title: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <Button
                    onClick={handleCreateOffer}
                    disabled={!offerForm.title.trim() || !canEdit}
                    className={`text-white px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto ${currentTab.color.replace('text-', 'bg-')} hover:opacity-90 disabled:opacity-50`}
                  >
                    Add Offer
                  </Button>
                </div>
              </div>

              {/* Offers List */}
              <div className="panel">
                <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 ${currentTab.color}`} />
                  <h5 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Special Offers ({offers.length})
                  </h5>
                </div>

                {offers.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <TrendingUp className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 ${currentTab.color} opacity-50`} />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">No offers available</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">Create your first special offer to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {offers.map((offer) => (
                      <div
                        key={offer.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow p-4 sm:p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                          <div className="flex-1">
                            <h6 className="font-bold text-gray-900 dark:text-white mb-2 text-base sm:text-lg">{offer.title}</h6>
                            {offer.description && (
                              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{offer.description}</p>
                            )}
                            {offer.homepage_offer_products && offer.homepage_offer_products.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">Products in this offer:</p>
                                <div className="flex flex-wrap gap-2">
                                  {offer.homepage_offer_products.map((p: any, index: number) => (
                                    <span key={index} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm">
                                      {p.products?.main_image && (
                                        <img 
                                          src={p.products.main_image} 
                                          alt={p.products.name} 
                                          className="w-3 h-3 rounded" 
                                        />
                                      )}
                                      <span>{p.products?.name}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-2 self-end sm:self-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingOffer(offer);
                                  setOfferForm({ title: offer.title });
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteOffer(offer.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Featured Products Tab */}
          {activeTab === 'featured_products' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Add Product Section */}
              <div className={`panel ${currentTab.bgColor} ${currentTab.borderColor} border-2`}>
                <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <Plus className={`w-5 h-5 sm:w-6 sm:h-6 ${currentTab.color}`} />
                  <h5 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Add Featured Product
                  </h5>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="product-search" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                      Search Products
                    </Label>
                    <Input
                      id="product-search"
                      placeholder="Search by product name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => setAddProductsDialogOpen(true)}
                    disabled={!canEdit}
                    className={`text-white px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto ${currentTab.color.replace('text-', 'bg-')} hover:opacity-90 disabled:opacity-50`}
                  >
                    Manage Products
                  </Button>
                </div>
              </div>

              {/* Featured Products Grid */}
              <div className="panel">
                <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <Star className={`w-5 h-5 sm:w-6 sm:h-6 ${currentTab.color}`} />
                  <h5 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Featured Products ({products.filter(p => p.is_featured).length})
                  </h5>
                </div>

                {products.filter(p => p.is_featured).length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Star className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 ${currentTab.color} opacity-50`} />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">No featured products</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">Add products to showcase them on the homepage</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {products.filter(p => p.is_featured).map((product) => (
                                              <div
                          key={product.id}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                        >
                          {/* Product Image */}
                          <div className="relative h-32 sm:h-40 md:h-48">
                            <img
                              src={product.main_image || '/assets/images/img-placeholder-fallback.webp'}
                              alt={product.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '/assets/images/img-placeholder-fallback.webp';
                              }}
                            />
                          </div>
                          {/* Product Details */}
                          <div className="p-3 sm:p-4">
                            <h6 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm sm:text-base">{product.name}</h6>
                            <div className="space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex justify-between">
                                <span>Price:</span>
                                <span className="font-bold text-primary">${product.price}</span>
                              </div>
                              {product.shops && (
                                <div className="flex justify-between">
                                  <span>Store:</span>
                                  <span className="font-medium">{product.shops.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Featured Stores Tab */}
          {activeTab === 'featured_stores' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Add Store Section */}
              <div className={`panel ${currentTab.bgColor} ${currentTab.borderColor} border-2`}>
                <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <Plus className={`w-5 h-5 sm:w-6 sm:h-6 ${currentTab.color}`} />
                  <h5 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Manage Featured Stores
                  </h5>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="store-search" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                      Search Stores
                    </Label>
                    <Input
                      id="store-search"
                      placeholder="Search by store name..."
                      value={storeSearch}
                      onChange={(e) => setStoreSearch(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => setAddStoresDialogOpen(true)}
                    disabled={!canEdit}
                    className={`text-white px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto ${currentTab.color.replace('text-', 'bg-')} hover:opacity-90 disabled:opacity-50`}
                  >
                    Manage Stores
                  </Button>
                </div>
              </div>

              {/* Featured Stores Grid */}
              <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                  <Store className={`w-6 h-6 ${currentTab.color}`} />
                  <h5 className="text-xl font-bold text-gray-900 dark:text-white">
                    Featured Stores ({featuredStores.length})
                  </h5>
                </div>

                {featuredStores.length === 0 ? (
                  <div className="text-center py-12">
                    <Store className={`w-16 h-16 mx-auto mb-4 ${currentTab.color} opacity-50`} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No featured stores</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Add stores to showcase them on the homepage</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {featuredStores.map((featuredStore, index) => (
                      <div
                        key={featuredStore.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                      >
                        {/* Store Image */}
                        <div className="relative h-48">
                          <img
                            src={featuredStore.shops?.logo_url || '/assets/images/img-placeholder-fallback.webp'}
                            alt={featuredStore.shops?.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/assets/images/img-placeholder-fallback.webp';
                            }}
                          />
                          <div className="absolute top-2 left-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                              #{index + 1}
                            </span>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => handleRemoveFeaturedStore(featuredStore.id)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                              title="Remove store"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {/* Store Details */}
                        <div className="p-4">
                          <h6 className="font-bold text-gray-900 dark:text-white mb-2">{featuredStore.shops?.name}</h6>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex justify-between">
                              <span>Position:</span>
                              <span className="font-medium">#{featuredStore.position}</span>
                            </div>
                            {featuredStore.shops?.description && (
                              <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
                                {featuredStore.shops.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Offer Dialog */}
      <Dialog open={!!editingOffer} onOpenChange={() => setEditingOffer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-offer-title">Offer Title</Label>
              <Input
                id="edit-offer-title"
                value={offerForm.title}
                onChange={(e) => setOfferForm({ title: e.target.value })}
                placeholder="Enter offer title..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingOffer(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateOffer}>
                Update Offer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Products to Offer Dialog */}
      <Dialog open={addProductsDialogOpen} onOpenChange={setAddProductsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Products to Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="product-search">Search Products</Label>
              <Input
                id="product-search"
                placeholder="Search by product name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-3">
                {products
                  .filter(product => 
                    product.name.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  .map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {product.main_image && (
                          <img 
                            src={product.main_image} 
                            alt={product.name} 
                            className="w-12 h-12 rounded object-cover" 
                          />
                        )}
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">${product.price}</div>
                          {product.shops && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              {product.shops.logo_url && (
                                <img 
                                  src={product.shops.logo_url} 
                                  alt={product.shops.name} 
                                  className="w-3 h-3 rounded" 
                                />
                              )}
                              <span>{product.shops.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => setSelectedProducts(prev => 
                          prev.includes(product.id) 
                            ? prev.filter(id => id !== product.id) 
                            : [...prev, product.id]
                        )}
                        className="ml-2"
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Stores to Featured Dialog */}
      <Dialog open={addStoresDialogOpen} onOpenChange={setAddStoresDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Featured Stores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="store-search">Search Stores</Label>
              <Input
                id="store-search"
                placeholder="Search by store name..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-3">
                {shops
                  .filter(shop => 
                    shop.name.toLowerCase().includes(storeSearch.toLowerCase())
                  )
                  .map((shop) => (
                    <div key={shop.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {shop.logo_url && (
                          <img 
                            src={shop.logo_url} 
                            alt={shop.name} 
                            className="w-12 h-12 rounded object-cover" 
                          />
                        )}
                        <div>
                          <div className="font-medium">{shop.name}</div>
                          {shop.description && (
                            <div className="text-sm text-gray-500">{shop.description}</div>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedStores.includes(shop.id)}
                        onChange={() => setSelectedStores(prev => 
                          prev.includes(shop.id) 
                            ? prev.filter(id => id !== shop.id) 
                            : [...prev, shop.id]
                        )}
                        className="ml-2"
                      />
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddStoresDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFeaturedStores}>
                Save Featured Stores
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 