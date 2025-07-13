"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { User, Mail, Phone, MapPin, Upload, Save, AlertCircle, Store, Bell } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { useNotifications } from "@/hooks/useNotifications";
import { safeCreateNotification, NotificationTemplates } from "@/lib/notifications";

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone_number: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const { addNotification, notifications, markAsRead, unreadCount } = useNotifications();

  // Form states
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  useEffect(() => {
    checkUserRole()
    getCurrentUser()
    testStorageConnection()
  }, [])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        
        if (profile?.role) {
          setCurrentUserRole(profile.role)
        }
      }
    } catch (error) {
      console.error("Error checking user role:", error)
    }
  }

  const testStorageConnection = async () => {
    try {
      console.log("Testing Supabase client configuration...");
      console.log("Supabase client initialized:", !!supabase);
      
      // Test basic Supabase connection first
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log("Auth test result:", { user: authData.user?.id, error: authError });
      
      if (authError) {
        console.error("Auth test failed:", authError);
        addNotification(NotificationTemplates.systemWarning("Authentication issue. Please sign in again."));
        return;
      }
      
      // Test if we can list files in the bucket (this will fail if bucket doesn't exist or no permissions)
      const { data, error } = await supabase.storage.from("user-avatars").list("", {
        limit: 1
      });
      
      console.log("Storage list result:", { data, error });
      
      if (error) {
        console.error("Storage bucket test failed:", error);
        if (error.message.includes("bucket")) {
          addNotification(NotificationTemplates.systemWarning("Storage bucket 'user-avatars' not found. Please create it in your Supabase dashboard."));
        } else {
                      addNotification(NotificationTemplates.systemWarning("Storage bucket not accessible. Please check bucket permissions."));
        }
      } else {
        console.log("Storage bucket test successful");
      }
    } catch (error) {
      console.error("Storage connection test error:", error);
    }
  };

  const getCurrentUser = async () => {
    try {
      setError(null)
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        console.error("Auth error:", authError)
        setError("Authentication error")
        return
      }

      if (!user) {
        setError("No user found")
        return
      }

      setUser(user)
      setEmail(user.email || "")

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Profile error:", profileError)
        setError("Error loading profile")
        return
      }

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || "")
        setPhoneNumber(profileData.phone_number || "")
        setAddress(profileData.address || "")
        setAvatarUrl(profileData.avatar_url || "")
      }
    } catch (error) {
      console.error("Error getting user:", error)
      setError("Error loading user data")
    }
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      setUploadingAvatar(true);
      
      // Basic validation
      if (!file || file.size === 0) {
        addNotification({ type: "error", title: "Error", message: "Invalid file selected." });
        setUploadingAvatar(false);
        return null;
      }

      if (file.size > 2 * 1024 * 1024) {
        addNotification({ type: "error", title: "Error", message: "File size must be less than 2MB." });
        setUploadingAvatar(false);
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to user-specific folder (required by the policy)
      const userFolder = user?.id || 'unknown';
      const filePath = `${userFolder}/${fileName}`;
      
      console.log("Attempting upload:", filePath);
      
      // Simple upload attempt
      const { data, error } = await supabase.storage
        .from("user-avatars")
        .upload(filePath, file);

      console.log("Upload response:", { data, error });
      
      if (error) {
        console.error("Upload failed:", error);
        addNotification({ type: "error", title: "Error", message: `Upload failed: ${error.message}` });
        setUploadingAvatar(false);
        return null;
      }

      if (!data?.path) {
        console.error("No path returned from upload");
        addNotification({ type: "error", title: "Error", message: "Upload failed: No file path returned" });
        setUploadingAvatar(false);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(data.path);

      console.log("Public URL:", urlData.publicUrl);
      setUploadingAvatar(false);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error("Upload exception:", error);
      addNotification({ type: "error", title: "Error", message: "Upload failed due to network error" });
      setUploadingAvatar(false);
      return null;
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarFile(file);
    // Upload immediately and show preview only if successful
    const uploadedUrl = await uploadAvatar(file);
    if (uploadedUrl) {
      setAvatarUrl(uploadedUrl);
      
      // Update profile in database with the new avatar URL
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            avatar_url: uploadedUrl,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "id"
          });

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }
      
      addNotification({ type: "success", title: "Success", message: "Avatar uploaded successfully!" });
    }
    setUploadingAvatar(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) {
        addNotification({ type: "error", title: "Error", message: "User not authenticated" });
        setLoading(false);
        return;
      }
      let finalAvatarUrl = avatarUrl;
      if (avatarFile && !avatarUrl.startsWith("http")) {
        // If avatarFile is set and avatarUrl is not a remote URL, upload it
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) finalAvatarUrl = uploadedUrl;
      }

      // Update profile in database
      const profileData = {
        id: user.id,
        email: email.trim(),
        full_name: fullName.trim() || null,
        phone_number: phoneNumber.trim() || null,
        address: address.trim() || null,
        avatar_url: finalAvatarUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase.from("profiles").upsert(profileData, {
        onConflict: "id",
      });
      
      if (profileError) {
        addNotification({ type: "error", title: "Error", message: profileError.message || "Error updating profile." });
        setLoading(false);
        return;
      }

      // Update user metadata with full name only (avatar is stored in profiles table)
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim() || null,
        }
      });

      if (metadataError) {
        console.error("Error updating user metadata:", metadataError);
        // Don't fail the entire operation for metadata update errors
      }

      // Create notification for profile update
      await safeCreateNotification(NotificationTemplates.profileUpdated(fullName.trim() || email))

      addNotification({ type: "success", title: "Success", message: "Profile updated successfully!" });
      getCurrentUser();
    } catch (error) {
      addNotification({ type: "error", title: "Error", message: "Error updating profile. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      window.location.href = "/auth/signin"
    } catch (error) {
      console.error("Error signing out:", error)
      alert("Error signing out")
    }
  }

  // Redirect to role-specific settings pages
  if (currentUserRole) {
    if (currentUserRole === "admin") {
      window.location.href = "/dashboard/settings/admin"
      return null
    } else if (currentUserRole === "vendor") {
      window.location.href = "/dashboard/settings/vendor"
      return null
    } else if (currentUserRole === "customer") {
      window.location.href = "/dashboard/settings/customer"
      return null
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account settings</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading settings</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button onClick={getCurrentUser} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
          <p className="text-gray-600">Manage your store information and settings</p>
        </div>
        <Button onClick={signOut} variant="outline">
          Sign Out
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Store Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="pl-10"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed from here</p>
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter your phone number"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your address"
                      rows={3}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Store Logo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl || "/placeholder.svg"} alt="Store Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        <span>{uploadingAvatar ? "Uploading..." : "Upload Photo"}</span>
                      </div>
                      <input
                        id="avatar"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max 2MB)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>User ID:</strong>
                  <p className="text-gray-600 break-all">{user?.id}</p>
                </div>
                <div>
                  <strong>Created:</strong>
                  <p className="text-gray-600">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-GB") : "—"}
                  </p>
                </div>
                <div>
                  <strong>Last Updated:</strong>
                  <p className="text-gray-600">
                    {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString("en-GB") : "—"}
                  </p>
                </div>
                <div>
                  <strong>Last Sign In:</strong>
                  <p className="text-gray-600">
                    {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("en-GB") : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Download Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 bg-transparent"
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" onClick={getCurrentUser}>
            Reset
          </Button>
          <Button type="submit" disabled={loading || uploadingAvatar}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : uploadingAvatar ? "Uploading..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
