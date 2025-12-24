"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Address = {
  id: string;
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault?: boolean;
};

export default function AddressesPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Address>>({});

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/addresses?tenantSlug=${tenantSlug}`, {
          headers: { "x-tenant-slug": tenantSlug },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load addresses");
        const data = await res.json();
        setAddresses(data ?? []);
      } catch (e: any) {
        toast.error(e.message || "Unable to fetch addresses");
      } finally {
        setLoading(false);
      }
    }
    if (tenantSlug) load();
  }, [tenantSlug]);

  const handleCreate = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/addresses?tenantSlug=${tenantSlug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify({ ...form, tenantSlug }),
      });
      if (!res.ok) throw new Error("Failed to save address");
      toast.success("Address saved");
      // refresh list
      const list = await fetch(`/api/addresses?tenantSlug=${tenantSlug}`, {
        headers: { "x-tenant-slug": tenantSlug },
        cache: "no-store",
      });
      const data = await list.json();
      setAddresses(data?.addresses ?? []);
      setForm({});
    } catch (e: any) {
      toast.error(e.message || "Unable to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}?tenantSlug=${tenantSlug}`, {
        method: "DELETE",
        headers: { "x-tenant-slug": tenantSlug },
      });
      if (!res.ok) throw new Error("Failed to delete address");
      toast.success("Address deleted");
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      toast.error(e.message || "Unable to delete address");
    }
  };

  const setDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}/default?tenantSlug=${tenantSlug}`, {
        method: "POST",
        headers: { "x-tenant-slug": tenantSlug },
      });
      if (!res.ok) throw new Error("Failed to set default address");
      toast.success("Default address updated");
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (e: any) {
      toast.error(e.message || "Unable to set default address");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar tenantSlug={tenantSlug} />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">Your Addresses</h1>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            {addresses.length === 0 && <div className="text-sm text-muted-foreground">No addresses saved.</div>}
            {addresses.map((a) => (
              <div key={a.id} className="border rounded-md p-4 flex items-start justify-between">
                <div>
                  <div className="font-medium">
                    {a.name} {a.isDefault && <span className="ml-2 text-xs rounded px-2 py-1 bg-primary/10 text-primary">Default</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{a.line1}</div>
                    {a.line2 && <div>{a.line2}</div>}
                    <div>
                      {a.city}, {a.state} {a.postalCode}
                    </div>
                    <div>{a.country}</div>
                    {a.phone && <div>Phone: {a.phone}</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!a.isDefault && (
                    <Button variant="secondary" onClick={() => setDefault(a.id)}>Set Default</Button>
                  )}
                  <Button variant="destructive" onClick={() => handleDelete(a.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-semibold mb-3">Add New Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Name" value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Phone (optional)" value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Address line 1" value={form.line1 ?? ""} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} />
            <Input placeholder="Address line 2 (optional)" value={form.line2 ?? ""} onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))} />
            <Input placeholder="City" value={form.city ?? ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            <Input placeholder="State" value={form.state ?? ""} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            <Input placeholder="Postal Code" value={form.postalCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} />
            <Input placeholder="Country" value={form.country ?? ""} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          </div>
          <div className="mt-4">
            <Button onClick={handleCreate} disabled={saving || !tenantSlug}>
              {saving ? "Saving..." : "Save Address"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
