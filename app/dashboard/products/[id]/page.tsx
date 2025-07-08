"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), shops(name)")
        .eq("id", productId)
        .single();
      if (error) throw error;
      setProduct(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!product) return <div className="p-8 text-center">Product not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Product Details</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Package className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div>
              <div className="font-bold text-lg">{product.name}</div>
              <div className="text-gray-600">{product.description}</div>
              <div className="mt-2">
                <Badge variant="outline">
                  {product.categories?.name || "Uncategorized"}
                </Badge>
                <Badge variant="outline" className="ml-2">
                  {product.shops?.name || "Unknown Shop"}
                </Badge>
              </div>
              <div className="mt-2">
                <span className="font-semibold">
                  ${product.price.toFixed(2)}
                </span>
                {product.discount_price && (
                  <span className="ml-2 text-green-600">
                    Sale: ${product.discount_price.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="font-medium">
                  Stock: {product.stock_quantity}
                </span>
              </div>
              <div className="mt-2">
                <Badge variant={product.is_active ? "default" : "secondary"}>
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
