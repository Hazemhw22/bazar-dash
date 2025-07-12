"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { User, Mail, Phone, MapPin, Upload, Save, Store, LogOut, Clock, Copy, ImageIcon, Package, BarChart3 } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { UserRole, WorkingHours } from "@/types/database"

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

interface Shop {
  id: string
  name: string
  description: string | null
  owner_id: string
  email: string
  phone_number: string | null
  address: string | null
  logo_url: string | null
  background_image_url: string | null
  is_active: boolean
  working_hours: WorkingHours[] | null
  timezone: string | null
  delivery_time_from: number
  delivery_time_to: number
  created_at: string
  updated_at: string
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday", 
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

const TIMEZONES = [
  { value: "Asia/Jerusalem", label: "Israel (GMT+2)" },
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Kuwait", label: "Kuwait (GMT+3)" },
  { value: "Asia/Qatar", label: "Qatar (GMT+3)" },
  { value: "Asia/Bahrain", label: "Bahrain (GMT+3)" },
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "Europe/London", label: "London (GMT)" },
]

export default function VendorSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)
  const { notify } = useNotifications()

  // Profile form states
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // Shop form states
  const [shopName, setShopName] = useState("")
  const [shopDescription, setShopDescription] = useState("")
  const [shopEmail, setShopEmail] = useState("")
  const [shopPhoneNumber, setShopPhoneNumber] = useState("")
  const [shopAddress, setShopAddress] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("")
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [timezone, setTimezone] = useState("Asia/Riyadh")
  const [deliveryTimeFrom, setDeliveryTimeFrom] = useState("")
  const [deliveryTimeTo, setDeliveryTimeTo] = useState("")
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([])
  
  // Additional store settings
  const [website, setWebsite] = useState("")
  const [facebook, setFacebook] = useState("")
  const [instagram, setInstagram] = useState("")
  const [twitter, setTwitter] = useState("")
  const [minimumOrder, setMinimumOrder] = useState("")
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("")
  const [deliveryFee, setDeliveryFee] = useState("")
  const [returnPolicy, setReturnPolicy] = useState("")
  const [privacyPolicy, setPrivacyPolicy] = useState("")
  const [termsOfService, setTermsOfService] = useState("")

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

      // Get shop data
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", user.id)
        .single()

      if (shopError && shopError.code !== "PGRST116") {
        console.error("Shop error:", shopError)
      }

      if (shopData) {
        setShop(shopData)
        setShopName(shopData.name || "")
        setShopDescription(shopData.description || "")
        setShopEmail(shopData.email || "")
        setShopPhoneNumber(shopData.phone_number || "")
        setShopAddress(shopData.address || "")
        setLogoUrl(shopData.logo_url || "")
        setBackgroundImageUrl(shopData.background_image_url || "")
        setIsActive(shopData.is_active)
        setTimezone(shopData.timezone || "Asia/Riyadh")
        setDeliveryTimeFrom(shopData.delivery_time_from?.toString() || "30")
        setDeliveryTimeTo(shopData.delivery_time_to?.toString() || "60")
        setWorkingHours(
          shopData.working_hours ||
            DAYS_OF_WEEK.map((day) => ({
              day,
              open_time: "09:00",
              close_time: "18:00",
              is_open: true,
            }))
        )
        
        // Load additional settings (these would need to be added to the database schema)
        setWebsite(shopData.website || "")
        setFacebook(shopData.facebook || "")
        setInstagram(shopData.instagram || "")
        setTwitter(shopData.twitter || "")
        setMinimumOrder(shopData.minimum_order?.toString() || "")
        setFreeDeliveryThreshold(shopData.free_delivery_threshold?.toString() || "")
        setDeliveryFee(shopData.delivery_fee?.toString() || "")
        setReturnPolicy(shopData.return_policy || "")
        setPrivacyPolicy(shopData.privacy_policy || "")
        setTermsOfService(shopData.terms_of_service || "")
      }
    } catch (error) {
      console.error("Error getting user:", error)
      setError("Error loading user data")
    }
  }

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${folder}/${fileName}`
      
      const { data, error } = await supabase.storage
        .from("shop-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: false })

      if (error) {
        console.error("Upload failed:", error)
        notify({ type: "error", message: `Upload failed: ${error.message}` })
        setUploadingImage(false)
        return null
      }

      const { data: urlData } = supabase.storage
        .from("shop-images")
        .getPublicUrl(data.path)

      setUploadingImage(false)
      return urlData.publicUrl
    } catch (error) {
      console.error("Upload exception:", error)
      notify({ type: "error", message: "Upload failed due to network error" })
      setUploadingImage(false)
      return null
    }
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      
      if (!file || file.size === 0) {
        notify({ type: "error", message: "Invalid file selected." })
        setUploadingImage(false)
        return null
      }

      if (file.size > 2 * 1024 * 1024) {
        notify({ type: "error", message: "File size must be less than 2MB." })
        setUploadingImage(false)
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
        notify({ type: "error", message: `Upload failed: ${error.message}` })
        setUploadingImage(false)
        return null
      }

      const { data: urlData } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(data.path)

      setUploadingImage(false)
      return urlData.publicUrl
      
    } catch (error) {
      console.error("Upload exception:", error)
      notify({ type: "error", message: "Upload failed due to network error" })
      setUploadingImage(false)
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setLogoUrl(previewUrl)
  }

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBackgroundFile(file)
    const previewUrl = URL.createObjectURL(file)
    setBackgroundImageUrl(previewUrl)
  }

  const updateWorkingHours = (index: number, field: keyof WorkingHours, value: string | boolean) => {
    const updated = [...workingHours]
    updated[index] = { ...updated[index], [field]: value }
    setWorkingHours(updated)
  }

  const copyWorkingHours = (fromIndex: number) => {
    const sourceHours = workingHours[fromIndex]
    const updated = workingHours.map((hours, index) =>
      index !== fromIndex
        ? {
            ...hours,
            open_time: sourceHours.open_time,
            close_time: sourceHours.close_time,
            is_open: sourceHours.is_open,
          }
        : hours
    )
    setWorkingHours(updated)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!user) {
        notify({ type: "error", message: "User not authenticated" })
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
        notify({ type: "error", message: profileError.message || "Error updating profile." })
        setLoading(false)
        return
      }

      notify({ type: "success", message: "Profile updated successfully!" })
      getCurrentUser()
    } catch (error) {
      notify({ type: "error", message: "Error updating profile. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!user || !shop) {
        notify({ type: "error", message: "User or shop not found" })
        setSaving(false)
        return
      }

      let finalLogoUrl = logoUrl
      if (logoFile && !logoUrl.startsWith("http")) {
        const uploadedUrl = await uploadImage(logoFile, "shops/logos")
        if (uploadedUrl) finalLogoUrl = uploadedUrl
      }

      let finalBackgroundUrl = backgroundImageUrl
      if (backgroundFile && !backgroundImageUrl.startsWith("http")) {
        const uploadedUrl = await uploadImage(backgroundFile, "shops/backgrounds")
        if (uploadedUrl) finalBackgroundUrl = uploadedUrl
      }

      const shopData = {
        name: shopName.trim(),
        description: shopDescription.trim() || null,
        email: shopEmail.trim(),
        phone_number: shopPhoneNumber.trim() || null,
        address: shopAddress.trim() || null,
        logo_url: finalLogoUrl,
        background_image_url: finalBackgroundUrl,
        is_active: isActive,
        working_hours: workingHours,
        timezone: timezone,
        delivery_time_from: parseInt(deliveryTimeFrom) || 30,
        delivery_time_to: parseInt(deliveryTimeTo) || 60,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("shops")
        .update(shopData)
        .eq("id", shop.id)

      if (error) {
        notify({ type: "error", message: error.message || "Error updating shop." })
        setSaving(false)
        return
      }

      notify({ type: "success", message: "Shop updated successfully!" })
      getCurrentUser()
    } catch (error) {
      notify({ type: "error", message: "Error updating shop. Please try again." })
    } finally {
      setSaving(false)
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

  // Check if current user is vendor
  if (currentUserRole !== UserRole.VENDOR) {
    return (
      <div className="p-8 text-center">
        <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h2>
        <p className="text-gray-500">This page is for store owners only.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={getCurrentUser}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Store Settings</h1>
          <p className="text-gray-600">Manage your store profile and business information</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800">
            <Store className="w-3 h-3 mr-1" />
            Store Owner
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Avatar Section */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Profile Avatar</Label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload avatar</span>
                      </div>
                    </Label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendor@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your address"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Store Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Store className="w-5 h-5" />
              <span>Store Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleShopSubmit} className="space-y-4">
              {/* Store Logo */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Store Logo</Label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Store Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload logo</span>
                      </div>
                    </Label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 256x256px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>

              {/* Store Background Image */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Store Background Image</Label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                      {backgroundImageUrl ? (
                        <img
                          src={backgroundImageUrl}
                          alt="Store Background"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                  </div>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="background-upload" className="cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload background</span>
                      </div>
                    </Label>
                    <input
                      id="background-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 1200x400px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Store Name</Label>
                  <Input
                    id="shopName"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Enter store name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopEmail">Store Email</Label>
                  <Input
                    id="shopEmail"
                    type="email"
                    value={shopEmail}
                    onChange={(e) => setShopEmail(e.target.value)}
                    placeholder="store@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopPhone">Store Phone</Label>
                  <Input
                    id="shopPhone"
                    value={shopPhoneNumber}
                    onChange={(e) => setShopPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopAddress">Store Address</Label>
                  <Input
                    id="shopAddress"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="Enter store address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopDescription">Store Description</Label>
                <Textarea
                  id="shopDescription"
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  placeholder="Describe your store..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryTimeFrom">Delivery Time From (minutes)</Label>
                  <Input
                    id="deliveryTimeFrom"
                    type="number"
                    value={deliveryTimeFrom}
                    onChange={(e) => setDeliveryTimeFrom(e.target.value)}
                    placeholder="30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryTimeTo">Delivery Time To (minutes)</Label>
                  <Input
                    id="deliveryTimeTo"
                    type="number"
                    value={deliveryTimeTo}
                    onChange={(e) => setDeliveryTimeTo(e.target.value)}
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Store is active</Label>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Store Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Working Hours</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workingHours.map((hours, index) => (
                <div key={hours.day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-24">
                    <Label className="font-medium">{hours.day}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={hours.is_open}
                      onCheckedChange={(checked) => updateWorkingHours(index, "is_open", checked)}
                    />
                    <span className="text-sm text-gray-600">
                      {hours.is_open ? "Open" : "Closed"}
                    </span>
                  </div>
                  {hours.is_open && (
                    <>
                      <Input
                        type="time"
                        value={hours.open_time}
                        onChange={(e) => updateWorkingHours(index, "open_time", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={hours.close_time}
                        onChange={(e) => updateWorkingHours(index, "close_time", e.target.value)}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyWorkingHours(index)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.href = "/dashboard/products"}
              >
                <Package className="w-4 h-4 mr-2" />
                Manage Products
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/dashboard/orders"}
              >
                <Package className="w-4 h-4 mr-2" />
                View Orders
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/dashboard/analytics"}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 