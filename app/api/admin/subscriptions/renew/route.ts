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
    const { user_id, plan }: { user_id: string; plan: Plan } = body;
    if (!user_id || !plan) {
      return NextResponse.json({ error: "user_id and plan required" }, { status: 400 });
    }

    const months = PLAN_MONTHS[plan];
    const price = PLAN_PRICE[plan];

    // Determine start date from last subscription end or now
    const { data: lastSubs } = await admin
      .from("subscriptions")
      .select("end_date")
      .eq("user_id", user_id)
      .order("end_date", { ascending: false })
      .limit(1);

    const now = new Date();
    let start = new Date(now);
    if (lastSubs && lastSubs.length > 0) {
      const lastEnd = new Date(lastSubs[0].end_date);
      if (lastEnd.getTime() > now.getTime()) {
        start = lastEnd; // extend from last end
      }
    }
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);

    const { error: subErr } = await admin.from("subscriptions").insert({
      user_id,
      plan,
      price,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      is_active: true,
    });
    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 400 });
    }

    const { error: invErr } = await admin.from("invoices").insert({
      user_id,
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unexpected" }, { status: 500 });
  }
}


