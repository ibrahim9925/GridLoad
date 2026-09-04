import { FormEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Calculator, CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  detectVisitorGeo,
  GRIDLOAD_SALES_PHONE_DISPLAY,
  GRIDLOAD_SALES_PHONE_TEL,
  isValidLocalPhone,
  normalizePhone,
  preferredLanguage,
  type VisitorGeo,
} from "@/lib/billAnalyzerGeo";
import { billAnalyzerCopy, interpolate, type BillAnalyzerLang } from "@/locales/billAnalyzer";
import { requestBillAnalyzerCallback, upsertBillAnalyzerLead } from "@/services/billAnalyzerLeads";
import {
  BillAnalyzerResult,
  calculateBillRecommendation,
  formatIls,
  formatNumber,
  GENERIC_PEAK_SUN_HOURS,
  PALESTINE_PEAK_SUN_HOURS,
} from "@/utils/billAnalyzer";

type FormFields = {
  firstName: string;
  phone: string;
  email: string;
  monthlyBill: string;
  pricePerKwh: string;
  roofSize: string;
  dailyHours: string;
};

type FieldErrors = Partial<Record<keyof FormFields, string>>;

const EMPTY: FormFields = {
  firstName: "",
  phone: "",
  email: "",
  monthlyBill: "",
  pricePerKwh: "",
  roofSize: "",
  dailyHours: "",
};

function parseRequiredPositive(raw: string, label: string, t: ReturnType<typeof billAnalyzerCopy>): { value: number; error?: string } {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return { value: NaN, error: interpolate(t.requiredNumber, { field: label }) };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    return { value: NaN, error: interpolate(t.positiveNumber, { field: label }) };
  }
  return { value };
}

