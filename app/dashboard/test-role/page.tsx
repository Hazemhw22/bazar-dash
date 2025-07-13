"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/database";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export default function TestRolePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUserProfile();
  }, []);

  const fetchCurrentUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw authError;
      }

      if (!user) {
        setError("No authenticated user found");
        return;
      }

      console.log("Current auth user:", user);

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      console.log("Profile data:", profileData);
      setProfile(profileData);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "bg-red-100 text-red-800";
      case UserRole.VENDOR:
        return "bg-blue-100 text-blue-800";
      case UserRole.STAFF:
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const updateRole = async (newRole: UserRole) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      if (error) {
        throw error;
      }

      // Refresh profile data
      await fetchCurrentUserProfile();
      alert(`Role updated to ${newRole}`);
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Failed to update role");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={fetchCurrentUserProfile}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Role Test Page</h1>
        <p className="text-gray-600">Debug and test user role assignment</p>
      </div>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Current User Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">User ID</label>
                <p className="text-sm">{profile.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm">{profile.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-sm">{profile.full_name || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Current Role</label>
                <div className="mt-1">
                  <Badge className={getRoleBadgeColor(profile.role)}>
                    {profile.role}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm">{new Date(profile.created_at).toLocaleDateString("en-GB")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Updated</label>
                <p className="text-sm">{new Date(profile.updated_at).toLocaleDateString("en-GB")}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Test Role Changes</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(UserRole).map((role) => (
                  <Button
                    key={role}
                    variant={profile.role === role ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateRole(role)}
                    disabled={profile.role === role}
                  >
                    Set as {role}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Available Roles:</strong> {Object.values(UserRole).join(", ")}</p>
            <p><strong>Expected Behavior:</strong> Admin checkbox should set role to "admin"</p>
            <p><strong>Current Issue:</strong> All users are being created as "customer"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 