"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  Users,
  ShoppingCart,
  Package,
  Store,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalUsers: number;
  totalShops: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeShops: number;
  recentOrders: Array<{
    id: string;
    customer_name: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
  recentProducts: Array<{
    id: string;
    name: string;
    price: number;
    shop_name: string;
    created_at: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    fetchDashboardStats();
    fetchUserName();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log("Fetching dashboard stats...");

      // Get basic counts
      const [usersResult, shopsResult, productsResult, ordersResult] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("shops").select("*", { count: "exact", head: true }),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
        ]);

      // Get additional stats
      const [activeShopsResult, pendingOrdersResult] = await Promise.all([
        supabase
          .from("shops")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      // Get total revenue
      const { data: ordersData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("payment_status", "paid");

      const totalRevenue =
        ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      // Get recent orders
      const { data: recentOrdersData } = await supabase
        .from("orders")
        .select(
          `
          id,
          total_amount,
          status,
          created_at,
          profiles!orders_customer_id_fkey (
            full_name,
            email
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      const recentOrders =
        recentOrdersData?.map((order) => ({
          id: order.id,
          customer_name:
            (order.profiles?.[0]?.full_name || order.profiles?.[0]?.email) ??
            "Unknown Customer",
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
        })) || [];

      // Get recent products
      const { data: recentProductsData } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          price,
          created_at,
          shops (
            name
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      type RecentProduct = {
        id: string;
        name: string;
        price: number;
        created_at: string;
        shops: { name: string } | { name: string }[] | null;
      };

      const recentProducts =
        (recentProductsData as RecentProduct[] | undefined)?.map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          shop_name: Array.isArray(product.shops)
            ? product.shops[0]?.name || "Unknown Shop"
            : product.shops?.name || "Unknown Shop",
          created_at: product.created_at,
        })) || [];

      const dashboardStats: DashboardStats = {
        totalUsers: usersResult.count || 0,
        totalShops: shopsResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalRevenue,
        pendingOrders: pendingOrdersResult.count || 0,
        activeShops: activeShopsResult.count || 0,
        recentOrders,
        recentProducts,
      };

      setStats(dashboardStats);
      console.log("Dashboard stats:", dashboardStats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUserName = async () => {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setUserName(profile?.full_name || "");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      returned: "bg-gray-100 text-gray-800",
    };

    const colorClass = statusConfig[status] || statusConfig.pending;

    return (
      <Badge className={colorClass + " hover:" + colorClass}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button
                  onClick={fetchDashboardStats}
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome {userName && <span className="font-bold">{userName}</span>}
          </p>
        </div>
        <Button onClick={fetchDashboardStats} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalUsers)}
            </div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shops</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.activeShops)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalShops} total shops (
              {stats.totalShops > 0
                ? Math.round((stats.activeShops / stats.totalShops) * 100)
                : 0}
              %)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalProducts)}
            </div>
            <p className="text-xs text-muted-foreground">Products listed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalOrders} orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalOrders)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} pending orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                stats.totalOrders > 0
                  ? stats.totalRevenue / stats.totalOrders
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatNumber(stats.pendingOrders)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalOrders > 0
                ? Math.round((stats.pendingOrders / stats.totalOrders) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/orders">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">#{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">
                        {order.customer_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(order.total_amount)}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent orders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Products</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/products">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentProducts.length > 0 ? (
                stats.recentProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        {product.shop_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(product.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(product.price)}
                      </p>
                      <Badge variant="outline">New</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent products</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              className="h-20 flex flex-col items-center justify-center"
              asChild
            >
              <Link href="/dashboard/products/add">
                <Package className="w-6 h-6 mb-2" />
                Add Product
              </Link>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center bg-transparent"
              variant="outline"
              asChild
            >
              <Link href="/dashboard/shops/add">
                <Store className="w-6 h-6 mb-2" />
                Add Shop
              </Link>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center bg-transparent"
              variant="outline"
              asChild
            >
              <Link href="/dashboard/categories/add">
                <Package className="w-6 h-6 mb-2" />
                Add Category
              </Link>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center bg-transparent"
              variant="outline"
              asChild
            >
              <Link href="/dashboard/analytics">
                <TrendingUp className="w-6 h-6 mb-2" />
                View Analytics
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