export default function BillAnalyzer() {
  const formId = useId();
  const { toast } = useToast();
  const [lang, setLang] = useState<BillAnalyzerLang>("en");
  const [geo, setGeo] = useState<VisitorGeo | null>(null);
  const [currency, setCurrency] = useState<"ILS" | "USD">("ILS");
  const [fields, setFields] = useState<FormFields>(EMPTY);
  const [batteryNeeded, setBatteryNeeded] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<BillAnalyzerResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackDone, setCallbackDone] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const t = billAnalyzerCopy(lang);
  const isPalestine = geo?.isPalestine ?? false;
  const peakSunHours = isPalestine ? PALESTINE_PEAK_SUN_HOURS : GENERIC_PEAK_SUN_HOURS;
  const money = (n: number) => (currency === "USD" ? `$${Math.round(n).toLocaleString("en-US")}` : formatIls(n));

  useEffect(() => {
    let cancelled = false;
    detectVisitorGeo().then((detected) => {
      if (cancelled) return;
      setGeo(detected);
      setLang(preferredLanguage(detected.isPalestine));
      setCurrency("ILS");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const leadWrite = useMemo(() => {
    if (!result) return null;
    const bill = Number(fields.monthlyBill.replace(/,/g, ""));
    const price = Number(fields.pricePerKwh.replace(/,/g, ""));
    const roof = Number(fields.roofSize.replace(/,/g, ""));
    const hoursRaw = fields.dailyHours.trim().replace(/,/g, "");
    return {
      firstName: fields.firstName,
      phone: normalizePhone(fields.phone),
      email: fields.email,
      monthlyBill: bill,
      pricePerKwh: price,
      roofSize: roof,
      dailyUsageHours: hoursRaw ? Number(hoursRaw) : null,
      batteryNeeded,
      result,
      language: lang,
      location: geo?.country || "Unknown",
      peakSunHours,
    };
  }, [batteryNeeded, fields, geo, lang, peakSunHours, result]);

  const setField = (key: keyof FormFields) => (value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const bill = parseRequiredPositive(fields.monthlyBill, t.monthlyBill, t);
    const price = parseRequiredPositive(fields.pricePerKwh, t.pricePerKwh, t);
    const roof = parseRequiredPositive(fields.roofSize, t.roofSize, t);

    const nextErrors: FieldErrors = {};
    if (bill.error) nextErrors.monthlyBill = bill.error;
    if (price.error) nextErrors.pricePerKwh = price.error;
    if (roof.error) nextErrors.roofSize = roof.error;

    const phoneRaw = fields.phone.trim();
    if (!phoneRaw) nextErrors.phone = t.phoneRequired;
    else if (!isValidLocalPhone(phoneRaw)) nextErrors.phone = t.phoneInvalid;

    const emailRaw = fields.email.trim();
    if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      nextErrors.email = t.emailInvalid;
    }

    const hoursRaw = fields.dailyHours.trim().replace(/,/g, "");
    let dailyUsageHours: number | null = null;
    if (hoursRaw) {
      const hours = Number(hoursRaw);
      if (!Number.isFinite(hours) || hours <= 0) {
        nextErrors.dailyHours = interpolate(t.positiveNumber, { field: t.dailyHours });
      } else {
        dailyUsageHours = hours;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      setSubmitted(false);
      return;
    }

    const next = calculateBillRecommendation({
      monthlyBill: bill.value,
      pricePerKwh: price.value,
      roofSizeM2: roof.value,
      dailyUsageHours,
      batteryNeeded,
      peakSunHours,
    });

    setErrors({});
    setResult(next);
    setSaving(true);
    const { error } = await upsertBillAnalyzerLead({
      firstName: fields.firstName,
      phone: normalizePhone(phoneRaw),
      email: emailRaw,
      monthlyBill: bill.value,
      pricePerKwh: price.value,
      roofSize: roof.value,
      dailyUsageHours,
      batteryNeeded,
      result: next,
      language: lang,
      location: geo?.country || "Unknown",
      peakSunHours,
      status: "new",
    });
    setSaving(false);
    setSubmitted(true);
    setCallbackPhone(normalizePhone(phoneRaw));
    toast({
      variant: error ? "destructive" : "default",
      title: error ? t.saveError : t.saveSuccess,
    });
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const onCallback = async () => {
    const raw = callbackPhone.trim() || fields.phone.trim();
    if (!isValidLocalPhone(raw)) {
      toast({ variant: "destructive", title: t.phoneInvalid });
      return;
    }
    const phone = normalizePhone(raw);
    const { error } = await requestBillAnalyzerCallback(
      phone,
      leadWrite ? { ...leadWrite, phone, status: "callback_requested" } : undefined
    );
    if (error) {
      toast({ variant: "destructive", title: t.saveError });
      return;
    }
    setCallbackDone(true);
    toast({ title: t.callbackThanks });
  };

  return (
    <section
      id="bill-analyzer"
      className="py-16 bg-gridload-offwhite"
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
      aria-labelledby={`${formId}-title`}
    >
      <div className="gridload-container">
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-md border border-gridload-lightgray bg-white p-1 text-sm" role="group" aria-label="Language">
            <button
              type="button"
              className={`px-3 py-1 rounded ${lang === "en" ? "bg-gridload-navy text-white" : "text-gridload-navy"}`}
              onClick={() => setLang("en")}
            >
              {t.langEn}
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded ${lang === "ar" ? "bg-gridload-navy text-white" : "text-gridload-navy"}`}
              onClick={() => setLang("ar")}
            >
              {t.langAr}
            </button>
          </div>
        </div>

        <div className="text-center max-w-2xl mx-auto">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gridload-navy text-gridload-yellow flex items-center justify-center">
            <Calculator className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 id={`${formId}-title`} className="text-3xl md:text-4xl font-bold text-gridload-navy">
            {t.title}
          </h2>
          <p className="mt-2 text-muted-foreground">{t.subtitle}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {geo
              ? `${t.detectedLocation}: ${geo.country}. ${isPalestine ? t.sunHoursPalestine : t.sunHoursGeneric}`
              : "…"}
          </p>
          {!isPalestine && (
            <div className="mt-3 inline-flex rounded-md border border-gridload-lightgray bg-white p-1 text-xs">
              <button
                type="button"
                className={`px-2 py-1 rounded ${currency === "ILS" ? "bg-gridload-green text-white" : ""}`}
                onClick={() => setCurrency("ILS")}
              >
                {t.currencyIls}
              </button>
              <button
                type="button"
                className={`px-2 py-1 rounded ${currency === "USD" ? "bg-gridload-green text-white" : ""}`}
                onClick={() => setCurrency("USD")}
              >
                {t.currencyUsd}
              </button>
            </div>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {!submitted && (
            <Card className="border-gridload-lightgray shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-gridload-navy">{t.detailsTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field id={`${formId}-name`} label={t.firstName}>
                      <Input
                        id={`${formId}-name`}
                        value={fields.firstName}
                        placeholder={t.firstNamePlaceholder}
                        onChange={(e) => setField("firstName")(e.target.value)}
                        autoComplete="given-name"
                      />
                    </Field>
                    <Field id={`${formId}-phone`} label={t.phone} helper={t.phoneHelper} error={errors.phone}>
                      <Input
                        id={`${formId}-phone`}
                        type="tel"
                        inputMode="tel"
                        required
                        placeholder={t.phonePlaceholder}
                        value={fields.phone}
                        onChange={(e) => setField("phone")(e.target.value)}
                        aria-invalid={Boolean(errors.phone)}
                        autoComplete="tel"
                      />
                    </Field>
                  </div>
                  <Field id={`${formId}-email`} label={t.email} error={errors.email}>
                    <Input
                      id={`${formId}-email`}
                      type="email"
                      placeholder={t.emailPlaceholder}
                      value={fields.email}
                      onChange={(e) => setField("email")(e.target.value)}
                      autoComplete="email"
                    />
                  </Field>
                  <Field id={`${formId}-bill`} label={t.monthlyBill} error={errors.monthlyBill}>
                    <Input
                      id={`${formId}-bill`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder={t.monthlyBillPlaceholder}
                      value={fields.monthlyBill}
                      onChange={(e) => setField("monthlyBill")(e.target.value)}
                    />
                  </Field>
                  <Field id={`${formId}-price`} label={t.pricePerKwh} helper={t.priceHelper} error={errors.pricePerKwh}>
                    <Input
                      id={`${formId}-price`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder={t.pricePerKwhPlaceholder}
                      value={fields.pricePerKwh}
                      onChange={(e) => setField("pricePerKwh")(e.target.value)}
                    />
                  </Field>
                  <Field id={`${formId}-roof`} label={t.roofSize} helper={t.roofHelper} error={errors.roofSize}>
                    <Input
                      id={`${formId}-roof`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder={t.roofSizePlaceholder}
                      value={fields.roofSize}
                      onChange={(e) => setField("roofSize")(e.target.value)}
                    />
                  </Field>
                  <Field id={`${formId}-hours`} label={t.dailyHours} helper={t.dailyHoursHelper} error={errors.dailyHours}>
                    <Input
                      id={`${formId}-hours`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder={t.dailyHoursPlaceholder}
                      value={fields.dailyHours}
                      onChange={(e) => setField("dailyHours")(e.target.value)}
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-4 rounded-md border border-gridload-lightgray bg-white px-4 py-3">
                    <div>
                      <Label htmlFor={`${formId}-battery`} className="text-gridload-navy">
                        {t.battery}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{t.batteryHelper}</p>
                    </div>
                    <Switch
                      id={`${formId}-battery`}
                      checked={batteryNeeded}
                      onCheckedChange={setBatteryNeeded}
                      className="data-[state=checked]:bg-gridload-green"
                      aria-label={t.battery}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gridload-green hover:bg-gridload-green/90 text-white font-semibold"
                    size="lg"
                    disabled={saving}
                  >
                    {saving ? t.submitting : t.submit}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {result ? (
            <div ref={resultsRef} className={submitted ? "lg:col-span-2 space-y-6" : ""}>
              <ResultsCard result={result} t={t} money={money} />
              {submitted && (
                <CtaCard
                  t={t}
                  result={result}
                  callbackPhone={callbackPhone}
                  setCallbackPhone={setCallbackPhone}
                  callbackDone={callbackDone}
                  onCallback={onCallback}
                />
              )}
            </div>
          ) : (
            <Card className="border-dashed border-gridload-lightgray bg-white/70">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Calculator className="h-10 w-10 mx-auto mb-3 text-gridload-navy/40" aria-hidden="true" />
                <p>{t.placeholderResult}</p>
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

function ResultsCard({
  result,
  t,
  money,
}: {
  result: BillAnalyzerResult;
  t: ReturnType<typeof billAnalyzerCopy>;
  money: (n: number) => string;
}) {
  return (
    <Card className="border-gridload-green/30 shadow-sm overflow-hidden">
      <CardHeader className="bg-gridload-navy text-white">
        <CardTitle className="text-xl md:text-2xl">{t.resultTitle}</CardTitle>
        <p className="text-sm text-white/80">
          {interpolate(t.resultUsage, {
            monthly: formatNumber(result.monthlyKwh),
            daily: formatNumber(result.dailyKwh),
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gridload-green">{t.whatYouNeed}</h3>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat label={t.systemSize} value={`${formatNumber(result.systemSizeKw)} kW`} />
            {result.batteryCapacityKwh != null && (
              <Stat label={t.batteryCapacity} value={`${formatNumber(result.batteryCapacityKwh)} kWh`} />
            )}
            <Stat label={t.panelsRequired} value={`${formatNumber(result.panelsNeeded)} ${t.panelsUnit}`} />
            <Stat label={t.roofSpaceRequired} value={`${formatNumber(result.spaceRequiredM2)} m²`} />
          </dl>
        </div>

        {result.batteryCapacityKwh != null && (
          <p className="text-xs text-muted-foreground -mt-3">{t.batteryNote}</p>
        )}

        {result.roofTooSmall && (
          <Warn>
            {interpolate(t.roofTooSmall, { roof: formatNumber(result.roofSizeM2) })}
          </Warn>
        )}
        {!result.roofTooSmall && result.roofTight && (
          <Warn>
            {interpolate(t.roofTight, {
              roof: formatNumber(result.roofSizeM2),
              space: formatNumber(result.spaceRequiredM2),
            })}
          </Warn>
        )}
        {result.dailyUsageHours != null && (
          <div className="rounded-md border border-gridload-lightgray bg-white p-3 text-sm text-gridload-navy/80" role="note">
            {interpolate(t.hoursNote, {
              hours: result.dailyUsageHours,
              monthly: formatNumber(result.monthlyKwh),
            })}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gridload-green">{t.financialImpact}</h3>
          <dl className="mt-3 space-y-2">
            <Row label={t.currentMonthlyCost} value={money(result.currentMonthlyCost)} />
            <Row label={t.annualSavings} value={t.availableAfterQuote} />
            <Row label={t.paybackPeriod} value={t.availableAfterQuote} />
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">💬 {t.pricingNote}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CtaCard({
  t,
  result,
  callbackPhone,
  setCallbackPhone,
  callbackDone,
  onCallback,
}: {
  t: ReturnType<typeof billAnalyzerCopy>;
  result: BillAnalyzerResult;
  callbackPhone: string;
  setCallbackPhone: (v: string) => void;
  callbackDone: boolean;
  onCallback: () => void;
}) {
  return (
    <Card className="border-gridload-yellow/40 bg-white shadow-sm">
      <CardHeader className="bg-gridload-green text-white">
        <CardTitle className="text-xl md:text-2xl">{t.quoteCta}</CardTitle>
        <p className="text-sm text-white/90">{t.ctaMessage}</p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div>
          <h3 className="text-sm font-semibold text-gridload-navy">{t.systemSummary}</h3>
          <ul className="mt-2 text-sm text-gridload-navy/80 space-y-1">
            <li>• {t.systemSize}: {formatNumber(result.systemSizeKw)} kW</li>
            {result.batteryCapacityKwh != null && (
              <li>• {t.batteryCapacity}: {formatNumber(result.batteryCapacityKwh)} kWh</li>
            )}
            <li>• {t.panelsRequired}: {formatNumber(result.panelsNeeded)} {t.panelsUnit}</li>
          </ul>
        </div>
        <a
          href={`tel:${GRIDLOAD_SALES_PHONE_TEL}`}
          className="flex items-center justify-center gap-3 w-full rounded-md bg-gridload-yellow text-gridload-navy font-semibold py-3 hover:brightness-95"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          {t.callNow} · {GRIDLOAD_SALES_PHONE_DISPLAY}
        </a>
        <div className="border-t border-gridload-lightgray pt-4 space-y-3">
          <p className="text-sm font-medium text-gridload-navy">{t.preferCallback}</p>
          {callbackDone ? (
            <p className="flex items-center gap-2 text-sm text-gridload-green">
              <CheckCircle2 className="h-4 w-4" /> {t.callbackThanks}
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="tel"
                value={callbackPhone}
                onChange={(e) => setCallbackPhone(e.target.value)}
                placeholder={t.callbackPlaceholder}
                aria-label={t.callbackPlaceholder}
              />
              <Button type="button" onClick={onCallback} className="bg-gridload-navy text-white whitespace-nowrap">
                {t.requestCallback}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Warn({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
      <p>{children}</p>
    </div>
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
