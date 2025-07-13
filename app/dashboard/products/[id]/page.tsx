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

type Specification = {
  title: string;
  description: string;
};

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!product) return <div className="p-8 text-center">Product not found</div>;

  const {
    name,
    description,
    images,
    categories,
    shops,
    price,
    discount_price,
    stock_quantity,
    is_active,
    specifications,
  } = product;

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
          <CardTitle>{name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
              {images && images.length > 0 ? (
                <img
                  src={images[0]}
                  alt={name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Package className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div>
              <div className="font-bold text-lg">{name}</div>
              <div className="text-gray-600">{description}</div>
              <div className="mt-2">
                <Badge variant="outline">
                  {categories?.name || "Uncategorized"}
                </Badge>
                <Badge variant="outline" className="ml-2">
                  {shops?.name || "Unknown Shop"}
                </Badge>
              </div>
              <div className="mt-2">
                <span className="font-semibold">${price.toFixed(2)}</span>
                {discount_price && (
                  <span className="ml-2 text-green-600">
                    Sale: ${discount_price.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="font-medium">Stock: {stock_quantity}</span>
              </div>
              <div className="mt-2">
                <Badge variant={is_active ? "default" : "secondary"}>
                  {is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
          {/* عرض المواصفات كعنوان وشرح */}
          {specifications && specifications.length > 0 && (
            <div className="space-y-2">
              {specifications.map((spec: Specification, idx: number) => (
              <div key={idx} className="p-2 border rounded-lg">
                <p className="font-semibold">{spec.title}</p>
                <p className="text-sm text-gray-600">{spec.description}</p>
              </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
