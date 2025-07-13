"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, Mail, Lock, User, Building } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import { NotificationTemplates } from "@/lib/notifications"

export default function SignUp() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { addNotification } = useNotifications()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      addNotification(NotificationTemplates.validationError("password confirmation"))
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      addNotification(NotificationTemplates.validationError("password"))
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: isAdmin ? "admin" : "customer",
          },
        },
      })

      if (error) {
        setError(error.message)
        addNotification(NotificationTemplates.authError(error.message || "Signup failed."))
      } else {
        addNotification(NotificationTemplates.signUpSuccess(email))
        router.push("/auth/signin")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      addNotification(NotificationTemplates.systemError(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
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
              <h2 className="text-3xl font-bold text-blue-600 mb-2">SIGN UP</h2>
              <p className="text-gray-600">Create your account to get started</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-gray-700">
                    Full Name
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="pl-10 h-12 bg-gray-100 border-0"
                      required
                    />
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-700">
                    Email
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="pl-10 h-12 bg-gray-100 border-0"
                      required
                    />
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-700">
                    Password
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

                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-700">
                    Confirm Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-12 bg-gray-100 border-0"
                      required
                    />
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAdmin"
                    checked={isAdmin}
                    onCheckedChange={(checked) => setIsAdmin(checked as boolean)}
                  />
                  <Label htmlFor="isAdmin" className="text-sm text-gray-600">
                    Register as Admin
                  </Label>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm text-center">{error}</div>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white font-semibold"
              >
                {loading ? "Creating account..." : "SIGN UP"}
              </Button>
            </form>

            <div className="text-center">
              <span className="text-gray-600">{"Already have an account? "}</span>
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
                <div className="w-16 h-16 bg-green-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="mt-4">
                  <div className="bg-black text-white px-4 py-2 rounded text-sm">Sign Up</div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🚀</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 