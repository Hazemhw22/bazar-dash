"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { DollarSign, TrendingUp, TrendingDown, Calendar, AlertCircle } from "lucide-react"

interface RevenueData {
  totalRevenue: number
  monthlyRevenue: number
  weeklyRevenue: number
  dailyRevenue: number
  totalOrders: number
  averageOrderValue: number
  monthlyGrowth: number
  weeklyGrowth: number
  revenueByMonth: Array<{
    month: string
    revenue: number
    orders: number
  }>
  revenueByPaymentMethod: Array<{
    method: string
    revenue: number
    count: number
  }>
}

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("all")

  useEffect(() => {
    fetchRevenue()
  }, [timeRange])

  const fetchRevenue = async () => {
    try {
      setError(null)
      setLoading(true)
      console.log("Fetching revenue data...")

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
        // Admin: fetch all revenue/orders
        // Get all order items
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select(`
            order_id,
            total_price,
            orders (
              id,
              total_amount,
              payment_status,
              payment_method,
              created_at
            )
          `);
        if (orderItemsError) {
          console.error("Order items error:", orderItemsError);
          throw orderItemsError;
        }
        // Get all orders
        const { data: ordersData } = await supabase
        .from("orders")
          .select("*", { count: "exact", head: false });
        // Calculate unique paid orders
        const uniqueOrders = new Map();
        orderItemsData?.forEach((item: any) => {
          const order = item.orders;
          if (order && order.payment_status === "paid" && !uniqueOrders.has(order.id)) {
            uniqueOrders.set(order.id, order);
          }
        });
        const ordersArr = Array.from(uniqueOrders.values()) as any[];
        // Calculate revenue totals
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const startOfPreviousWeek = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        // Filter orders by time ranges
        const monthlyOrders = ordersArr.filter((order) => new Date(order.created_at) >= startOfMonth);
        const weeklyOrders = ordersArr.filter((order) => new Date(order.created_at) >= startOfWeek);
        const dailyOrders = ordersArr.filter((order) => new Date(order.created_at) >= startOfDay);
        const previousMonthOrders = ordersArr.filter(
          (order) =>
            new Date(order.created_at) >= startOfPreviousMonth && new Date(order.created_at) <= endOfPreviousMonth,
        );
        const previousWeekOrders = ordersArr.filter(
          (order) => new Date(order.created_at) >= startOfPreviousWeek && new Date(order.created_at) < startOfWeek,
        );
        // Calculate revenue totals
        const totalRevenue = ordersArr.reduce((sum, order) => sum + order.total_amount, 0);
        const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total_amount, 0);
        const weeklyRevenue = weeklyOrders.reduce((sum, order) => sum + order.total_amount, 0);
        const dailyRevenue = dailyOrders.reduce((sum, order) => sum + order.total_amount, 0);
        const previousMonthRevenue = previousMonthOrders.reduce((sum, order) => sum + order.total_amount, 0);
        const previousWeekRevenue = previousWeekOrders.reduce((sum, order) => sum + order.total_amount, 0);
        // Calculate growth percentages
        const monthlyGrowth =
          previousMonthRevenue > 0
            ? Math.round(((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
            : 0;
        const weeklyGrowth =
          previousWeekRevenue > 0 ? Math.round(((weeklyRevenue - previousWeekRevenue) / previousWeekRevenue) * 100) : 0;
        // Calculate average order value
        const averageOrderValue = ordersArr.length > 0 ? totalRevenue / ordersArr.length : 0;
        // Group revenue by month (last 12 months)
        const revenueByMonth: Array<{ month: string; revenue: number; orders: number }> = [];
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          const monthOrders = ordersArr.filter(
            (order) => new Date(order.created_at) >= monthStart && new Date(order.created_at) <= monthEnd,
          );
          revenueByMonth.push({
            month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            revenue: monthOrders.reduce((sum, order) => sum + order.total_amount, 0),
            orders: monthOrders.length,
          });
        }
        // Group revenue by payment method
        const paymentMethods = ordersArr.reduce(
          (acc, order) => {
            const method = order.payment_method;
            if (!acc[method]) {
              acc[method] = { revenue: 0, count: 0 };
            }
            acc[method].revenue += order.total_amount;
            acc[method].count += 1;
            return acc;
          },
          {} as Record<string, { revenue: number; count: number }>,
        );
        const revenueByPaymentMethod = Object.entries(paymentMethods).map(([method, data]) => {
          const d = data as { revenue: number; count: number };
          return {
            method: method.replace("_", " ").toUpperCase(),
            revenue: d.revenue,
            count: d.count,
          };
        });
        const revenueData = {
          totalRevenue,
          monthlyRevenue,
          weeklyRevenue,
          dailyRevenue,
          totalOrders: ordersArr.length,
          averageOrderValue,
          monthlyGrowth,
          weeklyGrowth,
          revenueByMonth,
          revenueByPaymentMethod,
        };
        setRevenue(revenueData);
        setLoading(false);
        return;
      }

      if (role === "vendor") {
        // Vendor: current logic (store-specific)
        // Get current user and their store
        const { data: storeData } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!storeData) {
          setError("No store found for this user");
          return;
        }

        // Get products from this store
        const { data: storeProducts } = await supabase
          .from("products")
          .select("id")
          .eq("shop_id", storeData.id);

        const storeProductIds = storeProducts?.map(p => p.id) || [];

        if (storeProductIds.length === 0) {
          setRevenue({
            totalRevenue: 0,
            monthlyRevenue: 0,
            weeklyRevenue: 0,
            dailyRevenue: 0,
            totalOrders: 0,
            averageOrderValue: 0,
            monthlyGrowth: 0,
            weeklyGrowth: 0,
            revenueByMonth: [],
            revenueByPaymentMethod: [],
          })
          return
        }

        // Get order items for this store's products
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select(`
            order_id,
            total_price,
            orders (
              id,
              total_amount,
              payment_status,
              payment_method,
              created_at
            )
          `)
          .in("product_id", storeProductIds);

        if (orderItemsError) {
          console.error("Order items error:", orderItemsError)
          throw orderItemsError
        }

        if (!orderItemsData || orderItemsData.length === 0) {
        setRevenue({
          totalRevenue: 0,
          monthlyRevenue: 0,
          weeklyRevenue: 0,
          dailyRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          monthlyGrowth: 0,
          weeklyGrowth: 0,
          revenueByMonth: [],
          revenueByPaymentMethod: [],
        })
        return
      }

        // Get unique orders with payment status 'paid'
        const uniqueOrders = new Map();
        orderItemsData.forEach((item: any) => {
          const order = item.orders;
          if (order && order.payment_status === "paid" && !uniqueOrders.has(order.id)) {
            uniqueOrders.set(order.id, order);
          }
        });

        const ordersData = Array.from(uniqueOrders.values()) as any[];

      // Calculate date ranges
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const startOfPreviousWeek = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Filter orders by time ranges
      const monthlyOrders = ordersData.filter((order) => new Date(order.created_at) >= startOfMonth)
      const weeklyOrders = ordersData.filter((order) => new Date(order.created_at) >= startOfWeek)
      const dailyOrders = ordersData.filter((order) => new Date(order.created_at) >= startOfDay)
      const previousMonthOrders = ordersData.filter(
        (order) =>
          new Date(order.created_at) >= startOfPreviousMonth && new Date(order.created_at) <= endOfPreviousMonth,
      )
      const previousWeekOrders = ordersData.filter(
        (order) => new Date(order.created_at) >= startOfPreviousWeek && new Date(order.created_at) < startOfWeek,
      )

      // Calculate revenue totals
      const totalRevenue = ordersData.reduce((sum, order) => sum + order.total_amount, 0)
      const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total_amount, 0)
      const weeklyRevenue = weeklyOrders.reduce((sum, order) => sum + order.total_amount, 0)
      const dailyRevenue = dailyOrders.reduce((sum, order) => sum + order.total_amount, 0)
      const previousMonthRevenue = previousMonthOrders.reduce((sum, order) => sum + order.total_amount, 0)
      const previousWeekRevenue = previousWeekOrders.reduce((sum, order) => sum + order.total_amount, 0)

      // Calculate growth percentages
      const monthlyGrowth =
        previousMonthRevenue > 0
          ? Math.round(((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
          : 0
      const weeklyGrowth =
        previousWeekRevenue > 0 ? Math.round(((weeklyRevenue - previousWeekRevenue) / previousWeekRevenue) * 100) : 0

      // Calculate average order value
      const averageOrderValue = ordersData.length > 0 ? totalRevenue / ordersData.length : 0

      // Group revenue by month (last 12 months)
      const revenueByMonth: Array<{ month: string; revenue: number; orders: number }> = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const monthOrders = ordersData.filter(
          (order) => new Date(order.created_at) >= monthStart && new Date(order.created_at) <= monthEnd,
        )

        revenueByMonth.push({
          month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          revenue: monthOrders.reduce((sum, order) => sum + order.total_amount, 0),
          orders: monthOrders.length,
        })
      }

      // Group revenue by payment method
      const paymentMethods = ordersData.reduce(
        (acc, order) => {
          const method = order.payment_method
          if (!acc[method]) {
            acc[method] = { revenue: 0, count: 0 }
          }
          acc[method].revenue += order.total_amount
          acc[method].count += 1
          return acc
        },
        {} as Record<string, { revenue: number; count: number }>,
      )

        const revenueByPaymentMethod = Object.entries(paymentMethods).map(([method, data]) => {
          const d = data as { revenue: number; count: number };
          return {
        method: method.replace("_", " ").toUpperCase(),
            revenue: d.revenue,
            count: d.count,
          };
        })

      const revenueData: RevenueData = {
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        dailyRevenue,
        totalOrders: ordersData.length,
        averageOrderValue,
        monthlyGrowth,
        weeklyGrowth,
        revenueByMonth,
        revenueByPaymentMethod,
      }
        setRevenue(revenueData);
        setLoading(false);
        return;
      } else {
        // Customer/other: show friendly message
        setRevenue(null);
        setError("No revenue available for your account.");
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error fetching revenue:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setLoading(false)
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
            <p className="text-muted-foreground">View your revenue statistics</p>
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading revenue</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button onClick={fetchRevenue} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!revenue) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No revenue data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
          <p className="text-muted-foreground">View your revenue statistics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="day">Today</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchRevenue} variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(revenue.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From {revenue.totalOrders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue.monthlyRevenue)}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">vs last month</p>
              <GrowthIndicator growth={revenue.monthlyGrowth} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue.weeklyRevenue)}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">vs last week</p>
              <GrowthIndicator growth={revenue.weeklyGrowth} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue.dailyRevenue)}</div>
            <p className="text-xs text-muted-foreground">Today's earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-lg">
              <div>
                <p className="text-sm font-medium">Average Order Value</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenue.averageOrderValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-card rounded-lg">
              <div>
                <p className="text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-purple-600">{formatNumber(revenue.totalOrders)}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Monthly Growth</p>
                <p className="text-xl font-bold text-green-700">{revenue.monthlyGrowth}%</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Weekly Growth</p>
                <p className="text-xl font-bold text-blue-700">{revenue.weeklyGrowth}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenue.revenueByPaymentMethod.map((method, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{method.method}</p>
                    <p className="text-sm text-muted-foreground">{method.count} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(method.revenue)}</p>
                    <p className="text-sm text-muted-foreground">
                      {((method.revenue / revenue.totalRevenue) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenue.revenueByMonth.map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 border-b">
                <div>
                  <p className="font-medium">{month.month}</p>
                  <p className="text-sm text-muted-foreground">{month.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(month.revenue)}</p>
                  <div className="w-32 bg-border rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.max((month.revenue / Math.max(...revenue.revenueByMonth.map((m) => m.revenue))) * 100, 5)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
