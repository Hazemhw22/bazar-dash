"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { TrendingUp, TrendingDown, Users, ShoppingCart, Package, Store, DollarSign, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AnalyticsData {
  totalUsers: number
  totalShops: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  activeShops: number
  activeProducts: number
  pendingOrders: number
  recentGrowth: {
    users: number
    shops: number
    products: number
    orders: number
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

      // Get total counts
      const [usersResult, shopsResult, productsResult, ordersResult] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("shops").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
      ])

      // Get active counts
      const [activeShopsResult, activeProductsResult, pendingOrdersResult] = await Promise.all([
        supabase.from("shops").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ])

      // Get total revenue
      const { data: ordersData } = await supabase.from("orders").select("total_amount")

      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      // Get recent growth (last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const [recentUsersResult, recentShopsResult, recentProductsResult, recentOrdersResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("shops")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ])

      const [previousUsersResult, previousShopsResult, previousProductsResult, previousOrdersResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sixtyDaysAgo.toISOString())
            .lt("created_at", thirtyDaysAgo.toISOString()),
          supabase
            .from("shops")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sixtyDaysAgo.toISOString())
            .lt("created_at", thirtyDaysAgo.toISOString()),
          supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sixtyDaysAgo.toISOString())
            .lt("created_at", thirtyDaysAgo.toISOString()),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sixtyDaysAgo.toISOString())
            .lt("created_at", thirtyDaysAgo.toISOString()),
        ])

      // Calculate growth percentages
      const calculateGrowth = (recent: number, previous: number) => {
        if (previous === 0) return recent > 0 ? 100 : 0
        return Math.round(((recent - previous) / previous) * 100)
      }

      const analyticsData: AnalyticsData = {
        totalUsers: usersResult.count || 0,
        totalShops: shopsResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalRevenue,
        activeShops: activeShopsResult.count || 0,
        activeProducts: activeProductsResult.count || 0,
        pendingOrders: pendingOrdersResult.count || 0,
        recentGrowth: {
          users: calculateGrowth(recentUsersResult.count || 0, previousUsersResult.count || 0),
          shops: calculateGrowth(recentShopsResult.count || 0, previousShopsResult.count || 0),
          products: calculateGrowth(recentProductsResult.count || 0, previousProductsResult.count || 0),
          orders: calculateGrowth(recentOrdersResult.count || 0, previousOrdersResult.count || 0),
        },
      }

      setAnalytics(analyticsData)
      console.log("Analytics data:", analyticsData)
    } catch (error) {
      console.error("Error fetching analytics:", error)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">View your platform analytics and insights</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">View your platform analytics and insights</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.totalUsers)}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">Last 30 days</p>
              <GrowthIndicator growth={analytics.recentGrowth.users} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.totalShops)}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {analytics.activeShops} active ({Math.round((analytics.activeShops / analytics.totalShops) * 100)}%)
              </p>
              <GrowthIndicator growth={analytics.recentGrowth.shops} />
            </div>
          </CardContent>
        </Card>

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
      </div>

      {/* Revenue and Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-2">From {analytics.totalOrders} orders</p>
            <div className="mt-4">
              <div className="text-sm text-gray-600">
                Average Order Value:{" "}
                {formatCurrency(analytics.totalOrders > 0 ? analytics.totalRevenue / analytics.totalOrders : 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Shops</span>
              <div className="flex items-center space-x-2">
                <Badge variant="default">{analytics.activeShops}</Badge>
                <span className="text-sm text-gray-500">
                  of {analytics.totalShops} (
                  {analytics.totalShops > 0 ? Math.round((analytics.activeShops / analytics.totalShops) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Active Products</span>
              <div className="flex items-center space-x-2">
                <Badge variant="default">{analytics.activeProducts}</Badge>
                <span className="text-sm text-gray-500">
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
                <span className="text-sm text-gray-500">
                  of {analytics.totalOrders} (
                  {analytics.totalOrders > 0 ? Math.round((analytics.pendingOrders / analytics.totalOrders) * 100) : 0}
                  %)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Total Users</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{analytics.totalUsers}</Badge>
                <GrowthIndicator growth={analytics.recentGrowth.users} />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics.recentGrowth.users}%</div>
              <div className="text-sm text-gray-600">User Growth</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.recentGrowth.shops}%</div>
              <div className="text-sm text-gray-600">Shop Growth</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analytics.recentGrowth.products}%</div>
              <div className="text-sm text-gray-600">Product Growth</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analytics.recentGrowth.orders}%</div>
              <div className="text-sm text-gray-600">Order Growth</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
