"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddUserPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("customer");

  const [createShop, setCreateShop] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [timezone, setTimezone] = useState("Asia/Riyadh");

  const [withSubscription, setWithSubscription] = useState(true);
  const [plan, setPlan] = useState("monthly");
  const [freeMonth, setFreeMonth] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          shop: createShop && role === "vendor" ? {
            name: shopName,
            phone_number: shopPhone || null,
            address: shopAddress || null,
            timezone,
            is_active: true,
          } : null,
          subscription: withSubscription ? { plan, freeMonth } : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setSuccess("User created successfully");
      setEmail(""); setPassword(""); setFullName(""); setRole("customer");
      setCreateShop(false); setShopName(""); setShopPhone(""); setShopAddress("");
      setWithSubscription(true); setPlan("monthly"); setFreeMonth(false);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Add User</h1>
          <p className="text-muted-foreground">Create subscriber accounts (optionally vendor with a shop)</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Subscriber</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </div>
              <div>
                <Label>Password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="vendor">Vendor (Shop Owner)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={createShop} onCheckedChange={setCreateShop} />
              <span>Create shop (for vendor)</span>
            </div>

            {createShop && role === "vendor" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded-md">
                <div>
                  <Label>Shop Name</Label>
                  <Input value={shopName} onChange={(e) => setShopName(e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={withSubscription} onCheckedChange={setWithSubscription} />
              <span>Include subscription</span>
            </div>

            {withSubscription && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-3 rounded-md">
                <div>
                  <Label>Plan</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">1 month (₪100)</SelectItem>
                      <SelectItem value="semi_annual">6 months (₪500)</SelectItem>
                      <SelectItem value="annual">12 months (₪1000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Switch checked={freeMonth} onCheckedChange={setFreeMonth} />
                  <span>Free first month</span>
                </div>
              </div>
            )}

            {error && <div className="text-red-500 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create User"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


