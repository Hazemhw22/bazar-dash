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
import type { Order, OrderStatus } from "@/types/database";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";

interface OrderWithDetails extends Order {
  customer_name?: string;
  items_count?: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log("Fetching orders...");

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
        // Admin: fetch all orders
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(`*, profiles!orders_customer_id_fkey(full_name, email)`)
          .order("created_at", { ascending: false });
        if (ordersError) {
          console.error("Orders query failed:", ordersError);
          throw ordersError;
        }
        const ordersWithDetails = ordersData?.map((order) => ({
          ...order,
          customer_name:
            (order.profiles?.[0]?.full_name || order.profiles?.[0]?.email) ??
            "Unknown Customer",
          items_count: order.items_count || 0,
        })) || [];
        setOrders(ordersWithDetails);
        setLoading(false);
        return;
      }

      if (role === "vendor") {
        // Vendor: current logic (store-specific)
        // Get user's store
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
        // Get products from this store
        const { data: storeProducts } = await supabase
          .from("products")
          .select("id")
          .eq("shop_id", storeData.id);
        const storeProductIds = storeProducts?.map((p) => p.id) || [];
        if (storeProductIds.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }
        // Get order items for this store's products
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select(`
            order_id,
            orders (
              id,
              customer_id,
              status,
              total_amount,
              payment_status,
              created_at,
              updated_at,
              tracking_number,
              notes,
              profiles!orders_customer_id_fkey(full_name, email)
            )
          `)
          .in("product_id", storeProductIds);
        if (orderItemsError) {
          console.error("Order items error:", orderItemsError);
          throw orderItemsError;
        }
        // Get unique orders and their details
        const uniqueOrders = new Map();
        orderItemsData.forEach((item: any) => {
          const order = item.orders;
          if (order && !uniqueOrders.has(order.id)) {
            uniqueOrders.set(order.id, order);
          }
        });
        const ordersWithDetails = await Promise.all(
          Array.from(uniqueOrders.values()).map(async (order: any) => {
            try {
              // Get items count for this store's products in this order
              const { count } = await supabase
                .from("order_items")
                .select("*", { count: "exact", head: true })
                .eq("order_id", order.id)
                .in("product_id", storeProductIds);
              // Get customer name/email
              let customer_name = "Unknown Customer";
              if (order.customer_id) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name, email")
                  .eq("id", order.customer_id)
                  .single();
                customer_name =
                  profile?.full_name || profile?.email || "Unknown Customer";
              }
              return {
                ...order,
                customer_name,
                items_count: count || 0,
              };
            } catch (error) {
              console.error(`Error processing order ${order.id}:`, error);
              return {
                ...order,
                customer_name: "Unknown Customer",
                items_count: 0,
              };
            }
          })
        );
        ordersWithDetails.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setOrders(ordersWithDetails);
        setLoading(false);
        return;
      }

      // Customer/other: show friendly message
      setOrders([]);
      setError("No orders available for your account.");
      setLoading(false);
      return;
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // تحديث الحالة محلياً
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      alert("Order status updated successfully!");
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Error updating order status");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this order? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;

      // إزالة الطلب من القائمة محلياً
      setOrders((prev) => prev.filter((order) => order.id !== orderId));

      alert("Order deleted successfully!");
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error deleting order");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      pending: {
        variant: "secondary" as const,
        color: "bg-yellow-100 text-yellow-800",
      },
      processing: {
        variant: "default" as const,
        color: "bg-blue-100 text-blue-800",
      },
      shipped: {
        variant: "default" as const,
        color: "bg-purple-100 text-purple-800",
      },
      delivered: {
        variant: "default" as const,
        color: "bg-green-100 text-green-800",
      },
      cancelled: {
        variant: "secondary" as const,
        color: "bg-red-100 text-red-800",
      },
      returned: {
        variant: "secondary" as const,
        color: "bg-gray-100 text-gray-800",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Badge className={config.color + " hover:" + config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

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
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground">Manage your orders</p>
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading orders
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button onClick={fetchOrders} variant="outline" size="sm">
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
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage your orders</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">{filteredOrders.length} orders</Badge>
          
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search orders..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="bg-background rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">#{order.id.slice(0, 8)}</div>
                    {order.tracking_number && (
                      <div className="text-sm text-muted-foreground">
                        Track: {order.tracking_number}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.shipping_address.full_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{order.items_count} items</Badge>
                </TableCell>
                <TableCell>
                  <div className="font-semibold">
                    ${order.total_amount.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell>
                  <div>
                    <div className="text-sm">
                      {order.payment_method.replace("_", " ").toUpperCase()}
                    </div>
                    <Badge
                      variant={
                        order.payment_status === "paid"
                          ? "default"
                          : "secondary"
                      }
                      className={
                        order.payment_status === "paid"
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : order.payment_status === "failed"
                          ? "bg-red-100 text-red-800 hover:bg-red-100"
                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                      }
                    >
                      {order.payment_status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{formatDate(order.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        updateOrderStatus(order.id, value as OrderStatus)
                      }
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOrder(order.id)}
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

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No orders found
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Orders will appear here when customers place them"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredOrders.length} of {orders.length} orders
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
