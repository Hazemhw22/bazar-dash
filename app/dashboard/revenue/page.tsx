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

      // Get all orders with payment status 'paid'
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("Orders error:", ordersError)
        throw ordersError
      }

      if (!ordersData || ordersData.length === 0) {
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

      const revenueByPaymentMethod = Object.entries(paymentMethods).map(([method, data]) => ({
        method: method.replace("_", " ").toUpperCase(),
        revenue: data.revenue,
        count: data.count,
      }))

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

      setRevenue(revenueData)
      console.log("Revenue data:", revenueData)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
            <p className="text-gray-600">Track your revenue and financial performance</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading revenue data</h3>
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
    )
  }

  if (!revenue) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No revenue data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-gray-600">Track your revenue and financial performance</p>
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
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Average Order Value</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenue.averageOrderValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                    <p className="text-sm text-gray-500">{method.count} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(method.revenue)}</p>
                    <p className="text-sm text-gray-500">
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
                  <p className="text-sm text-gray-500">{month.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(month.revenue)}</p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
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
