"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Shop, WorkingHours } from "@/types/database";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Edit,
  Store,
  Clock,
  MapPin,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface ShopWithDetails extends Shop {
  owner_name?: string;
  products_count?: number;
  is_currently_open?: boolean;
  today_hours?: WorkingHours;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<ShopWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log("Fetching shops...");

      // جلب المتاجر مع معلومات المالك
      const { data: shopsData, error: shopsError } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });

      if (shopsError) {
        console.error("Shops query failed:", shopsError);
        setError(shopsError.message || JSON.stringify(shopsError));
        return;
      }

      console.log("Shops data:", shopsData);

      if (!shopsData) {
        setShops([]);
        return;
      }

      // إضافة تفاصيل إضافية لكل متجر
      const shopsWithDetails = await Promise.all(
        shopsData.map(async (shop) => {
          try {
            // جلب عدد المنتجات
            const { count: productCount, error: productCountError } =
              await supabase
                .from("products")
                .select("*", { count: "exact", head: true })
                .eq("shop_id", shop.id);

            if (productCountError) {
              console.error(
                `Error counting products for shop ${shop.id}:`,
                productCountError
              );
            }

            // حساب حالة المتجر الحالية
            const isCurrentlyOpen = checkIfShopIsOpen(
              shop.working_hours,
              shop.timezone
            );
            const todayHours = getTodayWorkingHours(shop.working_hours);

            return {
              ...shop,
              owner_name: "Unknown", // لا تحاول جلب اسم المالك من profiles
              products_count: productCount || 0,
              is_currently_open: isCurrentlyOpen,
              today_hours: todayHours,
            };
          } catch (error) {
            console.error(`Error processing shop ${shop.id}:`, error);
            return {
              ...shop,
              owner_name: "Unknown",
              products_count: 0,
              is_currently_open: false,
              today_hours: undefined,
            };
          }
        })
      );

      setShops(shopsWithDetails);
      console.log("Shops with details:", shopsWithDetails);
    } catch (error) {
      console.error("Error fetching shops:", error);
      setError(error instanceof Error ? error.message : JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  const checkIfShopIsOpen = (
    workingHours: WorkingHours[] | null | undefined,
    timezone = "UTC"
  ): boolean => {
    if (!workingHours || workingHours.length === 0) return false;

    try {
      const now = new Date();
      const currentDay = now.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: timezone,
      });
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      });

      const todaySchedule = workingHours.find(
        (schedule) => schedule.day === currentDay
      );

      if (!todaySchedule || !todaySchedule.is_open) return false;

      return (
        currentTime >= todaySchedule.open_time &&
        currentTime <= todaySchedule.close_time
      );
    } catch (error) {
      console.error("Error checking shop status:", error);
      return false;
    }
  };

  const getTodayWorkingHours = (
    workingHours: WorkingHours[] | null | undefined
  ): WorkingHours | undefined => {
    if (!workingHours || workingHours.length === 0) return undefined;

    try {
      const now = new Date();
      const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });

      return workingHours.find((schedule) => schedule.day === currentDay);
    } catch (error) {
      console.error("Error getting today's hours:", error);
      return undefined;
    }
  };

  const toggleShopStatus = async (shopId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("shops")
        .update({ is_active: !currentStatus })
        .eq("id", shopId);

      if (error) throw error;

      // تحديث الحالة محلياً
      setShops((prev) =>
        prev.map((shop) =>
          shop.id === shopId ? { ...shop, is_active: !currentStatus } : shop
        )
      );

      alert("Shop status updated successfully!");
    } catch (error) {
      console.error("Error updating shop status:", error);
      alert("Error updating shop status");
    }
  };

  const deleteShop = async (shopId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this shop? This will also delete all associated products."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("shops").delete().eq("id", shopId);

      if (error) throw error;

      // إزالة المتجر من القائمة محلياً
      setShops((prev) => prev.filter((shop) => shop.id !== shopId));

      alert("Shop deleted successfully!");
    } catch (error) {
      console.error("Error deleting shop:", error);
      alert("Error deleting shop");
    }
  };

  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && shop.is_active) ||
      (statusFilter === "inactive" && !shop.is_active);

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatWorkingHours = (hours: WorkingHours | undefined) => {
    if (!hours) return "No schedule";
    if (!hours.is_open) return "Closed today";
    return `${hours.open_time} - ${hours.close_time}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
            <p className="text-gray-600">
              Manage your shops and store listings
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading shops
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button onClick={fetchShops} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
          <p className="text-gray-600">Manage your shops and store listings</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">{filteredShops.length} shops</Badge>
          <Button className="bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/dashboard/shops/add">
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shops Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Working Hours</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredShops.map((shop) => (
              <TableRow key={shop.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                      {shop.logo_url && shop.logo_url.startsWith("http") ? (
                        <img
                          src={shop.logo_url || "/placeholder.svg"}
                          alt={shop.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span>{shop.logo_url || "🏪"}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{shop.name}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {shop.description || "No description"}
                      </div>
                      {shop.timezone && (
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {shop.timezone}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{shop.owner_name}</div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-sm">{shop.email}</div>
                    {shop.phone_number && (
                      <div className="text-sm text-gray-500">
                        {shop.phone_number}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium">
                        {formatWorkingHours(shop.today_hours)}
                      </div>
                      <Badge
                        variant={
                          shop.is_currently_open ? "default" : "secondary"
                        }
                        className={
                          shop.is_currently_open
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }
                      >
                        {shop.is_currently_open ? "Open Now" : "Closed"}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {shop.products_count} products
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={shop.is_active ? "default" : "secondary"}>
                    {shop.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(shop.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShopStatus(shop.id, shop.is_active)}
                      className={
                        shop.is_active ? "text-yellow-600" : "text-green-600"
                      }
                    >
                      {shop.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteShop(shop.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredShops.length === 0 && (
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No shops found
            </h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Shops will appear here when you create them"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredShops.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Showing {filteredShops.length} of {shops.length} shops
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 text-white"
              >
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
