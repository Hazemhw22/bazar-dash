"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";

export default function ShopDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params?.id as string;
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShop();
  }, [shopId]);

  const fetchShop = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();
      if (error) throw error;
      setShop(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!shop) return <div className="p-8 text-center">Shop not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/shops/edit/${shop.id}`)}
        >
          <Edit className="w-4 h-4 mr-2" /> Edit
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Description:</strong> {shop.description || "-"}
          </div>
          <div>
            <strong>Email:</strong> {shop.email}
          </div>
          <div>
            <strong>Phone:</strong> {shop.phone_number || "-"}
          </div>
          <div>
            <strong>Address:</strong> {shop.address || "-"}
          </div>
          <div>
            <strong>Status:</strong>{" "}
            <Badge variant={shop.is_active ? "default" : "secondary"}>
              {shop.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <strong>Created:</strong>{" "}
            {new Date(shop.created_at).toLocaleDateString("en-GB")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
