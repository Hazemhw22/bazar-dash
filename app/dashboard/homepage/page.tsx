"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Plus, Edit, Trash2, Store, Package, Tag } from "lucide-react";
import { safeCreateNotification, NotificationTemplates } from "@/lib/notifications";
import { UserRole } from "@/types/database";
import { Shield } from "lucide-react";

// Types
interface Offer {
  id: string;
  title: string;
  homepage_offer_products?: { product_id: string; products: any }[];
}
type ShopPreview = {
  id: string;
  name: string;
  logo_url?: string | null;
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
      
      console.log("Processed offers:", processedOffers);
      console.log("Processed products:", processedProducts);
      console.log("Featured stores:", processedFeaturedStores);
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
  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const checkCurrentUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          if (profile?.role) {
            setCurrentUserRole(profile.role);
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      } finally {
        setRoleLoading(false);
      }
    };
    checkCurrentUserRole();
  }, []);

  // Create offer
  async function handleCreateOffer() {
    if (!offerForm.title.trim()) {
      toast({ 
        title: "Error", 
        description: "Offer name required", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("homepage_offers")
        .insert([{ title: offerForm.title }])
        .select();

      if (error) {
        console.error("Error creating offer:", error);
        toast({ 
          title: "Error", 
          description: "Failed to create offer", 
          variant: "destructive" 
        });
        return;
      }

      console.log("Created offer:", data);
      
      // Create notification
      await safeCreateNotification(NotificationTemplates.offerCreated(offerForm.title))

      toast({
        title: "Success",
        description: "Offer created successfully",
      });
      
      setOfferDialogOpen(false);
      setOfferForm({ title: "" });
      fetchAll();
    } catch (error) {
      console.error("Error creating offer:", error);
      toast({ 
        title: "Error", 
        description: "Failed to create offer", 
        variant: "destructive" 
      });
    }
  }

  // Edit offer
  function openEditOfferDialog(offer: Offer) {
    setEditingOffer(offer);
    setOfferForm({ title: offer.title });
    setOfferDialogOpen(true);
  }

  async function handleUpdateOffer() {
    if (!editingOffer || !offerForm.title.trim()) {
      toast({ 
        title: "Error", 
        description: "Offer name required", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("homepage_offers")
        .update({ title: offerForm.title })
        .eq("id", editingOffer.id);

      if (error) {
        console.error("Error updating offer:", error);
        toast({ 
          title: "Error", 
          description: "Failed to update offer", 
          variant: "destructive" 
        });
        return;
      }

      // Create notification
      await safeCreateNotification(NotificationTemplates.offerUpdated(offerForm.title))

      toast({
        title: "Success",
        description: "Offer updated successfully",
      });
      
      setOfferDialogOpen(false);
      setOfferForm({ title: "" });
      setEditingOffer(null);
      fetchAll();
    } catch (error) {
      console.error("Error updating offer:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update offer", 
        variant: "destructive" 
      });
    }
  }

  // Delete offer
  async function handleDeleteOffer(offerId: string) {
    if (!confirm("Are you sure you want to delete this offer? This will also remove all associated products.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("homepage_offers")
        .delete()
        .eq("id", offerId);

      if (error) {
        console.error("Error deleting offer:", error);
        toast({ 
          title: "Error", 
          description: "Failed to delete offer", 
          variant: "destructive" 
        });
        return;
      }

      // Create notification
      await safeCreateNotification(NotificationTemplates.offerDeleted(editingOffer?.title || "Unknown Offer"))

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
        variant: "destructive" 
      });
    }
  }

  // Add products to offer
  function openAddProductsDialog(offer: Offer) {
    setSelectedOffer(offer);
    setSelectedProducts(offer.homepage_offer_products?.map(p => p.product_id) || []);
    setAddProductsDialogOpen(true);
  }

  async function handleSaveOfferProducts() {
    if (!selectedOffer) return;

    try {
      // Remove all existing products for this offer
      const { error: deleteError } = await supabase
        .from("homepage_offer_products")
        .delete()
        .eq("offer_id", selectedOffer.id);

      if (deleteError) {
        console.error("Error removing existing products:", deleteError);
        toast({
          title: "Error",
          description: "Failed to update offer products",
          variant: "destructive",
        });
        return;
      }

      // Add selected products
      if (selectedProducts.length > 0) {
        const { error: insertError } = await supabase
          .from("homepage_offer_products")
          .insert(selectedProducts.map(pid => ({ 
            offer_id: selectedOffer.id, 
            product_id: pid 
          })));

        if (insertError) {
          console.error("Error adding products to offer:", insertError);
          toast({
            title: "Error",
            description: "Failed to add products to offer",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: "Offer products updated successfully",
      });

      setAddProductsDialogOpen(false);
      setSelectedOffer(null);
      fetchAll();
    } catch (error) {
      console.error("Error saving offer products:", error);
      toast({
        title: "Error",
        description: "Failed to save offer products",
        variant: "destructive",
      });
    }
  }

  // Featured stores management
  function openAddStoresDialog() {
    setSelectedStores(featuredStores.map(fs => fs.shop_id));
    setAddStoresDialogOpen(true);
  }

  // Remove individual store from featured stores
  async function handleRemoveFeaturedStore(featuredStoreId: string) {
    if (!confirm("Are you sure you want to remove this store from featured stores?")) {
      return;
    }

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
          description: "Failed to update featured stores",
          variant: "destructive",
        });
        return;
      }

      // Add selected stores
      if (selectedStores.length > 0) {
        const { error: insertError } = await supabase
          .from("homepage_featured_stores")
          .insert(selectedStores.map((shopId, index) => ({ 
            shop_id: shopId, 
            position: index + 1,
            is_active: true
          })));

        if (insertError) {
          console.error("Error adding featured stores:", JSON.stringify(insertError, null, 2));
          toast({
            title: "Error",
            description: "Failed to add featured stores",
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

  // UI
  if (roleLoading || loading) return <div className="p-8 text-center">Loading...</div>;
  if (currentUserRole !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h2>
        <p className="text-gray-500">You need admin privileges to access this page.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Homepage Control</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="offers" className="dark:text-gray-200">Special Offers</TabsTrigger>
          <TabsTrigger value="stores" className="dark:text-gray-200">Featured Stores</TabsTrigger>
        </TabsList>
        
        {/* Special Offers */}
        <TabsContent value="offers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Special Offers</CardTitle>
                <CardDescription>Create and manage homepage offers. Add products after creating an offer.</CardDescription>
              </div>
              <Dialog open={offerDialogOpen} onOpenChange={(open) => {
                setOfferDialogOpen(open);
                if (!open) {
                  setEditingOffer(null);
                  setOfferForm({ title: "" });
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Offer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingOffer ? "Edit Offer" : "Add New Offer"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Label htmlFor="offer-title">Offer Name</Label>
                    <Input 
                      id="offer-title" 
                      value={offerForm.title} 
                      onChange={e => setOfferForm({ title: e.target.value })} 
                      placeholder="Enter offer name" 
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setOfferDialogOpen(false);
                      setEditingOffer(null);
                      setOfferForm({ title: "" });
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={editingOffer ? handleUpdateOffer : handleCreateOffer}>
                      {editingOffer ? "Update Offer" : "Create Offer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {offers.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">No offers created yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create your first offer to get started</p>
                </div>
              ) : (
                <Tabs defaultValue="offers" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="offers">All Offers</TabsTrigger>
                    <TabsTrigger value="products">Manage Products</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="offers" className="space-y-4">
                    {offers.map(offer => (
                      <div key={offer.id} className="border rounded-lg p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{offer.title}</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {offer.homepage_offer_products?.length || 0} products
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openEditOfferDialog(offer)}
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
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="products" className="space-y-4">
                    {offers.map(offer => (
                      <div key={offer.id} className="border rounded-lg p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{offer.title}</h3>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openAddProductsDialog(offer)}
                          >
                            Manage Products
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {offer.homepage_offer_products?.map(p => (
                            <span key={p.product_id} className="flex items-center gap-1 bg-blue-100 text-blue-800 rounded px-2 py-1 text-xs">
                              {p.products?.main_image && p.products.main_image.trim() !== "" && (
                                <img 
                                  src={p.products.main_image} 
                                  alt={p.products.name} 
                                  className="w-4 h-4 rounded" 
                                />
                              )}
                              {p.products?.name}
                              <span className="text-gray-400">${p.products?.price}</span>
                              {p.products?.shops?.logo_url && p.products.shops.logo_url.trim() !== "" && (
                                <img 
                                  src={p.products.shops.logo_url} 
                                  alt={p.products.shops.name} 
                                  className="w-3 h-3 rounded" 
                                />
                              )}
                              <span>{p.products?.shops?.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
          
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
                  <div className="flex flex-wrap gap-2">
                    {products
                      .filter(product => 
                        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        product.shops?.name.toLowerCase().includes(productSearch.toLowerCase())
                      )
                      .map(product => (
                        <label key={product.id} className="flex items-center gap-2 cursor-pointer border rounded p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                          {product.main_image && product.main_image.trim() !== "" && (
                            <img 
                              src={product.main_image} 
                              alt={product.name} 
                              className="w-8 h-8 rounded object-cover" 
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium dark:text-gray-100">{product.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">${product.price}</span>
                            {product.shops?.logo_url && product.shops.logo_url.trim() !== "" && (
                              <div className="flex items-center gap-1 mt-1">
                                <img 
                                  src={product.shops.logo_url} 
                                  alt={product.shops.name} 
                                  className="w-4 h-4 rounded" 
                                />
                                <span className="text-xs text-gray-400 dark:text-gray-500">{product.shops.name}</span>
                              </div>
                            )}
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
                        </label>
                      ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddProductsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveOfferProducts}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        

        
        {/* Featured Stores */}
        <TabsContent value="stores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Featured Stores</CardTitle>
                <CardDescription>Manage which stores are featured on your homepage.</CardDescription>
              </div>
              <Button onClick={openAddStoresDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Featured Stores
              </Button>
            </CardHeader>
            <CardContent>
              {featuredStores.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">No featured stores yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Click "Add Featured Stores" to add stores</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Position</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Store</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Description</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featuredStores.map((featuredStore, index) => (
                        <tr key={featuredStore.id} className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                          <td className="py-3 px-4">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                              #{index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {featuredStore.shops?.logo_url && featuredStore.shops.logo_url.trim() !== "" && (
                                <img 
                                  src={featuredStore.shops.logo_url} 
                                  alt={featuredStore.shops.name} 
                                  className="w-10 h-10 rounded object-cover" 
                                />
                              )}
                              <span className="font-medium">{featuredStore.shops?.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {featuredStore.shops?.description || "No description"}
                          </td>
                          <td className="py-3 px-4">
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleRemoveFeaturedStore(featuredStore.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          
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
                  <div className="flex flex-wrap gap-2">
                    {shops
                      .filter(shop => 
                        shop.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
                        (shop.description && shop.description.toLowerCase().includes(storeSearch.toLowerCase()))
                      )
                      .map(shop => (
                        <label key={shop.id} className="flex items-center gap-2 cursor-pointer border rounded p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                          {shop.logo_url && shop.logo_url.trim() !== "" && (
                            <img 
                              src={shop.logo_url} 
                              alt={shop.name} 
                              className="w-8 h-8 rounded object-cover" 
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium dark:text-gray-100">{shop.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{shop.description}</span>
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
                        </label>
                      ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddStoresDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveFeaturedStores}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
} 