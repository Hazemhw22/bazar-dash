import { supabase } from "./supabase";

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read?: boolean;
  created_at: string;
}

// Function to check and create notifications table if it doesn't exist
export const ensureNotificationsTable = async (): Promise<boolean> => {
  try {
    // Try to create the table using SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.notifications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Add is_read column to existing table if it doesn't exist
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'notifications' 
                AND column_name = 'is_read'
                AND table_schema = 'public'
            ) THEN
                ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE NOT NULL;
            END IF;
        END $$;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
        
        -- Enable Row Level Security (RLS)
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies (drop if exists first)
        DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
        DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
        DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
        DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
        
        CREATE POLICY "Users can view their own notifications" ON public.notifications
          FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own notifications" ON public.notifications
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own notifications" ON public.notifications
          FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own notifications" ON public.notifications
          FOR DELETE USING (auth.uid() = user_id);
        
        -- Grant permissions
        GRANT ALL ON public.notifications TO authenticated;
        GRANT USAGE ON SCHEMA public TO authenticated;
      `
    });

    if (error) {
      console.error("Error creating table:", error);
      return false;
    }

    console.log("Notifications table ensured successfully");
    return true;
  } catch (error) {
    console.error("Error ensuring notifications table:", error);
    return false;
  }
};

export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      // If table doesn't exist, try to create it
      if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
        console.log("Table doesn't exist, attempting to create...");
        await ensureNotificationsTable();
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
};

export const createNotification = async (notification: {
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
}): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.id) {
      console.error("No authenticated user found or invalid user ID");
      return;
    }

    // Validate user ID is a proper UUID
    if (!user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error("Invalid user ID format:", user.id);
      return;
    }

    console.log("Creating notification for user:", user.id);
    console.log("Notification data:", {
      user_id: user.id,
      message: `${notification.title}: ${notification.message}`,
    });

    // First, let's test if the table exists by trying to select from it
    const { data: testData, error: testError } = await supabase
      .from("notifications")
      .select("id")
      .limit(1);

    console.log("Table test result:", { testData, testError });

    if (testError) {
      console.error("Table test failed:", testError);
      console.error("Error details:", {
        message: testError.message,
        details: testError.details,
        hint: testError.hint,
        code: testError.code
      });
      
      // If table doesn't exist, try to create it
      if (testError.message?.includes("relation") || testError.message?.includes("does not exist")) {
        console.log("Table doesn't exist, attempting to create...");
        const tableCreated = await ensureNotificationsTable();
        if (!tableCreated) {
          throw new Error("Failed to create notifications table");
        }
        // Try the insert again after creating the table
        console.log("Table created, retrying insert...");
      } else {
        throw testError;
      }
    }

    const { data, error } = await supabase.from("notifications").insert([
      {
        user_id: user.id,
        message: `${notification.title}: ${notification.message}`,
        is_read: false,
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log("Notification created successfully:", data);
  } catch (error) {
    console.error("Error creating notification:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    // Also log the raw error object
    console.error("Raw error object:", JSON.stringify(error, null, 2));
  }
};

export const NotificationTemplates = {
  // Authentication
  signUpSuccess: (email: string) => ({
    title: "Account Created",
    message: `Account created successfully for ${email}. Please check your email to verify.`,
    type: "success" as const,
  }),

  signInSuccess: (userName: string) => ({
    title: "Welcome Back",
    message: `Welcome back, ${userName}! You've been successfully logged in.`,
    type: "success" as const,
  }),

  signOutSuccess: () => ({
    title: "Signed Out",
    message: "You have been successfully signed out.",
    type: "info" as const,
  }),

  // Shop Management
  shopCreated: (shopName: string) => ({
    title: "Shop Created",
    message: `Shop "${shopName}" has been created successfully.`,
    type: "success" as const,
  }),

  shopUpdated: (shopName: string) => ({
    title: "Shop Updated",
    message: `Shop "${shopName}" has been updated successfully.`,
    type: "success" as const,
  }),

  shopDeleted: (shopName: string) => ({
    title: "Shop Deleted",
    message: `Shop "${shopName}" has been deleted.`,
    type: "warning" as const,
  }),

  // Product Management
  productCreated: (productName: string) => ({
    title: "Product Added",
    message: `Product "${productName}" has been added to your inventory.`,
    type: "success" as const,
  }),

  productUpdated: (productName: string) => ({
    title: "Product Updated",
    message: `Product "${productName}" has been updated successfully.`,
    type: "success" as const,
  }),

  productDeleted: (productName: string) => ({
    title: "Product Deleted",
    message: `Product "${productName}" has been removed from inventory.`,
    type: "warning" as const,
  }),

  // Category Management
  categoryCreated: (categoryName: string) => ({
    title: "Category Created",
    message: `Category "${categoryName}" has been created successfully.`,
    type: "success" as const,
  }),

  categoryUpdated: (categoryName: string) => ({
    title: "Category Updated",
    message: `Category "${categoryName}" has been updated successfully.`,
    type: "success" as const,
  }),

  categoryDeleted: (categoryName: string) => ({
    title: "Category Deleted",
    message: `Category "${categoryName}" has been deleted.`,
    type: "warning" as const,
  }),

  // User Management
  userCreated: (userName: string) => ({
    title: "User Created",
    message: `User "${userName}" has been created successfully.`,
    type: "success" as const,
  }),

  userUpdated: (userName: string) => ({
    title: "User Updated",
    message: `User "${userName}" has been updated successfully.`,
    type: "success" as const,
  }),

  userDeleted: (userName: string) => ({
    title: "User Deleted",
    message: `User "${userName}" has been deleted.`,
    type: "warning" as const,
  }),

  // Profile Management
  profileUpdated: (userName: string) => ({
    title: "Profile Updated",
    message: `Profile for "${userName}" has been updated successfully.`,
    type: "success" as const,
  }),

  avatarUploaded: () => ({
    title: "Avatar Updated",
    message: "Your profile picture has been updated successfully.",
    type: "success" as const,
  }),

  // Admin Management
  roleChanged: (userName: string, newRole: string) => ({
    title: "Role Updated",
    message: `User "${userName}" role has been changed to ${newRole}.`,
    type: "info" as const,
  }),

  adminAction: (action: string) => ({
    title: "Admin Action",
    message: `Admin action "${action}" completed successfully.`,
    type: "success" as const,
  }),

  // System Notifications
  systemError: (error: string) => ({
    title: "System Error",
    message: `An error occurred: ${error}`,
    type: "error" as const,
  }),

  systemWarning: (warning: string) => ({
    title: "System Warning",
    message: warning,
    type: "warning" as const,
  }),

  systemInfo: (info: string) => ({
    title: "System Info",
    message: info,
    type: "info" as const,
  }),

  // File Upload
  fileUploadSuccess: (fileName: string) => ({
    title: "File Uploaded",
    message: `File "${fileName}" has been uploaded successfully.`,
    type: "success" as const,
  }),

  fileUploadError: (fileName: string) => ({
    title: "Upload Failed",
    message: `Failed to upload file "${fileName}". Please try again.`,
    type: "error" as const,
  }),

  // Validation Errors
  validationError: (field: string) => ({
    title: "Validation Error",
    message: `Please check the ${field} field and try again.`,
    type: "error" as const,
  }),

  // Authentication Errors
  authError: (error: string) => ({
    title: "Authentication Error",
    message: error,
    type: "error" as const,
  }),

  // Order Management
  orderCreated: (orderId: string) => ({
    title: "Order Created",
    message: `New order #${orderId.slice(0, 8)} has been created successfully.`,
    type: "success" as const,
  }),

  orderUpdated: (orderId: string, status: string) => ({
    title: "Order Updated",
    message: `Order #${orderId.slice(0, 8)} status has been updated to ${status}.`,
    type: "success" as const,
  }),

  orderDeleted: (orderId: string) => ({
    title: "Order Deleted",
    message: `Order #${orderId.slice(0, 8)} has been deleted.`,
    type: "warning" as const,
  }),

  // Homepage Management
  offerCreated: (offerName: string) => ({
    title: "Offer Created",
    message: `Special offer "${offerName}" has been created successfully.`,
    type: "success" as const,
  }),

  offerUpdated: (offerName: string) => ({
    title: "Offer Updated",
    message: `Special offer "${offerName}" has been updated successfully.`,
    type: "success" as const,
  }),

  offerDeleted: (offerName: string) => ({
    title: "Offer Deleted",
    message: `Special offer "${offerName}" has been deleted.`,
    type: "warning" as const,
  }),

  featuredStoreAdded: (storeName: string) => ({
    title: "Store Featured",
    message: `Store "${storeName}" has been added to featured stores.`,
    type: "success" as const,
  }),

  featuredStoreRemoved: (storeName: string) => ({
    title: "Store Unfeatured",
    message: `Store "${storeName}" has been removed from featured stores.`,
    type: "warning" as const,
  }),

  // Product Association
  productsAddedToOffer: (offerName: string, count: number) => ({
    title: "Products Added",
    message: `${count} product(s) have been added to offer "${offerName}".`,
    type: "success" as const,
  }),

  productsRemovedFromOffer: (offerName: string, count: number) => ({
    title: "Products Removed",
    message: `${count} product(s) have been removed from offer "${offerName}".`,
    type: "warning" as const,
  }),

  // Status Changes
  statusActivated: (itemType: string, itemName: string) => ({
    title: `${itemType} Activated`,
    message: `${itemType} "${itemName}" has been activated successfully.`,
    type: "success" as const,
  }),

  statusDeactivated: (itemType: string, itemName: string) => ({
    title: `${itemType} Deactivated`,
    message: `${itemType} "${itemName}" has been deactivated.`,
    type: "warning" as const,
  }),

  // Bulk Operations
  bulkDelete: (itemType: string, count: number) => ({
    title: "Bulk Delete",
    message: `${count} ${itemType}(s) have been deleted successfully.`,
    type: "warning" as const,
  }),

  bulkUpdate: (itemType: string, count: number) => ({
    title: "Bulk Update",
    message: `${count} ${itemType}(s) have been updated successfully.`,
    type: "success" as const,
  }),

  // Import/Export
  importSuccess: (itemType: string, count: number) => ({
    title: "Import Successful",
    message: `${count} ${itemType}(s) have been imported successfully.`,
    type: "success" as const,
  }),

  exportSuccess: (itemType: string, count: number) => ({
    title: "Export Successful",
    message: `${count} ${itemType}(s) have been exported successfully.`,
    type: "success" as const,
  }),

  // Payment & Billing
  paymentSuccess: (amount: number) => ({
    title: "Payment Successful",
    message: `Payment of $${amount.toFixed(2)} has been processed successfully.`,
    type: "success" as const,
  }),

  paymentFailed: (amount: number) => ({
    title: "Payment Failed",
    message: `Payment of $${amount.toFixed(2)} has failed. Please try again.`,
    type: "error" as const,
  }),

  // Inventory Management
  lowStock: (productName: string, quantity: number) => ({
    title: "Low Stock Alert",
    message: `Product "${productName}" is running low on stock (${quantity} remaining).`,
    type: "warning" as const,
  }),

  outOfStock: (productName: string) => ({
    title: "Out of Stock",
    message: `Product "${productName}" is now out of stock.`,
    type: "error" as const,
  }),

  stockUpdated: (productName: string, newQuantity: number) => ({
    title: "Stock Updated",
    message: `Stock for "${productName}" has been updated to ${newQuantity} units.`,
    type: "success" as const,
  }),
};

// Safe notification creation that won't break the application flow
export const safeCreateNotification = async (notification: {
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
}): Promise<void> => {
  try {
    await createNotification(notification);
  } catch (error) {
    console.error("Failed to create notification (non-blocking):", error);
    // Don't throw the error to prevent breaking the main application flow
  }
}; 