"use client";

import type React from "react";
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
import type { WorkingHours } from "@/types/database";
import {
  ArrowLeft,
  Store,
  Upload,
  ImageIcon,
  Clock,
  Copy,
  Save,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIMEZONES = [
  { value: "Asia/Jerusalem", label: "Israel (GMT+2)" },
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Kuwait", label: "Kuwait (GMT+3)" },
  { value: "Asia/Qatar", label: "Qatar (GMT+3)" },
  { value: "Asia/Bahrain", label: "Bahrain (GMT+3)" },
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "Europe/London", label: "London (GMT)" },
];

export default function EditShopPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [timezone, setTimezone] = useState("Asia/Riyadh");
  const [deliveryTimeFrom, setDeliveryTimeFrom] = useState("");
  const [deliveryTimeTo, setDeliveryTimeTo] = useState("");
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [ownerName, setOwnerName] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchShop();
    // eslint-disable-next-line
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
      setName(data.name || "");
      setDescription(data.description || "");
      setEmail(data.email || "");
      setPhoneNumber(data.phone_number || "");
      setAddress(data.address || "");
      setLogoUrl(data.logo_url || "");
      setBackgroundImageUrl(data.background_image_url || "");
      setIsActive(data.is_active);
      setTimezone(data.timezone || "Asia/Riyadh");
      setDeliveryTimeFrom(data.delivery_time_from?.toString() || "");
      setDeliveryTimeTo(data.delivery_time_to?.toString() || "");
      setWorkingHours(
        data.working_hours ||
          DAYS_OF_WEEK.map((day) => ({
            day,
            open_time: "09:00",
            close_time: "18:00",
            is_open: true,
          }))
      );
      // fetch owner name from profiles
      if (data.owner_id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.owner_id)
          .single();
        setOwnerName(profile?.full_name || "");
      } else {
        setOwnerName("");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (
    file: File,
    folder = "shops"
  ): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("shop-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("shop-images")
        .getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      return null;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
    setUploadingImage(false);
  };

  const handleBackgroundUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setBackgroundFile(file);
    const previewUrl = URL.createObjectURL(file);
    setBackgroundImageUrl(previewUrl);
    setUploadingImage(false);
  };

  const updateWorkingHours = (
    index: number,
    field: keyof WorkingHours,
    value: string | boolean
  ) => {
    const updated = [...workingHours];
    updated[index] = { ...updated[index], [field]: value };
    setWorkingHours(updated);
  };

  const copyWorkingHours = (fromIndex: number) => {
    const sourceHours = workingHours[fromIndex];
    const updated = workingHours.map((hours, index) =>
      index !== fromIndex
        ? {
            ...hours,
            open_time: sourceHours.open_time,
            close_time: sourceHours.close_time,
            is_open: sourceHours.is_open,
          }
        : hours
    );
    setWorkingHours(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Upload logo if changed
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        const uploadedUrl = await uploadImage(logoFile, "shops/logos");
        if (uploadedUrl) finalLogoUrl = uploadedUrl;
      }
      // Upload background if changed
      let finalBackgroundUrl = backgroundImageUrl;
      if (backgroundFile) {
        const uploadedUrl = await uploadImage(
          backgroundFile,
          "shops/backgrounds"
        );
        if (uploadedUrl) finalBackgroundUrl = uploadedUrl;
      }
      const { error } = await supabase
        .from("shops")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          email: email.trim(),
          phone_number: phoneNumber.trim() || null,
          address: address.trim() || null,
          logo_url: finalLogoUrl,
          background_image_url: finalBackgroundUrl,
          is_active: isActive,
          working_hours: workingHours,
          timezone: timezone,
          delivery_time_from: Number.parseInt(deliveryTimeFrom) || 0,
          delivery_time_to: Number.parseInt(deliveryTimeTo) || 0,
        })
        .eq("id", shopId);
      if (error) {
        addNotification({ type: "error", title: "Error", message: error.message || "Error updating shop." });
        throw error;
      }
      addNotification({ type: "success", title: "Success", message: "Shop updated successfully!" });
      router.push(`/dashboard/shops/${shopId}`);
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
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Shop</h1>
          <p className="text-gray-600">Update shop details and settings</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shop Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Shop Name *</Label>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryTimeFrom">Delivery Time From (minutes)</Label>
                    <Input
                      id="deliveryTimeFrom"
                      type="number"
                      value={deliveryTimeFrom}
                      onChange={(e) => setDeliveryTimeFrom(e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryTimeTo">Delivery Time To (minutes)</Label>
                    <Input
                      id="deliveryTimeTo"
                      type="number"
                      value={deliveryTimeTo}
                      onChange={(e) => setDeliveryTimeTo(e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Working Hours */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Working Hours
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {workingHours.map((hours, index) => (
                  <div
                    key={hours.day}
                    className="flex items-center space-x-4 p-3 border rounded-lg"
                  >
                    <div className="w-24">
                      <Label className="text-sm font-medium">{hours.day}</Label>
                    </div>
                    <Switch
                      checked={hours.is_open}
                      onCheckedChange={(checked) =>
                        updateWorkingHours(index, "is_open", checked)
                      }
                    />
                    {hours.is_open ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="time"
                            value={hours.open_time}
                            onChange={(e) =>
                              updateWorkingHours(
                                index,
                                "open_time",
                                e.target.value
                              )
                            }
                            className="w-32"
                          />
                          <span className="text-gray-500">to</span>
                          <Input
                            type="time"
                            value={hours.close_time}
                            onChange={(e) =>
                              updateWorkingHours(
                                index,
                                "close_time",
                                e.target.value
                              )
                            }
                            className="w-32"
                          />
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          Open
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyWorkingHours(index)}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy to all
                        </Button>
                      </>
                    ) : (
                      <div className="text-sm text-red-600 font-medium">Closed</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Shop Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div>
                  <Label>Shop Logo</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {logoUrl && !logoUrl.startsWith("🏪") ? (
                            <img
                              src={logoUrl || "/placeholder.svg"}
                              alt="Shop logo"
                              className="w-20 h-20 object-cover rounded-lg mb-2"
                            />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-4 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">
                                  Click to upload
                                </span>{" "}
                                shop logo
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
                {/* Background Image Upload */}
                <div>
                  <Label>Background Image</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {backgroundImageUrl ? (
                            <img
                              src={backgroundImageUrl || "/placeholder.svg"}
                              alt="Background"
                              className="w-full h-20 object-cover rounded-lg mb-2"
                            />
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 mb-4 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">
                                  Click to upload
                                </span>{" "}
                                background image
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleBackgroundUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shop Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active Shop</Label>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Owner:</strong>{" "}
                    {ownerName ? ownerName : "Loading..."}
                  </p>
                  <p>
                    <strong>Timezone:</strong> {timezone}
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
                    <div className="w-16 h-16 mx-auto mb-2 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {logoUrl && !logoUrl.startsWith("🏪") ? (
                        <img
                          src={logoUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">🏪</span>
                      )}
                    </div>
                    <h3 className="font-semibold">{name || "Shop Name"}</h3>
                    <p className="text-sm text-gray-600">
                      {description || "Shop description"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{email}</p>
                    {phoneNumber && (
                      <p className="text-xs text-gray-500">{phoneNumber}</p>
                    )}
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
                <CardTitle>Today's Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const todayIndex = new Date().getDay();
                  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  const todayName = dayNames[todayIndex];
                  const todayHours = workingHours.find((h) => h.day === todayName);
                  return (
                    <div className="text-center">
                      <div className="text-lg font-semibold">{todayName}</div>
                      {todayHours?.is_open ? (
                        <div className="text-sm text-green-600">
                          {todayHours.open_time} - {todayHours.close_time}
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">Closed</div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Shop Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Store className="w-4 h-4 text-blue-600" />
                    <span>Product Management</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Store className="w-4 h-4 text-green-600" />
                    <span>Order Processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Store className="w-4 h-4 text-purple-600" />
                    <span>Analytics Dashboard</span>
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
