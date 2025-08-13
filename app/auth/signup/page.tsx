"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import {
  safeCreateNotification,
  NotificationTemplates,
} from "@/lib/notifications";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Create profile
      if (data.user) {
        // Create notification for successful signup
        await safeCreateNotification(
          NotificationTemplates.signUpSuccess(email)
        );

        const selectedRole = isAdmin ? "admin" : "customer";

        const profileData = {
          id: data.user.id,
          full_name: name.trim(),
          email: email.trim(),
          role: selectedRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Try to create profile with upsert to handle existing profiles
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(profileData, {
            onConflict: "id",
            ignoreDuplicates: false,
          });

        if (profileError) {
          // Try alternative approach: update existing profile if it exists
          await supabase
            .from("profiles")
            .update({
              full_name: name.trim(),
              email: email.trim(),
              role: selectedRole,
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.user.id);
        }
      }

      router.push(
        "/auth/signin?message=Check your email to confirm your account"
      );
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

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
        {/* Right: Form on dark semi-transparent background */}
        <div className="flex-1 flex flex-col justify-center px-6 md:px-20 py-8 md:py-12 bg-[#181C2F]">
          {/* Mobile brand header */}
          <div className="md:hidden mb-4 flex items-center gap-2">
            <div className="bg-[#232A47] p-2 rounded-lg">
              <img src="/pazar.png" alt="BAZAR Logo" className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#4F7FFF] leading-tight">SIGN UP</h2>
              <p className="text-[#A0AEC0] text-sm">Enter your email and password to register</p>
            </div>
          </div>

          <h2 className="hidden md:block text-4xl font-bold text-[#4F7FFF] mb-2">SIGN UP</h2>
          <p className="hidden md:block text-[#A0AEC0] mb-8 text-lg">
            Enter your email and password to register
          </p>
          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-[#A0AEC0]">
                  Name
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Name"
                    className="pl-10 h-12 bg-[#232A47] border-0 text-white"
                    required
                  />
                  <User className="absolute left-3 top-3 h-5 w-5 text-[#4F7FFF]" />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-[#A0AEC0]">
                  Email
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nohad@denezi.com"
                    className="pl-10 h-12 bg-[#232A47] border-0 text-white"
                    required
                  />
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-[#4F7FFF]" />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-[#A0AEC0]">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 bg-[#232A47] border-0 text-white"
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newsletter"
                  checked={newsletter}
                  onCheckedChange={(checked) => setNewsletter(checked as boolean)}
                />
                <Label htmlFor="newsletter" className="text-sm text-[#A0AEC0]">
                  Subscribe to weekly newsletter
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="admin"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked as boolean)}
                />
                <Label htmlFor="admin" className="text-sm text-[#A0AEC0]">
                  Register as Administrator
                </Label>
              </div>
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white font-bold text-lg tracking-wide shadow"
            >
              {loading ? "Creating account..." : "SIGN UP"}
            </Button>
          </form>
          <div className="text-center mt-6">
            <span className="text-[#A0AEC0]">Already have an account? </span>
            <Link
              href="/auth/signin"
              className="text-[#4F7FFF] hover:underline font-semibold"
            >
              SIGN IN
            </Link>
          </div>
          <div className="text-center mt-2">
            <span className="text-[#A0AEC0]">Are you a store owner? </span>
            <Link
              href="/auth/signup-store"
              className="text-pink-400 hover:underline font-semibold"
            >
              Register your store here
            </Link>
          </div>
          <div className="text-center text-sm text-[#A0AEC0] mt-8">
            © 2025.TCSS
          </div>
        </div>
      </div>
    </div>
  );
}
