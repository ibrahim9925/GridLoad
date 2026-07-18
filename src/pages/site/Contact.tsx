import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin } from "lucide-react";

const COUNTRIES = [
  "Palestine","Jordan","Saudi Arabia","UAE","Egypt","Iraq","Lebanon","Syria",
  "Turkey","Kuwait","Qatar","Bahrain","Oman","Yemen","Other",
];

const schema = z.object({
  name: z.string().trim().min(2, "Name required").max(120),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(200),
  phone: z.string().trim().min(5, "Phone required").max(40),
  country: z.string().trim().min(1, "Country required"),
  product_interest: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export default function Contact() {
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    country: "",
    product_interest: params.get("product") ?? "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Contact — GridLoad Energy";
  }, []);

  const handle = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.from("quotes").insert([{
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      country: parsed.data.country,
      company: parsed.data.company || null,
      product_interest: parsed.data.product_interest || null,
      message: parsed.data.message || null,
    }] as any);
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not submit", description: error.message });
      return;
    }
    setDone(true);
  };

  return (
    <SiteLayout>
      <div className="bg-gridload-navy text-white py-12">
        <div className="gridload-container">
          <h1 className="text-3xl md:text-5xl font-bold">Get a Quote</h1>
          <p className="mt-2 text-white/80">Our team responds within 24 hours.</p>
        </div>
      </div>

      <div className="gridload-container py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-gridload-lightgray rounded-lg p-6">
          {done ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-gridload-green/10 text-gridload-green flex items-center justify-center text-3xl">✓</div>
              <h2 className="mt-4 text-2xl font-bold text-gridload-navy">Inquiry received</h2>
              <p className="mt-2 text-muted-foreground">Our team will contact you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name *" error={errors.name}>
                  <input
                    value={form.name}
                    onChange={(e) => handle("name", e.target.value)}
                    className="input"
                    required
                  />
                </Field>
                <Field label="Company Name">
                  <input
                    value={form.company}
                    onChange={(e) => handle("company", e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Email *" error={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handle("email", e.target.value)}
                    className="input"
                    required
                  />
                </Field>
                <Field label="Phone / WhatsApp *" error={errors.phone}>
                  <input
                    value={form.phone}
                    onChange={(e) => handle("phone", e.target.value)}
                    className="input"
                    required
                  />
                </Field>
                <Field label="Country *" error={errors.country}>
                  <select
                    value={form.country}
                    onChange={(e) => handle("country", e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Product Interest">
                  <input
                    value={form.product_interest}
                    onChange={(e) => handle("product_interest", e.target.value)}
                    className="input"
                    placeholder="e.g. Deye 12kW or Panels"
                  />
                </Field>
              </div>
              <Field label="Message">
                <textarea
                  value={form.message}
                  onChange={(e) => handle("message", e.target.value)}
                  className="input min-h-[120px] resize-y"
                  placeholder="Quantities, project location, timing..."
                />
              </Field>
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto px-6 py-3 rounded-md bg-gridload-green text-white font-semibold hover:bg-gridload-green/90 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Inquiry"}
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-gridload-navy text-white rounded-lg p-6">
            <h3 className="font-bold text-lg">Reach us directly</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-3"><Mail className="h-5 w-5 text-gridload-yellow shrink-0" /> info@gridload.com</li>
              <li className="flex items-start gap-3"><Phone className="h-5 w-5 text-gridload-yellow shrink-0" /> +970 000 000 000</li>
              <li className="flex items-start gap-3"><MapPin className="h-5 w-5 text-gridload-yellow shrink-0" /> Palestine</li>
            </ul>
          </div>
          <div className="bg-gridload-offwhite rounded-lg p-6 text-sm text-gridload-navy/80">
            We typically reply within one business day. For urgent requests, message us on WhatsApp.
          </div>
        </aside>
      </div>

      <style>{`.input{width:100%;padding:0.6rem 0.75rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:white;font-size:0.9rem;color:hsl(var(--foreground))}.input:focus{outline:none;border-color:hsl(var(--ring));box-shadow:0 0 0 2px hsl(var(--ring)/0.2)}`}</style>
    </SiteLayout>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gridload-navy mb-1">{label}</span>
      {children}
      {error && <span className="block mt-1 text-xs text-destructive">{error}</span>}
    </label>
  );
}
