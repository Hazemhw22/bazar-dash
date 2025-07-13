"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, ImageIcon, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState<number | null>(null);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState<string>("");
  const [shopId, setShopId] = useState<string>("");
  const [deliveryTimeFrom, setDeliveryTimeFrom] = useState<number>(0);
  const [deliveryTimeTo, setDeliveryTimeTo] = useState<number>(0);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [specifications, setSpecifications] = useState<
    { title: string; description: string }[]
  >([]);
  const [specTitle, setSpecTitle] = useState("");
  const [specDesc, setSpecDesc] = useState("");

  // خصائص المنتج (عنوان الخاصية وقائمة الخيارات)
  const [properties, setProperties] = useState<
    { title: string; options: string[] }[]
  >([]);
  const [propertyTitle, setPropertyTitle] = useState("");
  const [propertyOptions, setPropertyOptions] = useState<string[]>([""]);

  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchShops();
    // eslint-disable-next-line
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (error) throw error;
      setName(data.name || "");
      setDescription(data.description || "");
      setPrice(data.price || 0);
      setDiscountPrice(data.discount_price || null);
      setStockQuantity(data.stock_quantity || 0);
      setIsActive(data.is_active);
      setCategoryId(data.category_id || "");
      setShopId(data.shop_id || "");
      setImages(data.images || []);
      setSpecifications(data.specifications || []);
      setProperties(data.properties || []);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name");
    setCategories(data || []);
  };

  const fetchShops = async () => {
    const { data } = await supabase.from("shops").select("id, name");
    setShops(data || []);
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
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImage(true);
    setImageFiles(files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImages(previews);
    setUploadingImage(false);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let finalImages = images;
      if (imageFiles.length > 0) {
        const uploaded = await Promise.all(
          imageFiles.map((file) => uploadImage(file))
        );
        finalImages = uploaded.filter(Boolean) as string[];
      }
      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: price,
        discount_price: discountPrice,
        stock_quantity: stockQuantity,
        is_active: isActive,
        category_id: categoryId,
        shop_id: shopId,
        images: finalImages,
        specifications: specifications.length > 0 ? specifications : null,
        properties: properties.length > 0 ? properties : null,
      };
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", productId);
      if (error) {
        addNotification({ type: "error", title: "Error", message: error.message || "Error updating product." });
        throw error;
      }
      addNotification({ type: "success", title: "Success", message: "Product updated successfully!" });
      router.push(`/dashboard/products`);
    } catch (err: any) {
      setError(err.message || "Unknown error");
              addNotification({ type: "error", title: "Error", message: err.message || "Unknown error" });
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Product</h1>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="discountPrice">Discount Price</Label>
                  <Input
                    id="discountPrice"
                    type="number"
                    value={discountPrice ?? ""}
                    onChange={(e) =>
                      setDiscountPrice(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shop">Shop *</Label>
                <Select value={shopId} onValueChange={setShopId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Images</Label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {images && images.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Product"
                              className="w-16 h-16 object-cover rounded"
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-4 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">
                              Click to upload
                            </span>{" "}
                            product images
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="specTitle">Specification Title</Label>
                  <Input
                    id="specTitle"
                    value={specTitle}
                    onChange={(e) => setSpecTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="specDesc">Specification Description</Label>
                  <Input
                    id="specDesc"
                    value={specDesc}
                    onChange={(e) => setSpecDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={addSpecification}
                  disabled={!specTitle}
                >
                  Add Specification
                </Button>
              </div>
              {specifications.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold">
                    Current Specifications
                  </h3>
                  <div className="mt-2 space-y-2">
                    {specifications.map((spec, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{spec.title}</p>
                          <p className="text-sm text-gray-500">
                            {spec.description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeSpecification(index)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Product Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyTitle">Property Title</Label>
                  <Input
                    id="propertyTitle"
                    value={propertyTitle}
                    onChange={(e) => setPropertyTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="propertyOptions">Property Options</Label>
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
                  <div className="flex justify-end space-x-2">
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
              {properties.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold">Current Properties</h3>
                  <div className="mt-2 space-y-2">
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || uploadingImage}>
            <Save className="w-4 h-4 mr-2" />
            {saving
              ? "Saving..."
              : uploadingImage
              ? "Uploading Images..."
              : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
