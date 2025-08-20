import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

type Plan = "monthly" | "semi_annual" | "annual";

const PLAN_MONTHS: Record<Plan, number> = {
  monthly: 1,
  semi_annual: 6,
  annual: 12,
};

const PLAN_PRICE: Record<Plan, number> = {
  monthly: 100,
  semi_annual: 500,
  annual: 1000,
};

export async function POST(req: Request) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      email,
      password,
      full_name,
      role = "customer",
      shop,
      subscription,
    }: {
      email: string;
      password: string;
      full_name?: string;
      role?: "customer" | "vendor" | "admin";
      shop?: {
        name: string;
        description?: string | null;
        phone_number?: string | null;
        address?: string | null;
        timezone?: string | null;
        is_active?: boolean;
      } | null;
      subscription?: { plan?: Plan; freeMonth?: boolean } | null;
    } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }

    // 1) Create auth user (confirm immediately)
    const { data: userRes, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (createErr || !userRes.user) {
      return NextResponse.json({ error: createErr?.message || "create user failed" }, { status: 400 });
    }
    const user = userRes.user;

    // 2) Ensure profile
    const { error: profileErr } = await admin.from("profiles").upsert({
      id: user.id,
      full_name: full_name || "",
      email,
      role: role || "customer",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    // 3) Optional shop for vendor
    if (role === "vendor" && shop?.name) {
      const { error: shopErr } = await admin.from("shops").insert({
        name: shop.name.trim(),
        description: shop.description || null,
        owner_id: user.id,
        email,
        phone_number: shop.phone_number || null,
        address: shop.address || null,
        logo_url: "🏪",
        background_image_url: null,
        is_active: shop.is_active ?? true,
        working_hours: null,
        timezone: shop.timezone || "Asia/Riyadh",
        delivery_time_from: 30,
        delivery_time_to: 60,
      });
      if (shopErr) {
        return NextResponse.json({ error: shopErr.message }, { status: 400 });
      }
    }

    // 4) Optional subscription and invoice
    if (subscription) {
      const plan: Plan = subscription.plan || "monthly";
      const months = PLAN_MONTHS[plan];
      const price = PLAN_PRICE[plan];

      const now = new Date();
      let start = new Date(now);
      let end = new Date(now);
      end.setMonth(end.getMonth() + months);

      // Free month option
      if (subscription.freeMonth) {
        // start now, end now + 1 month; create free invoice
        end = new Date(now);
        end.setMonth(end.getMonth() + 1);
        const { error: invErrFree } = await admin.from("invoices").insert({
          user_id: user.id,
          subscription_id: null,
          amount: 0,
          currency: "ILS",
          issued_at: now.toISOString(),
          due_at: null,
          status: "paid",
        });
        if (invErrFree) {
          return NextResponse.json({ error: invErrFree.message }, { status: 400 });
        }
      } else {
        // paid plan invoice (unpaid by default)
        const { error: invErr } = await admin.from("invoices").insert({
          user_id: user.id,
          subscription_id: null,
          amount: price,
          currency: "ILS",
          issued_at: now.toISOString(),
          due_at: null,
          status: "unpaid",
        });
        if (invErr) {
          return NextResponse.json({ error: invErr.message }, { status: 400 });
        }
      }

      const { error: subErr } = await admin.from("subscriptions").insert({
        user_id: user.id,
        plan,
        price: subscription.freeMonth ? 0 : price,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        is_active: true,
      });
      if (subErr) {
        return NextResponse.json({ error: subErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ user_id: user.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unexpected" }, { status: 500 });
  }
}


