"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, Mail, Lock, User, Store, Clock, MapPin, Phone, Upload, Save } from "lucide-react"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { WorkingHours } from "@/types/database"

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday", 
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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
];

export default function StoreOwnerSignUp() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { notify } = useNotifications()

  // User account fields
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Store details fields
  const [storeName, setStoreName] = useState("")
  const [storeDescription, setStoreDescription] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [timezone, setTimezone] = useState("Asia/Riyadh")
  const [deliveryTimeFrom, setDeliveryTimeFrom] = useState("30")
  const [deliveryTimeTo, setDeliveryTimeTo] = useState("60")
  const [isActive, setIsActive] = useState(true)
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { day: "Monday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Tuesday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Wednesday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Thursday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Friday", open_time: "09:00", close_time: "18:00", is_open: true },
    { day: "Saturday", open_time: "10:00", close_time: "16:00", is_open: true },
    { day: "Sunday", open_time: "10:00", close_time: "16:00", is_open: false },
  ])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validate required fields
      if (!fullName.trim() || !email.trim() || !password.trim() || !storeName.trim()) {
        setError("Please fill in all required fields")
        setLoading(false)
        return
      }

      // Create user account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "vendor",
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        setError("Failed to create user account")
        setLoading(false)
        return
      }

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        role: "vendor",
      })

      if (profileError) {
        console.error("Profile creation error:", profileError)
        // Don't fail the entire process for profile errors
      }

      // Create store
      const storeData = {
        name: storeName.trim(),
        description: storeDescription.trim() || null,
        owner_id: data.user.id,
        email: email.trim(),
        phone_number: phoneNumber.trim() || null,
        address: address.trim() || null,
        logo_url: "🏪", // Default logo
        background_image_url: null,
        is_active: isActive,
        working_hours: workingHours,
        timezone: timezone,
        delivery_time_from: parseInt(deliveryTimeFrom) || 30,
        delivery_time_to: parseInt(deliveryTimeTo) || 60,
      }

      const { error: storeError } = await supabase
        .from("shops")
        .insert(storeData)

      if (storeError) {
        console.error("Store creation error:", storeError)
        setError("Failed to create store. Please try again.")
        setLoading(false)
        return
      }

      notify({ type: "success", message: "Store owner account created successfully! Please check your email to confirm your account." })
      router.push("/auth/signin?message=Check your email to confirm your account")
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Signup error:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateWorkingHours = (day: string, field: keyof WorkingHours, value: any) => {
    setWorkingHours(prev => 
      prev.map(hours => 
        hours.day === day ? { ...hours, [field]: value } : hours
      )
    )
  }

  const copyWorkingHours = (fromDay: string) => {
    const sourceHours = workingHours.find(h => h.day === fromDay)
    if (!sourceHours) return

    setWorkingHours(prev => 
      prev.map(hours => 
        hours.day !== fromDay ? {
          ...hours,
          open_time: sourceHours.open_time,
          close_time: sourceHours.close_time,
          is_open: sourceHours.is_open,
        } : hours
      )
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-8">
          {/* Language selector */}
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>🇺🇸</span>
              <span>EN</span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-blue-600 mb-2">STORE OWNER SIGN UP</h2>
              <p className="text-gray-600">Create your store owner account and set up your store</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Account Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-gray-700">
                      Full Name *
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="pl-10 h-12 bg-gray-100 border-0"
                        required
                      />
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-700">
                      Email Address *
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="store@example.com"
                        className="pl-10 h-12 bg-gray-100 border-0"
                        required
                      />
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-700">
                      Password *
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-12 bg-gray-100 border-0"
                        required
                      />
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Store Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Store className="w-5 h-5" />
                    <span>Store Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="storeName" className="text-gray-700">
                      Store Name *
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="storeName"
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Enter your store name"
                        className="pl-10 h-12 bg-gray-100 border-0"
                        required
                      />
                      <Store className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="storeDescription" className="text-gray-700">
                      Store Description
                    </Label>
                    <Textarea
                      id="storeDescription"
                      value={storeDescription}
                      onChange={(e) => setStoreDescription(e.target.value)}
                      placeholder="Describe your store..."
                      rows={3}
                      className="bg-gray-100 border-0"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phoneNumber" className="text-gray-700">
                        Phone Number
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+1234567890"
                          className="pl-10 h-12 bg-gray-100 border-0"
                        />
                        <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="timezone" className="text-gray-700">
                        Timezone
                      </Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className="h-12 bg-gray-100 border-0">
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
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-gray-700">
                      Address
                    </Label>
                    <div className="relative mt-1">
                      <Textarea
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter your store address"
                        rows={2}
                        className="pl-10 bg-gray-100 border-0"
                      />
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deliveryTimeFrom" className="text-gray-700">
                        Delivery Time From (minutes)
                      </Label>
                      <Input
                        id="deliveryTimeFrom"
                        type="number"
                        value={deliveryTimeFrom}
                        onChange={(e) => setDeliveryTimeFrom(e.target.value)}
                        placeholder="30"
                        className="h-12 bg-gray-100 border-0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="deliveryTimeTo" className="text-gray-700">
                        Delivery Time To (minutes)
                      </Label>
                      <Input
                        id="deliveryTimeTo"
                        type="number"
                        value={deliveryTimeTo}
                        onChange={(e) => setDeliveryTimeTo(e.target.value)}
                        placeholder="60"
                        className="h-12 bg-gray-100 border-0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <Label htmlFor="isActive" className="text-sm text-gray-600">
                      Store is active
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Working Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Working Hours</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workingHours.map((hours, index) => (
                    <div key={hours.day} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-24">
                        <Label className="text-sm font-medium">{hours.day}</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={hours.is_open}
                          onCheckedChange={(checked) => 
                            updateWorkingHours(hours.day, "is_open", checked)
                          }
                        />
                        <span className="text-sm text-gray-600">
                          {hours.is_open ? "Open" : "Closed"}
                        </span>
                      </div>

                      {hours.is_open && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="time"
                              value={hours.open_time}
                              onChange={(e) => 
                                updateWorkingHours(hours.day, "open_time", e.target.value)
                              }
                              className="w-24 h-8 bg-gray-100 border-0"
                            />
                            <span className="text-sm text-gray-500">to</span>
                            <Input
                              type="time"
                              value={hours.close_time}
                              onChange={(e) => 
                                updateWorkingHours(hours.day, "close_time", e.target.value)
                              }
                              className="w-24 h-8 bg-gray-100 border-0"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyWorkingHours(hours.day)}
                            className="text-xs"
                          >
                            Copy to others
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {error && <div className="text-red-600 text-sm text-center">{error}</div>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white font-semibold"
              >
                {loading ? "Creating account..." : "CREATE STORE OWNER ACCOUNT"}
              </Button>
            </form>

            <div className="text-center">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/auth/signin" className="text-blue-600 hover:underline font-semibold">
                SIGN IN
              </Link>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">All Rights Reserved .2025 ©</div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="flex-1 bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">V</span>
              </div>
              <h1 className="text-3xl font-bold">VRISTO</h1>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-sm mx-auto">
              <div className="bg-white rounded-xl p-6 mb-4">
                <div className="w-16 h-16 bg-yellow-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🏪</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="mt-4">
                  <div className="bg-black text-white px-4 py-2 rounded text-sm">Store Owner</div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-4xl">👨‍💼</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 