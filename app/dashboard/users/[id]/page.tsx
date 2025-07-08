"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      setUser(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!user) return <div className="p-8 text-center">User not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{user.full_name || user.email}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.email}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-2xl font-bold">
                  {(user.full_name || user.email)?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-lg">
                {user.full_name || "No name"}
              </div>
              <div className="text-gray-600">{user.email}</div>
              <div className="mt-2">Phone: {user.phone_number || "—"}</div>
              <div className="mt-2">Address: {user.address || "—"}</div>
              <div className="mt-2">
                Joined: {new Date(user.created_at).toLocaleDateString("en-GB")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
