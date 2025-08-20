"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type InvoiceRow = { id: string; user_id: string; amount: number; currency: string; issued_at: string; status: string };
type ProfileMap = Record<string, { email: string; full_name: string | null }>;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [users, setUsers] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, user_id, amount, currency, issued_at, status")
        .order("issued_at", { ascending: false });

      const userIds = Array.from(new Set((inv || []).map((i) => i.user_id)));
      let profileMap: ProfileMap = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, full_name, role")
          .in("id", userIds)
          .neq("role", "admin");
        (profs || []).forEach((p: any) => {
          profileMap[p.id] = { email: p.email, full_name: p.full_name };
        });
      }

      setInvoices(inv || []);
      setUsers(profileMap);
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = (invoice: InvoiceRow) => {
    const user = users[invoice.user_id];
    const w = window.open("", "print");
    if (!w) return;
    const html = `
      <html>
        <head>
          <title>Invoice ${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin-bottom: 8px; }
            .muted { color: #666; }
            .row { margin: 8px 0; }
          </style>
        </head>
        <body>
          <h1>Invoice</h1>
          <div class="row"><strong>Invoice ID:</strong> ${invoice.id}</div>
          <div class="row"><strong>Customer:</strong> ${user?.full_name || user?.email || invoice.user_id}</div>
          <div class="row"><strong>Email:</strong> ${user?.email || ""}</div>
          <div class="row"><strong>Issued:</strong> ${new Date(invoice.issued_at).toLocaleString()}</div>
          <div class="row"><strong>Amount:</strong> ${invoice.amount} ${invoice.currency}</div>
          <div class="row"><strong>Status:</strong> ${invoice.status}</div>
          <hr/>
          <div class="muted">Printed from PAZAR Dashboard</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
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
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Print subscription invoices for non-admin users</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border p-3 rounded-md">
              <div>
                <div className="font-medium">{users[inv.user_id]?.full_name || users[inv.user_id]?.email || inv.user_id}</div>
                <div className="text-sm text-muted-foreground">{new Date(inv.issued_at).toLocaleString()} • {inv.status}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-semibold">{inv.amount} {inv.currency}</div>
                <Button variant="outline" onClick={() => printInvoice(inv)}>Print</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


