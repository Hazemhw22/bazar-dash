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
  User,
  Settings,
  FileText,
  CreditCard,
  X,
  Menu,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const adminMainNavigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Homepage Control", href: "/dashboard/homepage", icon: Home },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Shops", href: "/dashboard/shops", icon: Store },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Categories", href: "/dashboard/categories", icon: Layers },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
];

const adminUsersNavigation = [
  { name: "Users List", href: "/dashboard/users", icon: Users },
];

const adminSettingsNavigation = [
  { name: "ADMIN Settings", href: "/dashboard/settings/admin", icon: Settings },
  { name: "Admin Management", href: "/dashboard/admin-management", icon: Shield },
  { name: "Licenses", href: "/dashboard/licenses", icon: FileText },
  { name: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard },
];

const customerNavigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Homepage Control", href: "/dashboard/homepage", icon: Home },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Shops", href: "/dashboard/shops", icon: Store },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Categories", href: "/dashboard/categories", icon: Layers },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
];

const vendorNavigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Homepage Control", href: "/dashboard/homepage", icon: Home },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Categories", href: "/dashboard/categories", icon: Layers },
  { name: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
];

const vendorSettingsNavigation = [
  { name: "Store Settings", href: "/dashboard/settings/vendor", icon: Settings },
];

const customerSettingsNavigation = [
  { name: "Account Settings", href: "/dashboard/settings/customer", icon: Settings },
];

export function DashboardSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("customer");
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
    async function fetchUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          
          if (profile?.role) {
            setUserRole(profile.role);
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    }

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

    fetchUserRole();
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
        <div className="fixed inset-y-0 left-0 flex w-72 sm:w-80 flex-col bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-r border-blue-200 dark:border-gray-700 shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-blue-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                <img src="/pazar.png" alt="BAZAR Logo" className="w-12 h-12 sm:w-14 sm:h-14 rounded" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">PAZAR</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors">
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
          <SidebarContent pathname={pathname} counts={counts} userRole={userRole} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 text-gray-800 dark:text-gray-200 border-r border-blue-200 dark:border-gray-700 shadow-lg">
          <div className="flex h-18 items-center px-4 border-b border-blue-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-300 dark:bg-blue-900/50 rounded-full p-0.2">
                <img src="/pazar.png" alt="BAZAR Logo" className="w-20 h-20 rounded" />
              </div>
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">PAZAR</span>
            </div>
          </div>
          <SidebarContent pathname={pathname} counts={counts} userRole={userRole} />
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-3 left-3 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-card p-2 rounded-md shadow-md text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}

function SidebarContent({
  pathname,
  counts,
  userRole,
}: {
  pathname: string;
  counts: any;
  userRole: string;
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

  // Determine which navigation to show based on user role
  let mainNavigation: any[] = [];
  let usersNavigation: any[] = [];
  let settingsNavigation: any[] = [];

  if (userRole === "admin") {
    mainNavigation = adminMainNavigation;
    usersNavigation = adminUsersNavigation;
    settingsNavigation = adminSettingsNavigation;
  } else if (userRole === "vendor") {
    mainNavigation = vendorNavigation;
    settingsNavigation = vendorSettingsNavigation;
  } else {
    // Default to customer navigation
    mainNavigation = customerNavigation;
    settingsNavigation = customerSettingsNavigation;
  }

  return (
    <div className="flex flex-col flex-grow overflow-y-auto">
      <nav className="flex-1 px-4 py-4 space-y-8">
        {/* Main Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
            MAIN
          </h3>
          <div className="space-y-1">
            {mainNavigation.map((item: any) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-r-2 border-blue-500 dark:border-blue-400 shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"
                    )}
                  />
                  {item.name}
                  {item.name === "Analytics" && analytics > 0 && (
                    <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                      {analytics}
                    </span>
                  )}
                  {item.name === "Products" && products > 0 && (
                    <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                      {products}
                    </span>
                  )}
                  {item.name === "Orders" && orders > 0 && (
                    <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                      {orders}
                    </span>
                  )}
                  {item.name === "Revenue" && revenue > 0 && (
                    <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                      {revenue}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Users Navigation (Admin Only) */}
        {userRole === "admin" && usersNavigation.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
            USERS
          </h3>
          <div className="space-y-1">
              {usersNavigation.map((item: any) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-r-2 border-blue-500 dark:border-blue-400 shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"
                    )}
                  />
                  {item.name}
                    {item.name === "Users List" && users > 0 && (
                  <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                    {users}
                  </span>
                    )}
                </Link>
              );
            })}
          </div>
        </div>
        )}

        {/* Settings Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
            SETTINGS
          </h3>
          <div className="space-y-1">
            {settingsNavigation.map((item: any) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-r-2 border-blue-500 dark:border-blue-400 shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"
                    )}
                  />
                  {item.name}
                  {item.name === "Licenses" && licenses > 0 && (
                    <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                      {licenses}
                    </span>
                  )}
                  {item.name === "Subscriptions" && subscriptions > 0 && (
                    <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
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
