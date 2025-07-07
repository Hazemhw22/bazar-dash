"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Category, CategoryInsert } from "@/types/database";
import { ArrowLeft, Layers, Upload, Save } from "lucide-react";

export default function AddCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null) // Only get main categories for parent selection
        .order("name");

      if (error) {
        console.error("Fetch categories error:", error);
        throw error;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("category-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("category-images")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setLogoFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!name.trim()) {
        alert("Please enter a category name");
        return;
      }

      // Upload logo if provided
      let finalLogoUrl = "📁";
      if (logoFile) {
        const uploadedUrl = await uploadImage(logoFile);
        if (uploadedUrl) finalLogoUrl = uploadedUrl;
      }

      const categoryData: CategoryInsert = {
        name: name.trim(),
        description: description.trim() || null,
        parent_id: parentId === "none" || !parentId ? null : parentId,
        logo_url: finalLogoUrl,
      };

      console.log("Inserting category data:", categoryData);

      const { data, error } = await supabase
        .from("categories")
        .insert(categoryData)
        .select();

      if (error) {
        console.error("Database error:", error);
        alert(
          `Error adding category: ${error.message || JSON.stringify(error)}`
        );
        throw error;
      }

      console.log("Category created successfully:", data);
      alert("Category added successfully!");
      router.push("/dashboard/categories");
    } catch (error) {
      console.error("Error adding category:", error);
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      alert(`Error adding category: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const isSubCategory = !!parentId && parentId !== "none";
  const selectedParent = categories.find((cat) => cat.id === parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Category</h1>
          <p className="text-gray-600">
            Create a new category for your products
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter category name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter category description"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Category Logo</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {logoUrl && !logoUrl.startsWith("📁") ? (
                            <img
                              src={logoUrl || "/placeholder.svg"}
                              alt="Category logo"
                              className="w-20 h-20 object-cover rounded-lg mb-2"
                            />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-4 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">
                                  Click to upload
                                </span>{" "}
                                category logo
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="parentId">Parent Category (Optional)</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category (leave empty for main category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        No Parent (Main Category)
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            {typeof category.logo_url === "string" &&
                            category.logo_url.startsWith("http") ? (
                              <img
                                src={category.logo_url || "/placeholder.svg"}
                                alt=""
                                className="w-4 h-4 rounded"
                              />
                            ) : (
                              <span>{category.logo_url}</span>
                            )}
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to create a main category, or select a parent to
                    create a subcategory
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge
                    variant={isSubCategory ? "secondary" : "default"}
                    className="mb-2"
                  >
                    {isSubCategory ? "Sub Category" : "Main Category"}
                  </Badge>

                  {isSubCategory && selectedParent && (
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Parent:</strong> {selectedParent.name}
                      </p>
                      <p className="text-xs">
                        {selectedParent.logo_url} {selectedParent.description}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {logoUrl && !logoUrl.startsWith("📁") ? (
                        <img
                          src={logoUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">📁</span>
                      )}
                    </div>
                    <h3 className="font-semibold">{name || "Category Name"}</h3>
                    <p className="text-sm text-gray-600">
                      {description || "Category description"}
                    </p>

                    {isSubCategory && selectedParent && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Under:</p>
                        <p className="text-sm font-medium">
                          {selectedParent.logo_url} {selectedParent.name}
                        </p>
                      </div>
                    )}

                    <Badge
                      variant={isSubCategory ? "secondary" : "default"}
                      className="mt-2"
                    >
                      {isSubCategory ? "Sub Category" : "Main Category"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Product Organization</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-green-600" />
                    <span>Easy Navigation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Search Filtering</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || uploadingImage}>
            <Save className="w-4 h-4 mr-2" />
            {loading
              ? "Creating Category..."
              : uploadingImage
              ? "Uploading Image..."
              : "Create Category"}
          </Button>
        </div>
      </form>
    </div>
  );
}
