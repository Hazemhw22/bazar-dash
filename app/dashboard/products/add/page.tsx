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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Category, Shop, ProductInsert } from "@/types/database";
import { ArrowLeft, Package, Upload, X, Save } from "lucide-react";
import { useNotifications } from "@/components/notifications/NotificationProvider";

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [user, setUser] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [shopId, setShopId] = useState("");
  const [specifications, setSpecifications] = useState<
    { title: string; description: string }[]
  >([]);
  const [specTitle, setSpecTitle] = useState("");
  const [specDesc, setSpecDesc] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // إضافة حالة لصورة رئيسية
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");
  const [mainImageUrl, setMainImageUrl] = useState<string>("");

  // خصائص المنتج (عنوان الخاصية وقائمة الخيارات)
  const [properties, setProperties] = useState<
    { title: string; options: string[] }[]
  >([]);
  const [propertyTitle, setPropertyTitle] = useState("");
  const [propertyOptions, setPropertyOptions] = useState<string[]>([""]);

  const { notify } = useNotifications();

  useEffect(() => {
    getCurrentUser();
    fetchCategories();
    fetchShops();
  }, []);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Auth error:", error);
        return;
      }

      setUser(user);
    } catch (error) {
      console.error("Error getting user:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
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

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Fetch shops error:", error);
        throw error;
      }

      setShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
      setShops([]);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);

    try {
      const newFiles = [...imageFiles, ...files].slice(0, 5); // Max 5 images
      const newPreviews: string[] = [];

      for (const file of files) {
        if (images.length + newPreviews.length >= 5) break;
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
      }

      setImageFiles(newFiles);
      setImages([...images, ...newPreviews]);
    } catch (error) {
      console.error("Error handling image upload:", error);
    } finally {
      setUploadingImages(false);
    }
  };

  // رفع صورة رئيسية
  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainImageFile(file);
    setMainImagePreview(URL.createObjectURL(file));
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newFiles = imageFiles.filter((_, i) => i !== index);

    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(images[index]);

    setImages(newImages);
    setImageFiles(newFiles);
  };

  // إضافة عنوان وشرح للمواصفات
  const addSpecification = () => {
    if (specTitle.trim()) {
      setSpecifications([
        ...specifications,
        { title: specTitle.trim(), description: specDesc.trim() },
      ]);
      setSpecTitle("");
      setSpecDesc("");
    }
  };
  const removeSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  // إضافة خاصية جديدة
  const addProperty = () => {
    if (propertyTitle.trim() && propertyOptions.some((opt) => opt.trim())) {
      setProperties([
        ...properties,
        {
          title: propertyTitle.trim(),
          options: propertyOptions.map((opt) => opt.trim()).filter(Boolean),
        },
      ]);
      setPropertyTitle("");
      setPropertyOptions([""]);
    }
  };
  const removeProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };
  const handleOptionChange = (idx: number, value: string) => {
    setPropertyOptions((options) =>
      options.map((opt, i) => (i === idx ? value : opt))
    );
  };
  const addOptionField = () => {
    setPropertyOptions((options) => [...options, ""]);
  };
  const removeOptionField = (idx: number) => {
    setPropertyOptions((options) => options.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate required fields
      if (!name.trim()) {
        alert("Please enter a product name");
        return;
      }

      if (!price.trim()) {
        alert("Please enter a price");
        return;
      }

      if (!categoryId) {
        alert("Please select a category");
        return;
      }

      if (!shopId) {
        alert("Please select a shop");
        return;
      }

      if (!user) {
        alert("User not authenticated");
        return;
      }

      // رفع صورة رئيسية
      let uploadedMainImageUrl = "";
      if (mainImageFile) {
        const url = await uploadImage(mainImageFile);
        if (url) uploadedMainImageUrl = url;
        setMainImageUrl(uploadedMainImageUrl);
      }
      // رفع صور أخرى
      const uploadedImageUrls: string[] = [];
      for (const file of imageFiles) {
        const uploadedUrl = await uploadImage(file);
        if (uploadedUrl) uploadedImageUrls.push(uploadedUrl);
      }

      const productData: ProductInsert = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number.parseFloat(price),
        discount_price: discountPrice ? Number.parseFloat(discountPrice) : null,
        stock_quantity: Number.parseInt(stockQuantity) || 0,
        category_id: categoryId,
        shop_id: shopId,
        specifications: specifications.length > 0 ? specifications : null,
        properties: properties.length > 0 ? properties : null,
        is_active: isActive,
        main_image: uploadedMainImageUrl || uploadedImageUrls[0] || null,
        images: uploadedImageUrls,
      };

      console.log("Inserting product data:", productData);

      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select();

      if (error) {
        notify({ type: "error", message: error.message || "Error adding product." });
        throw error;
      }

      notify({ type: "success", message: "Product added successfully!" });
      router.push("/dashboard/products");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      notify({ type: "error", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((cat) => cat.id === categoryId);
  const selectedShop = shops.find((shop) => shop.id === shopId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600">Create a new product for your shop</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter product description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="discountPrice">Discount Price</Label>
                    <Input
                      id="discountPrice"
                      type="number"
                      step="0.01"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="stockQuantity">Stock Quantity</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoryId">Category *</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
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
                  </div>

                  <div>
                    <Label htmlFor="shopId">Shop *</Label>
                    <Select value={shopId} onValueChange={setShopId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            <div className="flex items-center space-x-2">
                              {typeof shop.logo_url === "string" &&
                              shop.logo_url.startsWith("http") ? (
                                <img
                                  src={shop.logo_url || "/placeholder.svg"}
                                  alt=""
                                  className="w-4 h-4 rounded"
                                />
                              ) : (
                                <span>{shop.logo_url}</span>
                              )}
                              <span>{shop.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="specifications">Specifications</Label>
                  <div className="flex flex-col space-y-2">
                    {specifications.map((spec, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{spec.title}</p>
                          <p className="text-sm text-gray-600">
                            {spec.description}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeSpecification(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex space-x-2">
                      <Input
                        value={specTitle}
                        onChange={(e) => setSpecTitle(e.target.value)}
                        placeholder="Specification title"
                        className="flex-1"
                      />
                      <Input
                        value={specDesc}
                        onChange={(e) => setSpecDesc(e.target.value)}
                        placeholder="Specification description"
                        className="flex-1"
                      />
                      <Button
                        onClick={addSpecification}
                        disabled={!specTitle.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* خصائص المنتج (عنوان الخاصية وقائمة الخيارات) */}
                <div>
                  <Label htmlFor="properties">Product Properties</Label>
                  <div className="flex flex-col space-y-2">
                    {properties.map((prop, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{prop.title}</p>
                          <ul className="text-sm text-gray-600 list-disc ml-4">
                            {prop.options.map((opt, i) => (
                              <li key={i}>{opt}</li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeProperty(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-col space-y-2">
                      <Input
                        value={propertyTitle}
                        onChange={(e) => setPropertyTitle(e.target.value)}
                        placeholder="Property title (e.g. Capacity, Color)"
                        className="flex-1"
                      />
                      {propertyOptions.map((opt, idx) => (
                        <div key={idx} className="flex space-x-2 items-center">
                          <Input
                            value={opt}
                            onChange={(e) =>
                              handleOptionChange(idx, e.target.value)
                            }
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOptionField(idx)}
                            disabled={propertyOptions.length === 1}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={addOptionField}
                      >
                        Add Option
                      </Button>
                      <Button
                        onClick={addProperty}
                        disabled={
                          !propertyTitle.trim() ||
                          !propertyOptions.some((opt) => opt.trim())
                        }
                      >
                        Add Property
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Upload Images (Max 5)</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-4 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">
                              Click to upload
                            </span>{" "}
                            product images
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG or GIF (MAX. 5 images)
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          disabled={uploadingImages || images.length >= 5}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Product ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main Image */}
            <Card>
              <CardHeader>
                <CardTitle>Main Product Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Upload Main Image</Label>
                  <div className="mt-2 flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {mainImagePreview ? (
                          <img
                            src={mainImagePreview}
                            alt="Main Preview"
                            className="w-24 h-24 object-cover rounded-lg mb-2"
                          />
                        ) : (
                          <Upload className="w-8 h-8 mb-4 text-gray-500" />
                        )}
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span>{" "}
                          main image
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or GIF</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleMainImageUpload}
                        disabled={uploadingImages}
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active Product</Label>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Category:</strong>{" "}
                    {selectedCategory?.name || "Not selected"}
                  </p>
                  <p>
                    <strong>Shop:</strong>{" "}
                    {selectedShop?.name || "Not selected"}
                  </p>
                  <p>
                    <strong>Images:</strong> {images.length}/5
                  </p>
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
                    {images.length > 0 ? (
                      <img
                        src={images[0] || "/placeholder.svg"}
                        alt="Product preview"
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <h3 className="font-semibold">{name || "Product Name"}</h3>
                    <p className="text-sm text-gray-600">
                      {description || "Product description"}
                    </p>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <p className="text-lg font-bold text-green-600">
                        ${price || "0.00"}
                      </p>
                      {discountPrice && (
                        <p className="text-sm text-gray-500 line-through">
                          ${discountPrice}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="mt-2"
                    >
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Inventory Management</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-green-600" />
                    <span>Order Tracking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>Sales Analytics</span>
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
          <Button type="submit" disabled={loading || uploadingImages}>
            <Save className="w-4 h-4 mr-2" />
            {loading
              ? "Creating Product..."
              : uploadingImages
              ? "Uploading Images..."
              : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
