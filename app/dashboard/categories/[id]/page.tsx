"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CategoryDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<any>(null);
  const [parentName, setParentName] = useState<string>("");

  useEffect(() => {
    fetchCategory();
    // eslint-disable-next-line
  }, [categoryId]);

  const fetchCategory = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      setCategory(data);
      if (data.parent_id) {
        const { data: parentData } = await supabase
          .from("categories")
          .select("name")
          .eq("id", data.parent_id)
          .single();
        setParentName(parentData?.name || "");
      } else {
        setParentName(""); // لا يوجد تصنيف أب
      }
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
  if (!category)
    return <div className="p-8 text-center">Category not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Category Details</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{category.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              {category.logo_url && category.logo_url.startsWith("http") ? (
                <img
                  src={category.logo_url}
                  alt={category.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-2xl">{category.logo_url || "📁"}</span>
              )}
            </div>
            <div>
              <div className="font-bold text-lg">{category.name}</div>
              <div className="text-gray-600">
                {category.description || "No description"}
              </div>
              <div className="mt-2">
                <Badge variant={category.parent_id ? "secondary" : "default"}>
                  {category.parent_id ? "Sub Category" : "Main Category"}
                </Badge>
                {/* حذف شارة التصنيف الأب */}
                {/* {parentName && <Badge variant="outline" className="ml-2">Parent: {parentName}</Badge>} */}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
