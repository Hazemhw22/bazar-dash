"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit,
  Trash2,
  Store,
  Package,
  Tag,
  TrendingUp,
  Star,
  Car,
  Diamond,
} from "lucide-react";
import {
  safeCreateNotification,
  NotificationTemplates,
} from "@/lib/notifications";
import { UserRole } from "@/types/database";
import { Shield } from "lucide-react";

// Types
interface Offer {
  id: string;
  title: string;
  description?: string | null;
  homepage_offer_products?: { product_id: string; products: any }[];
}

interface ShopPreview {
  id: string;
  name: string;
  logo_url?: string;
  description?: string | null;
}

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Add products to offer
  const [selectedOfferProducts, setSelectedOfferProducts] = useState<string[]>(
    []
  );
  const [manageProductsDialogOpen, setManageProductsDialogOpen] =
    useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [offerProductsLoading, setOfferProductsLoading] = useState(false);

  // Featured stores management
  const [featuredStores, setFeaturedStores] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [addStoresDialogOpen, setAddStoresDialogOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Tab configuration (remove featured products)
  const tabs = [
    {
      id: "offers",
      label: "العروض الخاصة",
      icon: TrendingUp,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-200 dark:border-red-800",
    },
    {
      id: "featured_stores",
      label: "المتاجر المميزة",
      icon: Store,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
  ];
  const currentTab = tabs.find((tab) => tab.id === activeTab);

  // Fetch data
  async function fetchAll() {
    setLoading(true);
    try {
      // Test simple offers query first
      console.log("Testing simple offers query...");
      const { data: simpleOffersData, error: simpleOffersError } =
        await supabase.from("homepage_offers").select("*");

      console.log("Simple offers result:", {
        data: simpleOffersData,
        error: simpleOffersError,
      });

      if (simpleOffersError) {
        console.error(
          "Simple offers error:",
          JSON.stringify(simpleOffersError, null, 2)
        );
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
        .select(
          "id, title, homepage_offer_products(product_id, products:product_id(id, name, price, main_image, shop_id, shops:shop_id(id, name, logo_url)))"
        )
        .order("created_at", { ascending: false });

      if (offersError) {
        console.error(
          "Complex offers error:",
          JSON.stringify(offersError, null, 2)
        );
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
        .select(
          "id, name, price, main_image, shop_id, shops:shop_id(id, name, logo_url)"
        )
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
      const { data: featuredStoresData, error: featuredStoresError } =
        await supabase
          .from("homepage_featured_stores")
          .select(
            "id, shop_id, position, is_active, shops:shop_id(id, name, logo_url, description)"
          )
          .eq("is_active", true)
          .order("position", { ascending: true });

      if (featuredStoresError) {
        console.error(
          "Error fetching featured stores:",
          JSON.stringify(featuredStoresError, null, 2)
        );
        // If table doesn't exist, just set empty array
        if (featuredStoresError.code === "PGRST116") {
          console.log("Featured stores table doesn't exist yet");
        }
      }

      // Process offers data
      const processedOffers = (offersData || []).map((offer: any) => ({
        ...offer,
        homepage_offer_products: (offer.homepage_offer_products || []).map(
          (p: any) => ({
            ...p,
            products: Array.isArray(p.products) ? p.products[0] : p.products,
          })
        ),
      }));

      // Process products data
      const processedProducts = (productsData || []).map((p: any) => ({
        ...p,
        shops: Array.isArray(p.shops) ? p.shops[0] : p.shops,
      }));

      // Process featured stores data
      const processedFeaturedStores = (featuredStoresData || []).map(
        (fs: any) => ({
          ...fs,
          shops: Array.isArray(fs.shops) ? fs.shops[0] : fs.shops,
        })
      );

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
  // Add/remove products from offer
  async function handleOpenManageProducts(offer: Offer) {
    setOfferProductsLoading(true);
    setEditingOffer(offer); // فقط لتحديد العرض النشط للمنتجات
    // Fetch products in offer
    try {
      const { data, error } = await supabase
        .from("homepage_offer_products")
        .select("product_id")
        .eq("offer_id", offer.id);
      if (error) throw error;
      setSelectedOfferProducts(data ? data.map((p: any) => p.product_id) : []);
      setManageProductsDialogOpen(true);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "تعذر جلب منتجات العرض",
        variant: "destructive",
      });
    } finally {
      setOfferProductsLoading(false);
    }
  }

  async function handleSaveOfferProducts() {
    if (!editingOffer) return;
    setOfferProductsLoading(true);
    try {
      // Remove all products from offer
      await supabase
        .from("homepage_offer_products")
        .delete()
        .eq("offer_id", editingOffer.id);
      // Add selected products
      if (selectedOfferProducts.length > 0) {
        const rows = selectedOfferProducts.map((pid) => ({
          offer_id: editingOffer.id,
          product_id: pid,
        }));
        await supabase.from("homepage_offer_products").insert(rows);
      }
      toast({ title: "تم الحفظ", description: "تم تحديث منتجات العرض بنجاح" });
      setManageProductsDialogOpen(false);
      fetchAll();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "تعذر حفظ منتجات العرض",
        variant: "destructive",
      });
    } finally {
      setOfferProductsLoading(false);
    }
  }
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
      await safeCreateNotification(
        NotificationTemplates.offerCreated(offerForm.title.trim())
      );

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
      await safeCreateNotification(
        NotificationTemplates.offerUpdated(offerForm.title.trim())
      );

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
      await safeCreateNotification(
        NotificationTemplates.offerDeleted("Unknown Offer")
      );

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
          variant: "destructive",
        });
        return;
      }

      // Create notification
      const storeName =
        featuredStores.find((fs) => fs.id === featuredStoreId)?.shops?.name ||
        "Unknown Store";
      await safeCreateNotification(
        NotificationTemplates.featuredStoreRemoved(storeName)
      );

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
        variant: "destructive",
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
        console.error(
          "Error accessing homepage_featured_stores table:",
          JSON.stringify(testError, null, 2)
        );
        toast({
          title: "Error",
          description:
            "Cannot access featured stores table. Please check database setup.",
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
        console.error(
          "Error removing existing featured stores:",
          JSON.stringify(deleteError, null, 2)
        );
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
          is_active: true,
        }));

        const { error: insertError } = await supabase
          .from("homepage_featured_stores")
          .insert(storesToAdd);

        if (insertError) {
          console.error(
            "Error adding new featured stores:",
            JSON.stringify(insertError, null, 2)
          );
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
        const addedStores = shops.filter((shop) =>
          selectedStores.includes(shop.id)
        );
        for (const store of addedStores) {
          await safeCreateNotification(
            NotificationTemplates.featuredStoreAdded(store.name)
          );
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
  <div className="container mx-auto px-2 py-2 sm:p-4 md:p-6 animate-fadein max-w-full">
      {/* Header */}
      <div className="mb-2 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
          <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-primary animate-bounce" />
          <h1 className="text-xl sm:text-3xl font-extrabold text-primary drop-shadow">
            لوحة تحكم الصفحة الرئيسية
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          إدارة محتوى الصفحة الرئيسية: العروض، المنتجات، المتاجر
        </p>
      </div>

      {/* إحصائيات سريعة */}
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 mb-4 sm:mb-6">
  <div className="bg-gradient-to-r from-red-100 to-red-300 dark:from-red-900 dark:to-red-700 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow hover:scale-105 transition-transform">
          <TrendingUp className="w-6 h-6 text-red-600" />
          <div>
            <div className="text-lg font-bold text-red-800 dark:text-red-200">
              {offers.length}
            </div>
            <div className="text-xs text-red-700 dark:text-red-300">
              عدد العروض
            </div>
          </div>
        </div>
  <div className="bg-gradient-to-r from-yellow-100 to-yellow-300 dark:from-yellow-900 dark:to-yellow-700 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow hover:scale-105 transition-transform">
          <Package className="w-6 h-6 text-yellow-600" />
          <div>
            <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
              {products.length}
            </div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              عدد المنتجات
            </div>
          </div>
        </div>
  <div className="bg-gradient-to-r from-blue-100 to-blue-300 dark:from-blue-900 dark:to-blue-700 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow hover:scale-105 transition-transform">
          <Store className="w-6 h-6 text-blue-600" />
          <div>
            <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
              {shops.length}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              عدد المتاجر
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-2 sm:mb-6">
        <nav className="flex flex-row gap-1 ">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 rounded-lg font-bold text-base whitespace-nowrap shadow-sm transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r from-primary/10 to-primary/30 text-primary ${tab.color} scale-105`
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105"
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? tab.color : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
  <hr className="my-2 sm:my-4 border-t border-gray-300 dark:border-gray-700" />
      </div>

      {/* Tab Content */}
      {currentTab && (
  <div className="space-y-3 sm:space-y-6">
          {/* Offers Tab */}
          {activeTab === "offers" && (
            <div className="space-y-3 sm:space-y-6">
              {/* Add Offer Section */}
              <div
                className={`rounded-2xl border-2 ${currentTab.borderColor} bg-gradient-to-r from-primary/10 to-primary/30 shadow-lg mb-4 w-full p-4 sm:p-8 flex flex-col gap-4 sm:gap-6 justify-center`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Plus
                    className={`w-8 h-8 ${currentTab.color} animate-bounce`}
                  />
                  <h5 className="text-2xl font-extrabold text-primary">
                    إضافة عرض جديد
                  </h5>
                </div>
                <form
                  className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end justify-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateOffer();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor="offer-title"
                      className="block text-base font-bold text-gray-700 dark:text-white mb-2"
                    >
                      عنوان العرض
                    </Label>
                    <Input
                      id="offer-title"
                      placeholder="اكتب عنوان العرض..."
                      value={offerForm.title}
                      onChange={(e) => setOfferForm({ title: e.target.value })}
                      className="border-2 border-primary/40 rounded-lg px-3 py-2 sm:px-4 sm:py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-gray-900 text-white text-sm sm:text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!offerForm.title.trim() || !canEdit}
                    className={`text-white px-6 py-2 sm:px-10 sm:py-3 rounded-xl font-bold text-base sm:text-lg shadow-lg ${currentTab.color.replace(
                      "text-",
                      "bg-"
                    )} hover:scale-105 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2`}
                  >
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" /> إضافة
                  </Button>
                </form>
              </div>

              {/* Offers List as Tabs */}
              <div className="panel">
                <div className="mb-2 sm:mb-4 flex items-center gap-1 sm:gap-2">
                  <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 ${currentTab.color}`} />
                  <h5 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                    العروض الخاصة ({offers.length})
                  </h5>
                </div>

                {offers.length === 0 ? (
                  <div className="text-center py-8 sm:py-10">
                    <TrendingUp
                      className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 ${currentTab.color} opacity-50`}
                    />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                      لا يوجد عروض
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2 sm:mb-4">
                      قم بإنشاء أول عرض خاص للبدء
                    </p>
                  </div>
                ) : (
                  <Tabs defaultValue={offers[0]?.id} className="w-full ">
                    <TabsList className="flex flex-nowrap gap-2 sm:gap-4 mb-2 sm:mb-4 bg-gray-200 dark:bg-gray-800 rounded-lg h-14 sm:h-20 overflow-x-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-primary/30">
                      {offers.map((offer) => (
                        <TabsTrigger
                          key={offer.id}
                          value={offer.id}
                          className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg font-bold text-sm sm:text-base bg-gradient-to-r from-primary/10 to-primary/30 border border-primary shadow hover:scale-105 transition-transform duration-200 min-w-[120px] sm:min-w-[160px]"
                        >
                          <TrendingUp className="inline-block w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-primary" />
                          <span className="truncate block">{offer.title}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {offers.map((offer) => (
                      <TabsContent
                        key={offer.id}
                        value={offer.id}
                        className="mt-1 sm:mt-2"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 mb-2 sm:mb-4">
                          <div className="min-w-0">
                            <h6 className="font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 text-base sm:text-lg truncate">
                              {offer.title}
                            </h6>
                            {offer.description && (
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                {offer.description}
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1 sm:gap-2 self-end sm:self-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2 py-1 sm:px-3 sm:py-2"
                                onClick={() => {
                                  setEditingOffer(offer);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="px-2 py-1 sm:px-3 sm:py-2"
                                onClick={() => handleDeleteOffer(offer.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* إدارة المنتجات داخل العرض */}
                        <div
                          className={`rounded-2xl border-2 ${currentTab.borderColor} bg-gradient-to-r from-primary/10 to-primary/30 shadow-lg mb-6 w-full p-8 flex flex-col gap-6 justify-center`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Plus
                              className={`w-8 h-8 ${currentTab.color} animate-bounce`}
                            />
                            <h5 className="text-2xl font-extrabold text-primary">
                              إدارة المنتجات داخل العرض
                            </h5>
                          </div>
                          <div className="flex flex-col md:flex-row gap-4 items-end justify-center">
                            <Button
                              type="button"
                              disabled={!canEdit || offers.length === 0}
                              className={`text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg ${currentTab.color.replace(
                                "text-",
                                "bg-"
                              )} hover:scale-105 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2`}
                              onClick={() =>
                                handleOpenManageProducts(offers[0])
                              }
                            >
                              <Plus className="w-6 h-6" /> إضافة منتجات للعرض
                            </Button>
                          </div>
                        </div>
                        {/* Products as Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {offer.homepage_offer_products &&
                          offer.homepage_offer_products.length > 0 ? (
                            offer.homepage_offer_products.map(
                              (p: any, idx: number) => (
                                <Card
                                  key={idx}
                                  className="bg-white dark:bg-gray-800 border-2 border-primary/30 dark:border-primary/40 shadow-lg hover:scale-105 hover:shadow-xl transition-transform duration-200"
                                >
                                  <CardHeader className="flex flex-col items-center justify-center">
                                    {p.products?.main_image ? (
                                      <img
                                        src={p.products.main_image}
                                        alt={p.products.name}
                                        className="w-20 h-20 rounded-lg object-cover mb-2 shadow"
                                      />
                                    ) : (
                                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                                        <Package className="w-10 h-10 text-gray-400" />
                                      </div>
                                    )}
                                    <CardTitle className="text-center text-lg font-bold text-primary mb-1">
                                      {p.products?.name}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="text-center">
                                    <div className="text-base text-gray-700 dark:text-gray-300 mb-2">
                                      السعر:{" "}
                                      <span className="font-bold text-primary">
                                        ${p.products?.price}
                                      </span>
                                    </div>
                                    {p.products?.shops && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        المتجر: {p.products.shops.name}
                                      </div>
                                    )}
                                    {canEdit && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="w-full mt-2"
                                        onClick={async () => {
                                          await supabase
                                            .from("homepage_offer_products")
                                            .delete()
                                            .eq("offer_id", offer.id)
                                            .eq("product_id", p.product_id);
                                          toast({
                                            title: "تم الحذف",
                                            description:
                                              "تم حذف المنتج من العرض",
                                          });
                                          fetchAll();
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" /> حذف
                                        المنتج
                                      </Button>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            )
                          ) : (
                            <span className="text-gray-400">
                              لا يوجد منتجات مرتبطة
                            </span>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </div>
            </div>
          )}
          {/* ...existing code... (featured stores tab remains unchanged) */}

          {/* Featured Products Tab */}
          {activeTab === "featured_products" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Add Product Section */}
              <div
                className={`panel ${currentTab.bgColor} ${currentTab.borderColor} border-2`}
              >
                <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <Plus
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${currentTab.color}`}
                  />
                  <h5 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Add Featured Product
                  </h5>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
                  <div className="flex-1">
                    <Label
                      htmlFor="product-search"
                      className="block text-sm font-bold text-gray-700 dark:text-white mb-2"
                    >
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
                    onClick={() => setManageProductsDialogOpen(true)}
                    disabled={!canEdit}
                    className={`text-white px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto ${currentTab.color.replace(
                      "text-",
                      "bg-"
                    )} hover:opacity-90 disabled:opacity-50`}
                  >
                    Manage Products
                  </Button>
                </div>
              </div>

              {/* Featured Products Grid */}
              <div className="panel">
                <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <Star
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${currentTab.color}`}
                  />
                  <h5 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Featured Products (
                    {products.filter((p) => p.is_featured).length})
                  </h5>
                </div>

                {products.filter((p) => p.is_featured).length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Star
                      className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 ${currentTab.color} opacity-50`}
                    />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No featured products
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                      Add products to showcase them on the homepage
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {products
                      .filter((p) => p.is_featured)
                      .map((product) => (
                        <div
                          key={product.id}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                        >
                          {/* Product Image */}
                          <div className="relative h-32 sm:h-40 md:h-48">
                            <img
                              src={
                                product.main_image ||
                                "/assets/images/img-placeholder-fallback.webp"
                              }
                              alt={product.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src =
                                  "/assets/images/img-placeholder-fallback.webp";
                              }}
                            />
                          </div>
                          {/* Product Details */}
                          <div className="p-3 sm:p-4">
                            <h6 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm sm:text-base">
                              {product.name}
                            </h6>
                            <div className="space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex justify-between">
                                <span>Price:</span>
                                <span className="font-bold text-primary">
                                  ${product.price}
                                </span>
                              </div>
                              {product.shops && (
                                <div className="flex justify-between">
                                  <span>Store:</span>
                                  <span className="font-medium">
                                    {product.shops.name}
                                  </span>
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
          {activeTab === "featured_stores" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Add Store Section */}
              <div
                className={`rounded-2xl border-2 ${currentTab.borderColor} bg-gradient-to-r from-primary/10 to-primary/30 shadow-lg mb-6 w-full p-8 flex flex-col gap-6 justify-center`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Plus
                    className={`w-8 h-8 ${currentTab.color} animate-bounce`}
                  />
                  <h5 className="text-2xl font-extrabold text-primary">
                    إضافة متجر مميز
                  </h5>
                </div>
                <form
                  className="flex flex-col md:flex-row gap-4 items-end justify-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAddStoresDialogOpen(true);
                  }}
                >
                  <div className="flex-1">
                    <Label
                      htmlFor="store-select"
                      className="block text-base font-bold text-gray-700 dark:text-white mb-2"
                    >
                      اختر المتجر
                    </Label>
                    <div className="relative">
                      <select
                        id="store-select"
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        className="border-2 border-primary/40 rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-gray-900 text-white w-full appearance-none"
                        style={{ paddingRight: "2.5rem" }}
                      >
                        <option value="">اختر المتجر...</option>
                        {shops.map((shop) => (
                          <option key={shop.id} value={shop.name}>
                            {shop.name}
                          </option>
                        ))}
                      </select>
                      {/* Custom dropdown with images */}
                      <div className="absolute top-0 right-0 h-full flex items-center pointer-events-none pr-3">
                        <svg
                          width="20"
                          height="20"
                          fill="currentColor"
                          className="text-primary"
                        >
                          <path d="M7 10l5 5 5-5z" />
                        </svg>
                      </div>
                      {/* Show selected shop image next to dropdown */}
                      {storeSearch && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center pl-2">
                          {(() => {
                            const selectedShop = shops.find(
                              (s) => s.name === storeSearch
                            );
                            if (selectedShop?.logo_url) {
                              return (
                                <img
                                  src={selectedShop.logo_url}
                                  alt={selectedShop.name}
                                  className="w-8 h-8 rounded object-cover mr-2"
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={!canEdit}
                    className={`text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg ${currentTab.color.replace(
                      "text-",
                      "bg-"
                    )} hover:scale-105 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2`}
                  >
                    <Plus className="w-6 h-6" /> إضافة
                  </Button>
                </form>
              </div>

              {/* Featured Stores as Cards */}
              <div className="panel">
                <div className="mb-4 flex items-center gap-2">
                  <Store className={`w-6 h-6 ${currentTab.color}`} />
                  <h5 className="text-xl font-bold text-gray-900 dark:text-white">
                    المتاجر المميزة ({featuredStores.length})
                  </h5>
                </div>
                {featuredStores.length === 0 ? (
                  <div className="text-center py-10">
                    <Store
                      className={`w-16 h-16 mx-auto mb-4 ${currentTab.color} opacity-50`}
                    />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      لا يوجد متاجر مميزة
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      قم بإضافة أول متجر مميز للبدء
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {featuredStores.map((store) => (
                      <Card
                        key={store.id}
                        className="bg-white dark:bg-gray-800 border-2 border-primary/30 dark:border-primary/40 shadow-lg hover:scale-105 hover:shadow-xl transition-transform duration-200"
                      >
                        <CardHeader className="flex flex-col items-center justify-center">
                          {store.shops?.logo_url ? (
                            <img
                              src={store.shops.logo_url}
                              alt={store.shops.name}
                              className="w-20 h-20 rounded-lg object-cover mb-2 shadow"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                              <Store className="w-10 h-10 text-gray-400" />
                            </div>
                          )}
                          <CardTitle className="text-center text-lg font-bold text-primary mb-1">
                            {store.shops?.name || "بدون اسم"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                          <div className="text-base text-gray-700 dark:text-gray-300 mb-2">
                            الترتيب:{" "}
                            <span className="font-bold text-primary">
                              #{store.position}
                            </span>
                          </div>
                          {store.shops?.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {store.shops.description}
                            </div>
                          )}
                          {canEdit && (
                            <div className="flex gap-2 justify-center mt-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleRemoveFeaturedStore(store.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Offer Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingOffer(null);
            setOfferForm({ title: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل عنوان العرض</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-offer-title">عنوان العرض</Label>
              <Input
                id="edit-offer-title"
                value={editingOffer ? offerForm.title : ""}
                onFocus={() => {
                  if (editingOffer) setOfferForm({ title: editingOffer.title });
                }}
                onChange={(e) => setOfferForm({ title: e.target.value })}
                placeholder="اكتب عنوان العرض..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingOffer(null);
                  setOfferForm({ title: "" });
                }}
              >
                إلغاء
              </Button>
              <Button onClick={handleUpdateOffer}>حفظ التعديل</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* إدارة المنتجات داخل العرض */}
      <Dialog
        open={manageProductsDialogOpen}
        onOpenChange={setManageProductsDialogOpen}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-r from-primary/10 to-primary/30 border-2 border-primary/40 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-primary flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" /> إضافة منتج إلى العرض
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="product-search"
                className="block text-base font-bold text-gray-700 dark:text-white mb-2"
              >
                البحث عن منتج
              </Label>
              <Input
                id="product-search"
                placeholder="اكتب اسم المنتج..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="border-2 border-primary/40 rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-gray-900 text-white"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-3">
                {products
                  .filter((product) =>
                    product.name
                      .toLowerCase()
                      .includes(productSearch.toLowerCase())
                  )
                  .map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-900 border-2 border-primary/30 shadow hover:scale-105 transition-transform duration-200"
                    >
                      <div className="flex items-center gap-4">
                        {product.main_image ? (
                          <img
                            src={product.main_image}
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover shadow"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white text-lg">
                            {product.name}
                          </div>
                          <div className="text-sm text-primary font-bold">
                            ₪{product.price}
                          </div>
                          {product.shops && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              {product.shops.logo_url && (
                                <img
                                  src={product.shops.logo_url}
                                  alt={product.shops.name}
                                  className="w-4 h-4 rounded"
                                />
                              )}
                              <span>{product.shops.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedOfferProducts.includes(product.id)}
                        onChange={() =>
                          setSelectedOfferProducts((prev) =>
                            prev.includes(product.id)
                              ? prev.filter((id) => id !== product.id)
                              : [...prev, product.id]
                          )
                        }
                        className="ml-2 w-6 h-6 accent-primary rounded focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setManageProductsDialogOpen(false)}
                className="px-6 py-2 rounded-lg font-bold"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSaveOfferProducts}
                disabled={offerProductsLoading}
                className="px-8 py-2 rounded-lg font-bold bg-primary text-white hover:scale-105 transition-all"
              >
                حفظ المنتجات
              </Button>
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
                  .filter((shop) =>
                    shop.name.toLowerCase().includes(storeSearch.toLowerCase())
                  )
                  .map((shop) => (
                    <div
                      key={shop.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
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
                            <div className="text-sm text-gray-500">
                              {shop.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedStores.includes(shop.id)}
                        onChange={() =>
                          setSelectedStores((prev) =>
                            prev.includes(shop.id)
                              ? prev.filter((id) => id !== shop.id)
                              : [...prev, shop.id]
                          )
                        }
                        className="ml-2"
                      />
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddStoresDialogOpen(false)}
              >
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
