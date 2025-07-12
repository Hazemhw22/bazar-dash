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
  Layers,
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalStores: number;
  totalCategories: number;
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
    created_at: string;
  }>;
  storeInfo: {
    name: string;
    description: string | null;
    logo_url: string | null;
    background_image_url: string | null;
    is_active: boolean;
  } | null;
}

interface ChartData {
  pieData: Array<{ name: string; value: number }>;
  salesData: Array<{ month: string; products: number }>;
  revenueData: Array<{ month: string; stores: number }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData>({
    pieData: [],
    salesData: [],
    revenueData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("customer");

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const chartConfig = {
    products: {
      label: "Products",
      color: "#8884d8",
    },
    stores: {
      label: "Stores", 
      color: "#82ca9d",
    },
    value: {
      label: "Value",
      color: "#8884d8",
    },
    month: {
      label: "Month",
      color: "#82ca9d",
    },
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchChartData();
    fetchUserName();
    fetchUserRole();
  }, []);

  const fetchChartData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "customer";

      if (role === "admin") {
        // Fetch data for admin charts
        const [productsData, categoriesData, shopsData] = await Promise.all([
          supabase.from("products").select("category_id, created_at"),
          supabase.from("categories").select("id, name"),
          supabase.from("shops").select("created_at")
        ]);

        // Prepare pie chart data (products by category)
        const categoryMap = new Map();
        categoriesData.data?.forEach(cat => categoryMap.set(cat.id, cat.name));
        
        const categoryCounts = new Map();
        productsData.data?.forEach(product => {
          const categoryName = categoryMap.get(product.category_id) || "Unknown";
          categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);
        });

        const pieData = Array.from(categoryCounts.entries()).map(([name, value]) => ({
          name,
          value: value as number
        }));

        // Prepare sales chart data (product additions over time)
        const productMonths = new Map();
        productsData.data?.forEach(product => {
          const month = new Date(product.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
          productMonths.set(month, (productMonths.get(month) || 0) + 1);
        });

        const salesData = Array.from(productMonths.entries()).map(([month, products]) => ({
          month,
          products: products as number
        })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        // Prepare revenue chart data (store additions over time)
        const storeMonths = new Map();
        shopsData.data?.forEach(shop => {
          const month = new Date(shop.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
          storeMonths.set(month, (storeMonths.get(month) || 0) + 1);
        });

        const revenueData = Array.from(storeMonths.entries()).map(([month, stores]) => ({
          month,
          stores: stores as number
        })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        setChartData({ pieData, salesData, revenueData });
      } else if (role === "vendor") {
        // Fetch data for vendor charts (store-specific)
        const { data: storeData } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (storeData) {
          const [productsData, categoriesData] = await Promise.all([
            supabase.from("products").select("category_id, created_at").eq("shop_id", storeData.id),
            supabase.from("categories").select("id, name")
          ]);

          // Prepare pie chart data for vendor's store
          const categoryMap = new Map();
          categoriesData.data?.forEach(cat => categoryMap.set(cat.id, cat.name));
          
          const categoryCounts = new Map();
          productsData.data?.forEach(product => {
            const categoryName = categoryMap.get(product.category_id) || "Unknown";
            categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);
          });

          const pieData = Array.from(categoryCounts.entries()).map(([name, value]) => ({
            name,
            value: value as number
          }));

          // Prepare sales chart data for vendor's store
          const productMonths = new Map();
          productsData.data?.forEach(product => {
            const month = new Date(product.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
            productMonths.set(month, (productMonths.get(month) || 0) + 1);
          });

          const salesData = Array.from(productMonths.entries()).map(([month, products]) => ({
            month,
            products: products as number
          })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

          // For vendor, revenue trend shows their store's product additions over time
          const revenueData = Array.from(productMonths.entries()).map(([month, products]) => ({
            month,
            stores: products as number
          })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

          setChartData({ pieData, salesData, revenueData });
        }
      } else {
        // Customer - no chart data
        setChartData({ pieData: [], salesData: [], revenueData: [] });
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log("Fetching dashboard stats...");

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      // Get user's role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "customer";

      // Handle different roles
      if (role === "vendor") {
        // Vendor (store owner) - store-specific data
        const { data: storeData } = await supabase
          .from("shops")
          .select("*")
          .eq("owner_id", user.id)
          .single();

        if (!storeData) {
          setError("No store found for this user");
          return;
        }

        // Get store-specific counts
        const [productsResult] = await Promise.all([
          supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("shop_id", storeData.id),
        ]);

        // Get orders that contain products from this store
        const { data: storeProducts } = await supabase
          .from("products")
          .select("id")
          .eq("shop_id", storeData.id);

        const storeProductIds = storeProducts?.map(p => p.id) || [];

        // Get orders and order items for this store's products
        const { data: orderItemsData } = await supabase
          .from("order_items")
          .select(`
            order_id,
            total_price,
            orders (
              id,
              total_amount,
              status,
              payment_status,
              created_at,
              profiles!orders_customer_id_fkey (
                full_name,
                email
              )
            )
          `)
          .in("product_id", storeProductIds);

        // Calculate store-specific stats
        const uniqueOrders = new Map();
        const pendingOrders = new Set();
        const completedOrders = new Set();
        let totalRevenue = 0;

        orderItemsData?.forEach((item: any) => {
          const order = item.orders;
          if (order && !uniqueOrders.has(order.id)) {
            uniqueOrders.set(order.id, order);
            
            if (order.status === "pending") {
              pendingOrders.add(order.id);
            } else if (order.status === "delivered") {
              completedOrders.add(order.id);
            }
            
            if (order.payment_status === "paid") {
              totalRevenue += order.total_amount;
            }
          }
        });

        const totalOrders = uniqueOrders.size;
        const pendingOrdersCount = pendingOrders.size;
        const completedOrdersCount = completedOrders.size;

        // Get recent orders for this store
        const recentOrders = Array.from(uniqueOrders.values())
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((order: any) => ({
            id: order.id,
            customer_name: (order.profiles?.[0]?.full_name || order.profiles?.[0]?.email) ?? "Unknown Customer",
            total_amount: order.total_amount,
            status: order.status,
            created_at: order.created_at,
          }));

        // Get recent products for this store
        const { data: recentProductsData } = await supabase
          .from("products")
          .select("id, name, price, created_at")
          .eq("shop_id", storeData.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const recentProducts =
          recentProductsData?.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            created_at: product.created_at,
          })) || [];

        const dashboardStats: DashboardStats = {
          totalProducts: productsResult.count || 0,
          totalOrders,
          totalRevenue,
          pendingOrders: pendingOrdersCount,
          completedOrders: completedOrdersCount,
          totalStores: 0, // Not relevant for vendor
          totalCategories: 0, // Not relevant for vendor
          recentOrders,
          recentProducts,
          storeInfo: {
            name: storeData.name,
            description: storeData.description,
            logo_url: storeData.logo_url,
            background_image_url: storeData.background_image_url,
            is_active: storeData.is_active,
          },
        };

        setStats(dashboardStats);
        console.log("Dashboard stats:", dashboardStats);
      } else if (role === "admin") {
        // Admin - global data
      // Get basic counts
      const [usersResult, shopsResult, productsResult, ordersResult, categoriesResult] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("shops").select("*", { count: "exact", head: true }),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase.from("categories").select("*", { count: "exact", head: true }),
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

      const recentProducts =
          recentProductsData?.map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          created_at: product.created_at,
        })) || [];

      const dashboardStats: DashboardStats = {
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalRevenue,
        pendingOrders: pendingOrdersResult.count || 0,
        completedOrders: 0, // Would need to calculate this
        totalStores: shopsResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        recentOrders,
        recentProducts,
        storeInfo: null, // No store info for admin
      };

        setStats(dashboardStats);
        console.log("Dashboard stats:", dashboardStats);
      } else {
        // Customer - limited data
        const dashboardStats: DashboardStats = {
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          completedOrders: 0,
          totalStores: 0,
          totalCategories: 0,
          recentOrders: [],
          recentProducts: [],
          storeInfo: null,
      };

      setStats(dashboardStats);
      console.log("Dashboard stats:", dashboardStats);
      }
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

  const fetchUserRole = async () => {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(profile?.role || "customer");
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
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome </p>
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
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
        <p className="text-muted-foreground">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8  min-h-screen">
      {/* Header + Time Range Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-base">
            Overview and analytics
          </p>
        </div>
        <Tabs defaultValue="month" className="w-fit">
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="year">This Year</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card text-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{formatCurrency(stats.totalRevenue)} This Month
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card text-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {formatNumber(stats.totalStores)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Inventory
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card text-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Categories
            </CardTitle>
            <Layers className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {formatNumber(stats.totalCategories)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Product Categories
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card text-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-5 w-5 text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-400">
              {formatNumber(stats.totalProducts)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Products in store
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Grouped Cards: Categories by Type, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card text-foreground">
          <CardHeader>
            <CardTitle>Categories by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.pieData.length > 0 ? (
              <ChartContainer config={chartConfig}>
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {chartData.pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <span className="text-muted-foreground">No data available</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card text-foreground">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
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
                className="h-20 flex flex-col items-center justify-center"
                asChild
              >
                <Link href="/dashboard/categories/add">
                  <Layers className="w-6 h-6 mb-2" />
                  Add Category
                </Link>
              </Button>
              <Button
                className="h-20 flex flex-col items-center justify-center"
                asChild
              >
                <Link href="/dashboard/shops/add">
                  <Store className="w-6 h-6 mb-2" />
                  Add Store
                </Link>
              </Button>
              <Button
                className="h-20 flex flex-col items-center justify-center"
                asChild
              >
                <Link href="/dashboard/orders">
                  <ShoppingCart className="w-6 h-6 mb-2" />
                  View Orders
                </Link>
              </Button>
              <Button
                className="h-20 flex flex-col items-center justify-center"
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
      {/* Grouped Cards: Products Chart, Stores Chart*/}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card text-foreground">
          <CardHeader>
            <CardTitle>Products Chart</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.salesData.length > 0 ? (
              <ChartContainer config={chartConfig}>
                <LineChart data={chartData.salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Line
                    type="monotone"
                    dataKey="products"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                  <ChartTooltip />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <span className="text-muted-foreground">No data available</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card text-foreground">
          <CardHeader>
            <CardTitle>Stores Chart</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.revenueData.length > 0 ? (
              <ChartContainer config={chartConfig}>
                <LineChart data={chartData.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Line
                    type="monotone"
                    dataKey="stores"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                  <ChartTooltip />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <span className="text-muted-foreground">No data available</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
