"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProfileRow = { id: string; email: string; full_name: string | null; role: string };
type SubscriptionRow = { id: string; user_id: string; plan: string; price: number; start_date: string; end_date: string; is_active: boolean };

const PLAN_LABEL: Record<string, string> = {
  monthly: "1 month (₪100)",
  semi_annual: "6 months (₪500)",
  annual: "12 months (₪1000)",
};

export default function SubscriptionsPage() {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [subsByUser, setSubsByUser] = useState<Record<string, SubscriptionRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [planByUser, setPlanByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      const userIds = (profiles || []).map((p) => p.id);
      let subMap: Record<string, SubscriptionRow[]> = {};
      if (userIds.length > 0) {
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("id, user_id, plan, price, start_date, end_date, is_active")
          .in("user_id", userIds)
          .order("end_date", { ascending: false });
        (subs || []).forEach((s) => {
          if (!subMap[s.user_id]) subMap[s.user_id] = [];
          subMap[s.user_id].push(s);
        });
      }

      setUsers(profiles || []);
      setSubsByUser(subMap);
    } finally {
      setLoading(false);
    }
  };

  const renew = async (userId: string) => {
    const plan = planByUser[userId] || "monthly";
    const res = await fetch("/api/admin/subscriptions/renew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, plan }),
    });
    if (res.ok) {
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage subscriber plans and renewals</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Non-Admin Subscribers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((u) => {
            const current = (subsByUser[u.id] || [])[0];
            return (
              <div key={u.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border p-3 rounded-md">
                <div>
                  <div className="font-medium">{u.full_name || u.email}</div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                  {current ? (
                    <div className="text-sm mt-1">
                      Current: {PLAN_LABEL[current.plan] || current.plan} | {new Date(current.start_date).toLocaleDateString()} → {new Date(current.end_date).toLocaleDateString()} {current.is_active ? "(active)" : ""}
                    </div>
                  ) : (
                    <div className="text-sm mt-1">No active subscription</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={planByUser[u.id] || "monthly"} onValueChange={(v) => setPlanByUser((p) => ({ ...p, [u.id]: v }))}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{PLAN_LABEL.monthly}</SelectItem>
                      <SelectItem value="semi_annual">{PLAN_LABEL.semi_annual}</SelectItem>
                      <SelectItem value="annual">{PLAN_LABEL.annual}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => renew(u.id)}>Renew</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}


