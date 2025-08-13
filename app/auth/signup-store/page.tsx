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
import { useNotifications } from "@/hooks/useNotifications"
import type { WorkingHours } from "@/types/database"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

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
  const { addNotification } = useNotifications()

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
      if (
        !fullName.trim() ||
        !email.trim() ||
        !password.trim() ||
        !storeName.trim() ||
        !phoneNumber.trim() ||
        !address.trim()
      ) {
        setError("Please fill in all required fields marked with *")
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

      addNotification({ type: "success", title: "Success", message: "Store owner account created successfully! Please check your email to confirm your account." })
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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: "url(/LOGINBACK.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex flex-col md:flex-row w-full max-w-6xl md:h-[700px] h-auto rounded-2xl overflow-hidden shadow-2xl m-4 md:m-0">
        {/* Left: Diagonal Card with Colored Lines (hidden on mobile) */}
        <div
          className="relative hidden md:flex md:w-[48%] flex-col items-center justify-between py-0 px-0 overflow-hidden"
          style={{ minHeight: "100%" }}
        >
          {/* Diagonal cut gradient background, same as signin */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "linear-gradient(135deg, #F72585 0%, #7209B7 60%, #4895EF 100%)",
              clipPath: "polygon(0 0, 100% 0, 100% 85%, 0 100%)",
            }}
          />
          <div className="relative z-10 w-full flex flex-col items-center pt-12">
            <img src="/pazar.png" alt="BAZAR Logo" className="w-52 h-52 " />
          </div>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full pb-12">
            <img
              src="/LOGINIMG.png"
              alt="Sign Up Illustration"
              className="w-[420px] h-[320px] object-contain"
            />
          </div>
        </div>
        {/* Right: Form on dark background */}
        <div className="flex-1 flex flex-col justify-center px-6 md:px-20 py-8 md:py-12 bg-[#181C2F]">
          {/* Mobile brand header */}
          <div className="md:hidden mb-4 flex items-center gap-2">
            <div className="bg-[#232A47] p-2 rounded-lg">
              <img src="/pazar.png" alt="BAZAR Logo" className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#4F7FFF] leading-tight">STORE OWNER SIGN UP</h2>
              <p className="text-[#A0AEC0] text-sm">Create your store owner account</p>
            </div>
          </div>

          <div className="w-full max-w-xl mx-auto space-y-2 flex flex-col justify-center h-full">
            <div className="text-center hidden md:block">
              <h2 className="text-3xl font-bold text-[#4F7FFF] mb-2">
                STORE OWNER SIGN UP
              </h2>
              <p className="text-[#A0AEC0] mb-2 text-lg">
                Create your store owner account 
              </p>
            </div>
            <form onSubmit={handleSignUp} className="space-y-6 sm:space-y-8">
              {/* Account Information */}
              <div className="space-y-6 text-base">
                <div>
                  <Label
                    htmlFor="fullName"
                    className="text-sm sm:text-base font-medium text-[#A0AEC0]"
                  >
                    Full Name *
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-10 h-11 sm:h-12 bg-[#232A47] border-0 text-white"
                      required
                    />
                    <User className="absolute left-3 top-3 h-5 w-5 text-[#4F7FFF]" />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm sm:text-base font-medium text-[#A0AEC0]"
                  >
                    Email Address *
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="store@example.com"
                      className="pl-10 h-11 sm:h-12 bg-[#232A47] border-0 text-white"
                      required
                    />
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-[#4F7FFF]" />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="password"
                    className="text-sm sm:text-base font-medium text-[#A0AEC0]"
                  >
                    Password *
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11 sm:h-12 bg-[#232A47] border-0 text-white"
                      required
                    />
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-[#4F7FFF]" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#4F7FFF] hover:text-blue-400"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Store Information Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full mb-4 text-lg font-semibold text-white bg-[#232A47] border-none shadow-lg flex items-center justify-start hover:bg-[#2A3147] transition-colors"
                  >
                    <Store className="w-6 h-6 text-[#4F7FFF] mr-2" /> Add Store
                    Information
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl w-[94vw] sm:w-auto h-auto sm:h-auto max-h-[88dvh] sm:max-h-[80vh] p-4 sm:p-6 bg-[#232A47] border-none shadow-2xl rounded-xl sm:rounded-lg">
                  <DialogHeader className="sticky top-0 z-10 bg-[#232A47] pb-2 px-2 sm:px-0">
                    <DialogTitle className="flex items-center space-x-2 text-white text-xl sm:text-2xl font-bold">
                      <Store className="w-6 h-6 text-[#4F7FFF]" />
                      <span>Store Information</span>
                    </DialogTitle>
                    <p className="text-[#A0AEC0] mt-2 text-base">
                      Configure her store details and contact information.
                    </p>
                  </DialogHeader>
                  <hr className="my-4 sm:my-6 border-[#353B5C]" />

                  <div className="space-y-6 max-h-[calc(85dvh-140px)] sm:max-h-[70vh] overflow-y-auto pr-2">
                    {/* Basic Information Section */}
          <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-white flex items-center">
                        <Store className="w-5 h-5 text-[#4F7FFF] mr-2" />
                        Basic Information
                      </h3>
                      <p className="text-xs text-[#A0AEC0]">Provide her store name and a short description.</p>
                      <div className="p-3 sm:p-4 rounded-xl bg-[#1A1F35] border border-[#353B5C]">
                        <div className="space-y-4">
                          <div>
                            <Label
                              htmlFor="storeName"
                              className="text-xs sm:text-sm font-semibold text-[#A0AEC0] flex items-center"
                            >
                    Store Name <span className="text-red-400 ml-1">*</span>
                            </Label>
                            <div className="relative mt-2">
                              <Input
                                id="storeName"
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Enter your store name"
                                className="pl-10 h-11 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]"
                                required
                              />
                              <Store className="absolute left-3 top-3 h-5 w-5 text-[#4F7FFF]" />
                            </div>
                          </div>
                          <div>
                            <Label
                              htmlFor="storeDescription"
                              className="text-xs sm:text-sm font-semibold text-[#A0AEC0]"
                            >
                              Store Description
                            </Label>
                            <Textarea
                              id="storeDescription"
                              value={storeDescription}
                              onChange={(e) => setStoreDescription(e.target.value)}
                              placeholder="Describe your store, products, and what makes you unique..."
                              rows={3}
                              className="mt-2 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]"
                            />
                            <p className="text-xs text-[#A0AEC0] mt-1">
                              {storeDescription.length}/500 characters
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-white flex items-center">
                        <Phone className="w-5 h-5 text-[#4F7FFF] mr-2" />
                        Contact Information
                      </h3>
                      <p className="text-xs text-[#A0AEC0]">Add her phone number and address so customers can reach her.</p>
                      <div className="p-3 sm:p-4 rounded-xl bg-[#1A1F35] border border-[#353B5C]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label
                              htmlFor="phoneNumber"
                              className="text-xs sm:text-sm font-semibold text-[#A0AEC0] flex items-center"
                            >
                    Phone Number <span className="text-red-400 ml-1">*</span>
                            </Label>
                            <div className="relative mt-2">
                              <Input
                                id="phoneNumber"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1234567890"
                      className="pl-10 h-11 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]"
                      required
                              />
                              <Phone className="absolute left-3 top-3 h-5 w-5 text-[#4F7FFF]" />
                            </div>
                          </div>
                          <div>
                            <Label
                              htmlFor="timezone"
                              className="text-xs sm:text-sm font-semibold text-[#A0AEC0]"
                            >
                              Timezone
                            </Label>
                            <Select value={timezone} onValueChange={setTimezone}>
                              <SelectTrigger className="mt-2 h-11 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#232A47] border-[#353B5C]">
                                {TIMEZONES.map((tz) => (
                                  <SelectItem
                                    key={tz.value}
                                    value={tz.value}
                                    className="text-white hover:bg-[#353B5C]"
                                  >
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Label
                            htmlFor="address"
                            className="text-xs sm:text-sm font-semibold text-[#A0AEC0] flex items-center"
                          >
                  Store Address <span className="text-red-400 ml-1">*</span>
                          </Label>
                          <div className="relative mt-2">
                            <Textarea
                              id="address"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Enter your complete store address"
                              rows={2}
                    className="pl-10 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]"
                    required
                            />
                            <MapPin className="absolute left-3 top-3 h-5 w-5 text-[#4F7FFF]" />
                          </div>
                        </div>
              <p className="text-xs text-[#A0AEC0] mt-3">Fields marked with <span className="text-red-400">*</span> are required.</p>
                      </div>
                    </div>

                    {/* Delivery Settings Section */}
                    <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-white flex items-center">
                        <Clock className="w-5 h-5 text-[#4F7FFF] mr-2" />
                        Delivery Settings
                      </h3>
                      <p className="text-xs text-[#A0AEC0]">Set her expected delivery time range shown to customers.</p>
                      <div className="p-3 sm:p-4 rounded-xl bg-[#1A1F35] border border-[#353B5C]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label
                              htmlFor="deliveryTimeFrom"
                              className="text-xs sm:text-sm font-semibold text-[#A0AEC0]"
                            >
                              Minimum Delivery Time (minutes)
                            </Label>
                            <Input
                              id="deliveryTimeFrom"
                              type="number"
                              value={deliveryTimeFrom}
                              onChange={(e) => setDeliveryTimeFrom(e.target.value)}
                              placeholder="30"
                              className="mt-2 h-11 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="deliveryTimeTo"
                              className="text-xs sm:text-sm font-semibold text-[#A0AEC0]"
                            >
                              Maximum Delivery Time (minutes)
                            </Label>
                            <Input
                              id="deliveryTimeTo"
                              type="number"
                              value={deliveryTimeTo}
                              onChange={(e) => setDeliveryTimeTo(e.target.value)}
                              placeholder="60"
                              className="mt-2 h-11 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]"
                            />
                          </div>
                        </div>
                        <div className="mt-4 p-3 rounded-lg bg-[#232A47] border border-[#353B5C]">
                          <p className="text-xs text-[#A0AEC0]">
                            <strong>Delivery Range:</strong> {deliveryTimeFrom || 30} - {deliveryTimeTo || 60} minutes
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Store Status Section */}
                    <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-white flex items-center">
                        <Save className="w-5 h-5 text-[#4F7FFF] mr-2" />
                        Store Status
                      </h3>
                      <p className="text-xs text-[#A0AEC0]">Control whether her store is visible to customers.</p>
                      <div className="p-3 sm:p-4 rounded-xl bg-[#1A1F35] border border-[#353B5C]">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <Label
                              htmlFor="isActive"
                              className="text-xs sm:text-sm font-semibold text-[#A0AEC0]"
                            >
                              Store Status
                            </Label>
                            <p className="text-xs text-[#A0AEC0] mt-1">
                              {isActive ? "Her store will be visible to customers" : "Her store will be hidden from customers"}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Switch
                              id="isActive"
                              checked={isActive}
                              onCheckedChange={setIsActive}
                              className="data-[state=checked]:bg-[#4F7FFF]"
                            />
                            <span className={`text-sm font-medium ${isActive ? "text-green-400" : "text-red-400"}`}>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 rounded-lg bg-[#1A1F35] border border-[#353B5C]">
                    <h4 className="text-sm font-semibold text-[#A0AEC0] mb-2">Store Summary</h4>
                    <div className="text-xs text-[#A0AEC0] space-y-1">
                      <div>Store Name: {storeName || "Not set"}</div>
                      <div>Contact: {phoneNumber || "Not provided"}</div>
                      <div>
                        Timezone: {TIMEZONES.find((tz) => tz.value === timezone)?.label || timezone}
                      </div>
                      <div>
                        Status: <span className={isActive ? "text-green-400" : "text-red-400"}>{isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                    <Button type="button" variant="outline" className="px-6 py-2 text-[#4F7FFF] border-[#4F7FFF] hover:bg-[#4F7FFF] hover:text-white">
                      Reset
                    </Button>
                    <Button type="button" className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-blue-600 text-white font-semibold hover:from-pink-600 hover:to-blue-700">
                      Save Information
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Business Hours Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full mb-4 text-lg font-semibold text-white bg-[#232A47] border-none shadow-lg flex items-center justify-start hover:bg-[#2A3147] transition-colors"
                  >
                    <Clock className="w-6 h-6 text-[#4F7FFF] mr-2" /> Add
                    Business Hours
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl w-[92vw] sm:w-auto h-auto sm:h-auto max-h-[85dvh] sm:max-h-[80vh] p-3 sm:p-6 bg-[#232A47] border-none shadow-2xl rounded-xl sm:rounded-lg">
                  <DialogHeader className="sticky top-0 z-10 bg-[#232A47] pb-2">
                    <DialogTitle className="flex items-center space-x-2 text-white text-2xl font-bold">
                      <Clock className="w-6 h-6 text-[#4F7FFF]" />
                      <span>Business Hours</span>
                    </DialogTitle>
                    <p className="text-[#A0AEC0] mt-2 text-base">
                      Set her weekly business hours and operating schedule.
                    </p>
                  </DialogHeader>
                  <hr className="my-4 sm:my-6 border-[#353B5C]" />

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWorkingHours((prev) =>
                          prev.map((h) => ({
                            ...h,
                            is_open: true,
                            open_time: "09:00",
                            close_time: "18:00",
                          }))
                        );
                      }}
                      className="text-xs text-[#4F7FFF] border-[#4F7FFF] hover:bg-[#4F7FFF] hover:text-white"
                    >
                      Set All Weekdays 9AM-6PM
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWorkingHours((prev) =>
                          prev.map((h) => ({ ...h, is_open: false }))
                        );
                      }}
                      className="text-xs text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      Close All Days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWorkingHours((prev) =>
                          prev.map((h) => ({
                            ...h,
                            is_open: true,
                            open_time: "10:00",
                            close_time: "22:00",
                          }))
                        );
                      }}
                      className="text-xs text-[#4F7FFF] border-[#4F7FFF] hover:bg-[#4F7FFF] hover:text-white"
                    >
                      Set All Days 10AM-10PM
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[calc(85dvh-140px)] sm:max-h-[70vh] overflow-y-auto pr-2">
                    {workingHours.map((hours, index) => (
                      <div
                        key={hours.day}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-xl bg-[#1A1F35] border border-[#353B5C] hover:border-[#4F7FFF] transition-all"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-24">
                            <Label className="text-sm font-semibold text-[#A0AEC0]">
                              {hours.day}
                            </Label>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Switch
                              checked={hours.is_open}
                              onCheckedChange={(checked) =>
                                updateWorkingHours(
                                  hours.day,
                                  "is_open",
                                  checked
                                )
                              }
                              className="data-[state=checked]:bg-[#4F7FFF]"
                            />
                            <span
                              className={`text-sm font-medium ${
                                hours.is_open
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {hours.is_open ? "Open" : "Closed"}
                            </span>
                          </div>
                        </div>

                        {hours.is_open && (
                          <div className="flex flex-wrap items:center gap-3">
                            <div className="flex items-center space-x-2">
                              <Input
                                type="time"
                                value={hours.open_time}
                                onChange={(e) =>
                                  updateWorkingHours(
                                    hours.day,
                                    "open_time",
                                    e.target.value
                                  )
                                }
                                className="w-28 h-9 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]"
                              />
                              <span className="text-sm text-[#A0AEC0] font-medium">
                                to
                              </span>
                              <Input
                                type="time"
                                value={hours.close_time}
                                onChange={(e) =>
                                  updateWorkingHours(
                                    hours.day,
                                    "close_time",
                                    e.target.value
                                  )
                                }
                                className="w-28 h-9 bg-[#232A47] border-[#353B5C] text-white focus:border-[#4F7FFF] focus:ring-[#4F7FFF]"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyWorkingHours(hours.day)}
                              className="text-xs text-[#4F7FFF] border-[#4F7FFF] hover:bg-[#4F7FFF] hover:text-white transition-colors"
                            >
                              Copy
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 rounded-lg bg-[#1A1F35] border border-[#353B5C]">
                    <h4 className="text-sm font-semibold text-[#A0AEC0] mb-2">
                      Summary
                    </h4>
                    <div className="text-xs text-[#A0AEC0] space-y-1">
                      <div>
                        Open Days: {workingHours.filter((h) => h.is_open).length}/7
                      </div>
                      <div>
                        Closed Days: {workingHours.filter((h) => !h.is_open).length}/7
                      </div>
                      <div>
                        Most Common Hours: {(() => {
                          const hours = workingHours
                            .filter((h) => h.is_open)
                            .map((h) => `${h.open_time}-${h.close_time}`);
                          const counts = hours.reduce((acc, hour) => {
                            acc[hour] = (acc[hour] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          const mostCommon = Object.entries(counts).sort(
                            ([, a], [, b]) => b - a
                          )[0];
                          return mostCommon ? mostCommon[0] : "N/A";
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="px-6 py-2 text-[#4F7FFF] border-[#4F7FFF] hover:bg-[#4F7FFF] hover:text-white"
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-blue-600 text-white font-semibold hover:from-pink-600 hover:to-blue-700"
                    >
                      Save Hours
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-lg bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white font-bold text-base sm:text-lg tracking-wide shadow"
              >
                {loading ? "Creating account..." : "CREATE STORE OWNER ACCOUNT"}
              </Button>
            </form>
            <div className="text-center">
              <span className="text-[#A0AEC0]">Already have an account? </span>
              <Link
                href="/auth/signin"
                className="text-[#4F7FFF] hover:underline font-semibold"
              >
                SIGN IN
              </Link>
            </div>
            <div className="text-center text-sm text-[#A0AEC0] mt-8">
              © 2025.TCSS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 