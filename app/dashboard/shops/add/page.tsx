"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { WorkingHours, ShopInsert } from "@/types/database"
import { ArrowLeft, Store, Upload, ImageIcon, Clock, Copy, Save } from "lucide-react"

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Kuwait", label: "Kuwait (GMT+3)" },
  { value: "Asia/Qatar", label: "Qatar (GMT+3)" },
  { value: "Asia/Bahrain", label: "Bahrain (GMT+3)" },
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "Europe/London", label: "London (GMT)" },
]

export default function AddShopPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("")
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [timezone, setTimezone] = useState("Asia/Riyadh")
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { day: "Monday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Tuesday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Wednesday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Thursday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Friday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Saturday", open_time: "10:00", close_time: "16:00", is_open: true },
    { day: "Sunday", open_time: "10:00", close_time: "16:00", is_open: false },
  ])

  useEffect(() => {
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error("Auth error:", error)
        return
      }

      setUser(user)
      if (user?.email) {
        setEmail(user.email)
      }
    } catch (error) {
      console.error("Error getting user:", error)
    }
  }

  const uploadImage = async (file: File, folder = "shops"): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { error: uploadError } = await supabase.storage.from("shop-images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw uploadError
      }

      const { data } = supabase.storage.from("shop-images").getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error("Error uploading image:", error)
      return null
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setLogoFile(file)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setLogoUrl(previewUrl)
    setUploadingImage(false)
  }

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setBackgroundFile(file)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setBackgroundImageUrl(previewUrl)
    setUploadingImage(false)
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
        : hours,
    )
    setWorkingHours(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!name.trim()) {
        alert("Please enter a shop name")
        return
      }

      if (!email.trim()) {
        alert("Please enter an email address")
        return
      }

      if (!user) {
        alert("User not authenticated")
        return
      }

      // Upload logo
      let finalLogoUrl = "🏪"
      if (logoFile) {
        const uploadedUrl = await uploadImage(logoFile, "shops/logos")
        if (uploadedUrl) finalLogoUrl = uploadedUrl
      }

      // Upload background image
      let finalBackgroundUrl = null
      if (backgroundFile) {
        const uploadedUrl = await uploadImage(backgroundFile, "shops/backgrounds")
        if (uploadedUrl) finalBackgroundUrl = uploadedUrl
      }

      const shopData: ShopInsert = {
        name: name.trim(),
        description: description.trim() || null,
        owner_id: user.id,
        email: email.trim(),
        phone_number: phoneNumber.trim() || null,
        address: address.trim() || null,
        logo_url: finalLogoUrl,
        background_image_url: finalBackgroundUrl,
        is_active: isActive,
        working_hours: workingHours,
        timezone: timezone,
      }

      console.log("Inserting shop data:", shopData)

      const { data, error } = await supabase.from("shops").insert(shopData).select()

      if (error) {
        console.error("Database error:", error)
        throw error
      }

      console.log("Shop created successfully:", data)
      alert("Shop added successfully!")
      router.push("/dashboard/shops")
    } catch (error) {
      console.error("Error adding shop:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      alert(`Error adding shop: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Shop</h1>
          <p className="text-gray-600">Create a new shop for your business</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shop Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Shop Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter shop name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter shop description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="shop@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter shop address"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
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
              </CardContent>
            </Card>

            {/* Working Hours */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Working Hours
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {workingHours.map((hours, index) => (
                  <div key={hours.day} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className="w-20">
                      <Label className="text-sm font-medium">{hours.day}</Label>
                    </div>

                    <Switch
                      checked={hours.is_open}
                      onCheckedChange={(checked) => updateWorkingHours(index, "is_open", checked)}
                    />

                    {hours.is_open ? (
                      <>
                        <div className="flex items-center space-x-2">
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
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyWorkingHours(index)}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy to all
                        </Button>
                      </>
                    ) : (
                      <span className="text-gray-500 italic">Closed</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Shop Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div>
                  <Label>Shop Logo</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {logoUrl && !logoUrl.startsWith("🏪") ? (
                            <img
                              src={logoUrl || "/placeholder.svg"}
                              alt="Shop logo"
                              className="w-20 h-20 object-cover rounded-lg mb-2"
                            />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-4 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> shop logo
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Background Image Upload */}
                <div>
                  <Label>Background Image</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {backgroundImageUrl ? (
                            <img
                              src={backgroundImageUrl || "/placeholder.svg"}
                              alt="Background"
                              className="w-full h-20 object-cover rounded-lg mb-2"
                            />
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 mb-4 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> background image
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleBackgroundUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shop Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active Shop</Label>
                  <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Owner:</strong> {user?.email || "Loading..."}
                  </p>
                  <p>
                    <strong>Created:</strong> {new Date().toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Timezone:</strong> {timezone}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {logoUrl && !logoUrl.startsWith("🏪") ? (
                        <img src={logoUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🏪</span>
                      )}
                    </div>
                    <h3 className="font-semibold">{name || "Shop Name"}</h3>
                    <p className="text-sm text-gray-600">{description || "Shop description"}</p>
                    <p className="text-xs text-gray-500 mt-1">{email}</p>
                    {phoneNumber && <p className="text-xs text-gray-500">{phoneNumber}</p>}
                    <Badge variant={isActive ? "default" : "secondary"} className="mt-2">
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today's Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const today = new Date().toLocaleDateString("en-US", { weekday: "long" })
                  const todayHours = workingHours.find((h) => h.day === today)
                  return (
                    <div className="text-center">
                      <div className="text-lg font-semibold">{today}</div>
                      {todayHours?.is_open ? (
                        <div className="text-sm text-green-600">
                          {todayHours.open_time} - {todayHours.close_time}
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">Closed</div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shop Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Store className="w-4 h-4 text-blue-600" />
                    <span>Product Management</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Store className="w-4 h-4 text-green-600" />
                    <span>Order Processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Store className="w-4 h-4 text-purple-600" />
                    <span>Analytics Dashboard</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || uploadingImage}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating Shop..." : uploadingImage ? "Uploading Images..." : "Create Shop"}
          </Button>
        </div>
      </form>
    </div>
  )
}
