"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  BarChart3,
  Store,
  Package,
  Layers,
  ShoppingCart,
  DollarSign,
  Users,
  Settings,
  FileText,
  CreditCard,
  X,
  Menu,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Shops", href: "/dashboard/shops", icon: Store },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Categories", href: "/dashboard/categories", icon: Layers },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
];

const userNavigation = [
  { name: "Users List", href: "/dashboard/users", icon: Users },
];

const settingsNavigation = [
  { name: "Account Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Licenses", href: "/dashboard/licenses", icon: FileText },
  { name: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard },
];

export function DashboardSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // إحصائيات الأرقام
  const [counts, setCounts] = useState({
    analytics: 0,
    products: 0,
    orders: 0,
    revenue: 0,
    users: 0,
    licenses: 0,
    subscriptions: 0,
  });

  useEffect(() => {
    async function fetchCounts() {
      // جلب الأرقام من قاعدة البيانات (Supabase)
      const [
        { count: analytics = 0 },
        { count: products = 0 },
        { count: orders = 0 },
        { count: revenue = 0 },
        { count: users = 0 },
        { count: licenses = 0 },
        { count: subscriptions = 0 },
      ] = await Promise.all([
        supabase.from("analytics").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("revenue").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("licenses").select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        analytics: analytics || 0,
        products: products || 0,
        orders: orders || 0,
        revenue: revenue || 0,
        users: users || 0,
        licenses: licenses || 0,
        subscriptions: subscriptions || 0,
      });
    }
    fetchCounts();
  }, []);

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          sidebarOpen ? "block" : "hidden"
        )}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Bazar
              </span>
            </div>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <SidebarContent pathname={pathname} counts={counts} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Bazar Dashboard
              </span>
            </div>
          </div>
          <SidebarContent pathname={pathname} counts={counts} />
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-white p-2 rounded-md shadow-md"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}

function SidebarContent({
  pathname,
  counts,
}: {
  pathname: string;
  counts: any;
}) {
  const {
    analytics,
    products,
    orders,
    revenue,
    users,
    licenses,
    subscriptions,
  } = counts;

  return (
    <div className="flex flex-col flex-grow overflow-y-auto">
      <nav className="flex-1 px-4 py-4 space-y-8">
        {/* Main Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            MAIN
          </h3>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-blue-700"
                        : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.name}
                  {item.name === "Analytics" && analytics > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {analytics}
                    </span>
                  )}
                  {item.name === "Products" && products > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {products}
                    </span>
                  )}
                  {item.name === "Orders" && orders > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {orders}
                    </span>
                  )}
                  {item.name === "Revenue" && revenue > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {revenue}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Users Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            USERS
          </h3>
          <div className="space-y-1">
            {userNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-blue-700"
                        : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.name}
                  <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {users}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Settings Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            SETTINGS
          </h3>
          <div className="space-y-1">
            {settingsNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-blue-700"
                        : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.name}
                  {item.name === "Licenses" && licenses > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {licenses}
                    </span>
                  )}
                  {item.name === "Subscriptions" && subscriptions > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {subscriptions}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
