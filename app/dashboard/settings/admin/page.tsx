"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { User, Mail, Phone, MapPin, Upload, Save, Shield, Settings, LogOut, AlertCircle, Store, Package, BarChart3 } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { useNotifications } from "@/hooks/useNotifications"
import { UserRole } from "@/types/database"

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone_number: string | null
  address: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)
  const { addNotification } = useNotifications()

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
      setUploadingAvatar(true)
      
      if (!file || file.size === 0) {
        addNotification({ type: "error", title: "Error", message: "Invalid file selected." })
        setUploadingAvatar(false)
        return null
      }

      if (file.size > 2 * 1024 * 1024) {
        addNotification({ type: "error", title: "Error", message: "File size must be less than 2MB." })
        setUploadingAvatar(false)
        return null
      }

      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const userFolder = user?.id || 'unknown'
      const filePath = `${userFolder}/${fileName}`
      
      const { data, error } = await supabase.storage
        .from("user-avatars")
        .upload(filePath, file)

      if (error) {
        console.error("Upload failed:", error)
        addNotification({ type: "error", title: "Error", message: `Upload failed: ${error.message}` })
        setUploadingAvatar(false)
        return null
      }

      if (!data?.path) {
        addNotification({ type: "error", title: "Error", message: "Upload failed: No file path returned" })
        setUploadingAvatar(false)
        return null
      }

      const { data: urlData } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(data.path)

      setUploadingAvatar(false)
      return urlData.publicUrl
      
    } catch (error) {
      console.error("Upload exception:", error)
      addNotification({ type: "error", title: "Error", message: "Upload failed due to network error" })
      setUploadingAvatar(false)
      return null
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarFile(file)
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!user) {
        addNotification({ type: "error", title: "Error", message: "User not authenticated" })
        setLoading(false)
        return
      }

      let finalAvatarUrl = avatarUrl
      if (avatarFile && !avatarUrl.startsWith("http")) {
        const uploadedUrl = await uploadAvatar(avatarFile)
        if (uploadedUrl) finalAvatarUrl = uploadedUrl
      }
      
      const profileData = {
        id: user.id,
        email: email.trim(),
        full_name: fullName.trim() || null,
        phone_number: phoneNumber.trim() || null,
        address: address.trim() || null,
        avatar_url: finalAvatarUrl || null,
        updated_at: new Date().toISOString(),
      }
      
      const { error: profileError } = await supabase.from("profiles").upsert(profileData, {
        onConflict: "id",
      })
      
      if (profileError) {
        addNotification({ type: "error", title: "Error", message: profileError.message || "Error updating profile." })
        setLoading(false)
        return
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim() || null,
        }
      })

      if (metadataError) {
        console.error("Error updating user metadata:", metadataError)
      }

      addNotification({ type: "success", title: "Success", message: "Admin profile updated successfully!" })
      getCurrentUser()
    } catch (error) {
      addNotification({ type: "error", title: "Error", message: "Error updating profile. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = "/auth/signin"
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Check if current user is admin
  if (currentUserRole !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h2>
        <p className="text-gray-500">You need admin privileges to access this page.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
        <p className="text-gray-500">{error}</p>
        <Button onClick={getCurrentUser} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-gray-600">Manage your administrator profile and preferences</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-red-100 text-red-800">
            <Shield className="w-3 h-3 mr-1" />
            Administrator
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Section */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Profile Avatar</Label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2">
                          <Upload className="w-4 h-4" />
                          <span>Upload new avatar</span>
                        </div>
                      </Label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        JPG, PNG or GIF. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="pl-10"
                      />
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="pl-10"
                      />
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="relative">
                      <Input
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="pl-10"
                      />
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter your address"
                        className="pl-10"
                      />
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Role</span>
                <Badge className="bg-red-100 text-red-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Administrator
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-GB") : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString("en-GB") : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = "/dashboard/admin-management"}
              >
                <Shield className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = "/dashboard/users"}
              >
                <User className="w-4 h-4 mr-2" />
                View All Users
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = "/dashboard/shops"}
              >
                <Store className="w-4 h-4 mr-2" />
                Manage Shops
              </Button>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 