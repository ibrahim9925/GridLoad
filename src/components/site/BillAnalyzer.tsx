import { FormEvent, ReactNode, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Calculator, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  BillAnalyzerResult,
  calculateBillRecommendation,
  formatIls,
  formatNumber,
  quoteSearchParams,
  INSTALLED_COST_PER_KW_ILS,
} from "@/utils/billAnalyzer";

type FormFields = {
  monthlyBill: string;
  pricePerKwh: string;
  roofSize: string;
  dailyHours: string;
};

type FieldErrors = Partial<Record<keyof FormFields, string>>;

const EMPTY: FormFields = {
  monthlyBill: "",
  pricePerKwh: "",
  roofSize: "",
  dailyHours: "",
};

function parseRequiredPositive(raw: string, label: string): { value: number; error?: string } {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return { value: NaN, error: `Please enter your ${label}.` };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    return { value: NaN, error: `${label} must be a number greater than zero.` };
  }
  return { value };
}

export default function BillAnalyzer() {
  const formId = useId();
  const [fields, setFields] = useState<FormFields>(EMPTY);
  const [batteryNeeded, setBatteryNeeded] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<BillAnalyzerResult | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const setField = (key: keyof FormFields) => (value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const bill = parseRequiredPositive(fields.monthlyBill, "monthly electricity bill");
    const price = parseRequiredPositive(fields.pricePerKwh, "average price per kWh");
    const roof = parseRequiredPositive(fields.roofSize, "roof size");

    const nextErrors: FieldErrors = {};
    if (bill.error) nextErrors.monthlyBill = bill.error;
    if (price.error) nextErrors.pricePerKwh = price.error;
    if (roof.error) nextErrors.roofSize = roof.error;

    const hoursRaw = fields.dailyHours.trim().replace(/,/g, "");
    let dailyUsageHours: number | null = null;
    if (hoursRaw) {
      const hours = Number(hoursRaw);
      if (!Number.isFinite(hours) || hours <= 0) {
        nextErrors.dailyHours = "Daily usage hours must be a number greater than zero, or left blank.";
      } else {
        dailyUsageHours = hours;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    setErrors({});
    const next = calculateBillRecommendation({
      monthlyBill: bill.value,
      pricePerKwh: price.value,
      roofSizeM2: roof.value,
      dailyUsageHours,
      batteryNeeded,
    });
    setResult(next);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section id="bill-analyzer" className="py-16 bg-gridload-offwhite" aria-labelledby={`${formId}-title`}>
      <div className="gridload-container">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gridload-navy text-gridload-yellow flex items-center justify-center">
            <Calculator className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 id={`${formId}-title`} className="text-3xl md:text-4xl font-bold text-gridload-navy">
            Bill Analyzer
          </h2>
          <p className="mt-2 text-muted-foreground">
            Enter your electricity bill and we will recommend the solar system that fits your home.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card className="border-gridload-lightgray shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-gridload-navy">Your electricity details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <Field
                  id={`${formId}-bill`}
                  label="Monthly Electricity Bill (₪)"
                  error={errors.monthlyBill}
                >
                  <Input
                    id={`${formId}-bill`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="e.g., 2,100"
                    value={fields.monthlyBill}
                    onChange={(e) => setField("monthlyBill")(e.target.value)}
                    aria-invalid={Boolean(errors.monthlyBill)}
                    aria-describedby={errors.monthlyBill ? `${formId}-bill-error` : undefined}
                  />
                </Field>

                <Field
                  id={`${formId}-price`}
                  label="Average Price per kWh (₪)"
                  helper="Check your bill if unsure"
                  error={errors.pricePerKwh}
                >
                  <Input
                    id={`${formId}-price`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="e.g., 0.75"
                    value={fields.pricePerKwh}
                    onChange={(e) => setField("pricePerKwh")(e.target.value)}
                    aria-invalid={Boolean(errors.pricePerKwh)}
                    aria-describedby={
                      errors.pricePerKwh ? `${formId}-price-error` : `${formId}-price-help`
                    }
                  />
                </Field>

                <Field
                  id={`${formId}-roof`}
                  label="Roof Size (m²)"
                  helper="Approximate area available for solar panels"
                  error={errors.roofSize}
                >
                  <Input
                    id={`${formId}-roof`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="e.g., 50"
                    value={fields.roofSize}
                    onChange={(e) => setField("roofSize")(e.target.value)}
                    aria-invalid={Boolean(errors.roofSize)}
                    aria-describedby={
                      errors.roofSize ? `${formId}-roof-error` : `${formId}-roof-help`
                    }
                  />
                </Field>

                <Field
                  id={`${formId}-hours`}
                  label="Average Daily Usage Hours (optional)"
                  helper="How many hours per day do you use electricity? This does not change the system size — we size from your bill."
                  error={errors.dailyHours}
                >
                  <Input
                    id={`${formId}-hours`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="e.g., 8"
                    value={fields.dailyHours}
                    onChange={(e) => setField("dailyHours")(e.target.value)}
                    aria-invalid={Boolean(errors.dailyHours)}
                    aria-describedby={
                      errors.dailyHours ? `${formId}-hours-error` : `${formId}-hours-help`
                    }
                  />
                </Field>

                <div className="flex items-center justify-between gap-4 rounded-md border border-gridload-lightgray bg-white px-4 py-3">
                  <div>
                    <Label htmlFor={`${formId}-battery`} className="text-gridload-navy">
                      Backup battery needed?
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Recommended for most homes</p>
                  </div>
                  <Switch
                    id={`${formId}-battery`}
                    checked={batteryNeeded}
                    onCheckedChange={setBatteryNeeded}
                    className="data-[state=checked]:bg-gridload-green"
                    aria-label="Backup battery needed"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gridload-green hover:bg-gridload-green/90 text-white font-semibold"
                  size="lg"
                >
                  See my system size
                </Button>
              </form>
            </CardContent>
          </Card>

          {result ? (
            <div ref={resultsRef}>
              <ResultsCard result={result} />
            </div>
          ) : (
            <Card className="border-dashed border-gridload-lightgray bg-white/70">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Calculator className="h-10 w-10 mx-auto mb-3 text-gridload-navy/40" aria-hidden="true" />
                <p>Your recommendation will appear here after you submit your bill details.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gridload-navy">
        {label}
      </Label>
      {children}
      {helper && !error && (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ResultsCard({ result }: { result: BillAnalyzerResult }) {
  const quoteTo = `/contact?${quoteSearchParams(result)}`;

  return (
    <Card className="border-gridload-green/30 shadow-sm overflow-hidden">
      <CardHeader className="bg-gridload-navy text-white">
        <CardTitle className="text-xl md:text-2xl">Your GridLoad System Recommendation</CardTitle>
        <p className="text-sm text-white/80">
          About {formatNumber(result.monthlyKwh)} kWh per month ({formatNumber(result.dailyKwh)} kWh per day)
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gridload-green">What you need</h3>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat label="System size" value={`${formatNumber(result.systemSizeKw)} kW`} />
            {result.batteryCapacityKwh != null && (
              <Stat
                label="Battery capacity"
                value={`${formatNumber(result.batteryCapacityKwh)} kWh`}
              />
            )}
            <Stat label="Panels required" value={`${formatNumber(result.panelsNeeded)} units`} />
            <Stat label="Roof space required" value={`${formatNumber(result.spaceRequiredM2)} m²`} />
          </dl>
        </div>

        {result.batteryCapacityKwh != null && (
          <p className="text-xs text-muted-foreground -mt-3">
            About one day of backup: 130% of daily use. This is a nameplate estimate, not a lab model of
            efficiency or depth of discharge.
          </p>
        )}

        {result.roofTooSmall && (
          <div
            className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
            role="status"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <p>
              Your roof ({formatNumber(result.roofSizeM2)} m²) may be smaller than needed. Contact us for roof
              optimization options.
            </p>
          </div>
        )}

        {!result.roofTooSmall && result.roofTight && (
          <div
            className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
            role="status"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <p>
              Your roof ({formatNumber(result.roofSizeM2)} m²) is almost fully used by this array (
              {formatNumber(result.spaceRequiredM2)} m²). That leaves little room for walkways, the inverter,
              and maintenance. We can help optimize the layout — we will not auto-shrink the system here.
            </p>
          </div>
        )}

        {result.dailyUsageHours != null && (
          <div
            className="flex gap-3 rounded-md border border-gridload-lightgray bg-white p-3 text-sm text-gridload-navy/80"
            role="note"
          >
            <p>
              Daily usage hours ({result.dailyUsageHours} h) are noted for your quote. System size still comes
              from the bill ({formatNumber(result.monthlyKwh)} kWh/month), not from hours.
            </p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gridload-green">Financial impact</h3>
          <dl className="mt-3 space-y-2">
            <Row label="Current monthly cost" value={formatIls(result.currentMonthlyCost)} />
            <Row
              label="GridLoad monthly cost"
              value={`${formatIls(result.gridloadMonthlyCost)} (30% of current)`}
            />
            <Row label="Annual savings" value={formatIls(result.annualSavings)} />
            <Row label="Estimated PV cost" value={formatIls(result.estimatedPvCostIls)} />
            <Row label="Payback period" value={`${result.paybackYears.toFixed(1)} years`} />
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Payback uses an estimated ₪{INSTALLED_COST_PER_KW_ILS.toLocaleString("en-US")} per kW for panels
            and install only. Battery cost is not included.
          </p>
        </div>

        <Button
          asChild
          size="lg"
          className="w-full bg-gridload-yellow text-gridload-navy font-semibold hover:brightness-95"
        >
          <Link to={quoteTo}>Get Your Custom Quote</Link>
        </Button>
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-gridload-green" aria-hidden="true" />
          We will use these numbers to prepare your quote.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gridload-offwhite px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-gridload-navy">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-gridload-navy text-right">{value}</dd>
    </div>
  );
}
