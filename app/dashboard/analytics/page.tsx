"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { TrendingUp, TrendingDown, Users, ShoppingCart, Package, Store, DollarSign, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"


interface AnalyticsData {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  activeProducts: number
  pendingOrders: number
  completedOrders: number
  averageOrderValue: number
  recentGrowth: {
    products: number
    orders: number
    revenue: number
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setError(null)
      setLoading(true)
      console.log("Fetching analytics...")

      // Get current user and their role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role || "customer";

      if (role === "admin") {
        // Admin: fetch all data (no filtering by shop_id)
        const [productsResult, activeProductsResult] = await Promise.all([
          supabase
            .from("products")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
        ]);

        // Get all orders
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: false });

        // Get all order items
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
              created_at
            )
          `);

        // Calculate stats
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
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Growth calculations (last 30 days vs previous 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const { count: recentProductsCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString());
        const { count: previousProductsCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString());
        const allOrdersArr = Array.from(uniqueOrders.values());
        const recentOrders = allOrdersArr.filter((order: any) => new Date(order.created_at) >= thirtyDaysAgo);
        const previousOrders = allOrdersArr.filter((order: any) => {
          const orderDate = new Date(order.created_at);
          return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
        });
        const recentRevenue = recentOrders.filter((order: any) => order.payment_status === "paid").reduce((sum: number, order: any) => sum + order.total_amount, 0);
        const previousRevenue = previousOrders.filter((order: any) => order.payment_status === "paid").reduce((sum: number, order: any) => sum + order.total_amount, 0);
        const calculateGrowth = (recent: number, previous: number) => {
          if (previous === 0) return recent > 0 ? 100 : 0;
          return Math.round(((recent - previous) / previous) * 100);
        };
        const analyticsData: AnalyticsData = {
          totalProducts: productsResult.count || 0,
          totalOrders,
          totalRevenue,
          activeProducts: activeProductsResult.count || 0,
          pendingOrders: pendingOrdersCount,
          completedOrders: completedOrdersCount,
          averageOrderValue,
          recentGrowth: {
            products: calculateGrowth(recentProductsCount || 0, previousProductsCount || 0),
            orders: calculateGrowth(recentOrders.length, previousOrders.length),
            revenue: calculateGrowth(recentRevenue, previousRevenue),
          },
        };
        setAnalytics(analyticsData);
        setLoading(false);
        return;
      }

      if (role === "vendor") {
        // Vendor: current logic (store-specific)
        const { data: storeData } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!storeData) {
          setError("No store found for this user");
          setLoading(false);
          return;
        }

        // Get store-specific counts
        const [productsResult, activeProductsResult] = await Promise.all([
          supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("shop_id", storeData.id),
          supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("shop_id", storeData.id)
            .eq("is_active", true),
        ]);

        // Get orders that contain products from this store
        const { data: storeProducts } = await supabase
          .from("products")
          .select("id")
          .eq("shop_id", storeData.id);

        const storeProductIds = storeProducts?.map((p: any) => p.id) || [];

        // Get order items for this store's products
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
              created_at
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
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Get recent growth (last 30 days vs previous 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const { count: recentProductsCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("shop_id", storeData.id)
          .gte("created_at", thirtyDaysAgo.toISOString());
        const { count: previousProductsCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("shop_id", storeData.id)
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString());
        const allOrdersArr = Array.from(uniqueOrders.values());
        const recentOrders = allOrdersArr.filter((order: any) => new Date(order.created_at) >= thirtyDaysAgo);
        const previousOrders = allOrdersArr.filter((order: any) => {
          const orderDate = new Date(order.created_at);
          return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
        });
        const recentRevenue = recentOrders.filter((order: any) => order.payment_status === "paid").reduce((sum: number, order: any) => sum + order.total_amount, 0);
        const previousRevenue = previousOrders.filter((order: any) => order.payment_status === "paid").reduce((sum: number, order: any) => sum + order.total_amount, 0);
        const calculateGrowth = (recent: number, previous: number) => {
          if (previous === 0) return recent > 0 ? 100 : 0;
          return Math.round(((recent - previous) / previous) * 100);
        };
        const analyticsData: AnalyticsData = {
          totalProducts: productsResult.count || 0,
          totalOrders,
          totalRevenue,
          activeProducts: activeProductsResult.count || 0,
          pendingOrders: pendingOrdersCount,
          completedOrders: completedOrdersCount,
          averageOrderValue,
          recentGrowth: {
            products: calculateGrowth(recentProductsCount || 0, previousProductsCount || 0),
            orders: calculateGrowth(recentOrders.length, previousOrders.length),
            revenue: calculateGrowth(recentRevenue, previousRevenue),
          },
        };
        setAnalytics(analyticsData);
        setLoading(false);
        return;
      } else {
        // Customer/other: show friendly message
        setAnalytics(null);
        setError("No analytics available for your account.");
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Set empty analytics instead of showing error
      setAnalytics({
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeProducts: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageOrderValue: 0,
        recentGrowth: {
          products: 0,
          orders: 0,
          revenue: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num)
  }

  const GrowthIndicator = ({ growth }: { growth: number }) => {
    const isPositive = growth >= 0
    return (
      <div className={`flex items-center space-x-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="text-sm font-medium">{Math.abs(growth)}%</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">View your platform analytics and insights</p>
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button onClick={fetchAnalytics} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">View your platform analytics and insights</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.totalProducts)}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {analytics.activeProducts} active (
                {analytics.totalProducts > 0
                  ? Math.round((analytics.activeProducts / analytics.totalProducts) * 100)
                  : 0}
                %)
              </p>
              <GrowthIndicator growth={analytics.recentGrowth.products} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.totalOrders)}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">{analytics.pendingOrders} pending</p>
              <GrowthIndicator growth={analytics.recentGrowth.orders} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalRevenue)}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">From {analytics.totalOrders} orders</p>
              <GrowthIndicator growth={analytics.recentGrowth.revenue} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.averageOrderValue)}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">{analytics.completedOrders} completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue and Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Overview</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-2">From {analytics.totalOrders} orders</p>
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">
                Average Order Value: {formatCurrency(analytics.averageOrderValue)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Store Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Products</span>
              <div className="flex items-center space-x-2">
                <Badge variant="default">{analytics.activeProducts}</Badge>
                <span className="text-sm text-muted-foreground">
                  of {analytics.totalProducts} (
                  {analytics.totalProducts > 0
                    ? Math.round((analytics.activeProducts / analytics.totalProducts) * 100)
                    : 0}
                  %)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Orders</span>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{analytics.pendingOrders}</Badge>
                <span className="text-sm text-muted-foreground">
                  of {analytics.totalOrders} (
                  {analytics.totalOrders > 0 ? Math.round((analytics.pendingOrders / analytics.totalOrders) * 100) : 0}
                  %)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Completed Orders</span>
              <div className="flex items-center space-x-2">
                <Badge variant="default">{analytics.completedOrders}</Badge>
                <span className="text-sm text-muted-foreground">
                  of {analytics.totalOrders} (
                  {analytics.totalOrders > 0 ? Math.round((analytics.completedOrders / analytics.totalOrders) * 100) : 0}
                  %)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Revenue Growth</span>
              <div className="flex items-center space-x-2">
                <GrowthIndicator growth={analytics.recentGrowth.revenue} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Summary */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Growth Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-card rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analytics.recentGrowth.products}%</div>
              <div className="text-sm text-muted-foreground">Product Growth</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analytics.recentGrowth.orders}%</div>
              <div className="text-sm text-muted-foreground">Order Growth</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.recentGrowth.revenue}%</div>
              <div className="text-sm text-muted-foreground">Revenue Growth</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
