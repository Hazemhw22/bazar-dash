"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload } from "lucide-react";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [avatarType, setAvatarType] = useState<"custom" | "male" | "female">(
    "custom"
  );
  // روابط أفاتار مجانية من الإنترنت (كلاهما لرجل لكن بشكلين مختلفين)
  const maleAvatar = "https://avatars.dicebear.com/api/micah/male1.svg";
  const femaleAvatar = "https://avatars.dicebear.com/api/micah/male2.svg";

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line
  }, [userId]);

  useEffect(() => {
    // عند تحميل بيانات المستخدم، إذا كان الأفاتار ثابت، حدّد النوع
    if (avatarUrl === maleAvatar) setAvatarType("male");
    else if (avatarUrl === femaleAvatar) setAvatarType("female");
    else setAvatarType("custom");
  }, [avatarUrl]);

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
      setFullName(data.full_name || "");
      setEmail(data.email || "");
      setPhoneNumber(data.phone_number || "");
      setAddress(data.address || "");
      setAvatarUrl(data.avatar_url || "");
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      return null;
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setUploadingImage(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarType === "custom" && avatarFile) {
        const uploadedUrl = await uploadImage(avatarFile);
        if (uploadedUrl) finalAvatarUrl = uploadedUrl;
      }
      // إذا اختار ثابت، استخدم الرابط مباشرة
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          email: email.trim(),
          phone_number: phoneNumber.trim() || null,
          address: address.trim() || null,
          avatar_url: finalAvatarUrl,
        })
        .eq("id", userId);
      if (error) throw error;
      alert("User updated successfully!");
      router.push(`/dashboard/users`);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit User</h1>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <Label>Avatar</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      className={`border rounded-full p-1 ${
                        avatarType === "male" ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => {
                        setAvatarType("male");
                        setAvatarUrl(maleAvatar);
                        setAvatarFile(null);
                      }}
                    >
                      <img
                        src={maleAvatar}
                        alt="Male"
                        className="w-16 h-16 object-cover rounded-full"
                      />
                    </button>
                    <button
                      type="button"
                      className={`border rounded-full p-1 ${
                        avatarType === "female" ? "ring-2 ring-pink-500" : ""
                      }`}
                      onClick={() => {
                        setAvatarType("female");
                        setAvatarUrl(femaleAvatar);
                        setAvatarFile(null);
                      }}
                    >
                      <img
                        src={femaleAvatar}
                        alt="امرأة"
                        className="w-16 h-16 object-cover rounded-full"
                      />
                    </button>
                    <button
                      type="button"
                      className={`border rounded-full p-1 ${
                        avatarType === "custom" ? "ring-2 ring-green-500" : ""
                      }`}
                      onClick={() => setAvatarType("custom")}
                    >
                      <Upload className="w-8 h-8 text-gray-500 mx-auto rounded-full" />
                    </button>
                  </div>
                  {avatarType === "custom" && (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {avatarUrl &&
                        ![maleAvatar, femaleAvatar].includes(avatarUrl) ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-16 h-16 object-cover rounded-full mb-2"
                          />
                        ) : (
                          <>
                            <Upload className="w-16 h-16 mb-2 text-gray-300 rounded-full border border-dashed" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">
                                اضغط لرفع صورة
                              </span>
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                  {/* إذا لم يتم اختيار أي أفاتار ولا صورة، أظهر أيقونة */}
                  {avatarType === "custom" && !avatarUrl && (
                    <div className="flex flex-col items-center justify-center mt-2">
                      <Upload className="w-16 h-16 text-gray-300 mb-2 rounded-full border border-dashed" />
                      <div className="text-xs text-gray-400">لا يوجد صورة</div>
                    </div>
                  )}
                </div>
              </div>
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
              ? "Uploading Image..."
              : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
