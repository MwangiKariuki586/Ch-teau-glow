"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SERVICE_STATUSES, type ServiceStatus } from "@/lib/constants/service-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AdminFormShell } from "@/features/admin/services/components/admin-form-shell";
import { DurationInput } from "@/features/admin/services/components/duration-input";
import {
  createEmptyDurationFieldState,
  getDurationFieldValidationError,
  minutesToSessionDuration,
  parseStoredDuration,
  serializeDurationField,
  SESSION_DURATION_UNITS,
  sessionDurationToMinutes,
  type DurationFieldState,
  type SessionDurationUnit,
} from "@/features/admin/services/lib/duration-fields";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type BranchOption = {
  id: string;
  name: string;
  city: string;
  country: string;
  is_active: boolean;
};

type EditableService = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  what_is_it?: string | null;
  who_is_it_for?: string | null;
  who_is_it_not_for?: string | null;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
  duration_minutes: number;
  cover_image_url: string | null;
  status: ServiceStatus;
  is_featured: boolean;
  results_duration?: string | null;
  discomfort_level?: string | null;
  side_effects?: string | null;
  recovery_duration?: string | null;
  downtime?: string | null;
  branch_ids: string[];
};

const RESULTS_DURATION_UNITS = ["hours", "days", "weeks", "months", "years"] as const;
const RECOVERY_DURATION_UNITS = ["minutes", "hours", "days", "weeks", "months", "years"] as const;
const DEFAULT_CURRENCY = "AED";
const CURRENCY_OPTIONS = ["AED", "USD", "EUR", "GBP", "SAR"] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Separator className="mt-2" />
      </div>
      {children}
    </div>
  );
}

export function ServiceEditorPage({
  serviceId,
  onSuccess,
}: {
  serviceId?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const isEditMode = Boolean(serviceId);
  const isEmbedded = Boolean(onSuccess);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [whatIsIt, setWhatIsIt] = useState("");
  const [whoIsItFor, setWhoIsItFor] = useState("");
  const [whoIsItNotFor, setWhoIsItNotFor] = useState("");
  const [resultsDuration, setResultsDuration] = useState<DurationFieldState>(
    createEmptyDurationFieldState("months"),
  );
  const [discomfortLevel, setDiscomfortLevel] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [recoveryDuration, setRecoveryDuration] = useState<DurationFieldState>(
    createEmptyDurationFieldState("days"),
  );
  const [downtime, setDowntime] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [sessionDurationAmount, setSessionDurationAmount] = useState("");
  const [sessionDurationUnit, setSessionDurationUnit] = useState<SessionDurationUnit>("minutes");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [status, setStatus] = useState<ServiceStatus>("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  useEffect(() => {
    if (slugManuallyEdited) return;
    setSlug(slugify(name));
  }, [name, slugManuallyEdited]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const optionsResponse = await fetch("/api/admin/services/options", {
          signal: controller.signal,
          cache: "no-store",
        });
        const optionsResult = await optionsResponse.json();
        if (!optionsResponse.ok) throw new Error(optionsResult.error ?? "Failed to load options.");
        if (!isMounted) return;

        setCategories((optionsResult.data?.categories ?? []) as CategoryOption[]);
        setBranches((optionsResult.data?.branches ?? []) as BranchOption[]);

        if (serviceId) {
          const serviceResponse = await fetch(`/api/admin/services/${serviceId}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          const serviceResult = await serviceResponse.json();
          if (!serviceResponse.ok) throw new Error(serviceResult.error ?? "Failed to load service.");
          if (!isMounted) return;

          const service = serviceResult.data as EditableService;
          setName(service.name);
          setSlug(service.slug);
          setSlugManuallyEdited(true);
          setWhatIsIt(service.what_is_it ?? service.description ?? "");
          setWhoIsItFor(service.who_is_it_for ?? "");
          setWhoIsItNotFor(service.who_is_it_not_for ?? "");
          setResultsDuration(
            parseStoredDuration(service.results_duration, {
              allowedUnits: RESULTS_DURATION_UNITS,
              fallbackUnit: "months",
            }),
          );
          setDiscomfortLevel(service.discomfort_level ?? "");
          setSideEffects(service.side_effects ?? "");
          setRecoveryDuration(
            parseStoredDuration(service.recovery_duration, {
              allowedUnits: RECOVERY_DURATION_UNITS,
              fallbackUnit: "days",
            }),
          );
          setDowntime(service.downtime ?? "");
          setCategoryId(service.category_id);
          setPriceFrom(String(service.min_price_cents / 100));
          setPriceTo(String(service.max_price_cents / 100));
          setCurrency(service.currency || DEFAULT_CURRENCY);
          const sessionDuration = minutesToSessionDuration(service.duration_minutes);
          setSessionDurationAmount(sessionDuration.amount);
          setSessionDurationUnit(sessionDuration.unit);
          setCoverImageUrl(service.cover_image_url ?? "");
          setStatus(service.status);
          setIsFeatured(service.is_featured);
          setSelectedBranchIds(service.branch_ids ?? []);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "Failed to load form data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadInitialData();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [serviceId]);

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.is_active !== false),
    [branches],
  );

  const toggleBranch = (branchId: string) => {
    setSelectedBranchIds((current) =>
      current.includes(branchId)
        ? current.filter((id) => id !== branchId)
        : [...current, branchId],
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const minPrice = Number(priceFrom);
    const maxPrice = Number(priceTo || priceFrom);
    const duration = sessionDurationToMinutes(sessionDurationAmount, sessionDurationUnit);
    const resultsDurationError = getDurationFieldValidationError(resultsDuration, "Results duration");
    const recoveryDurationError = getDurationFieldValidationError(recoveryDuration, "Recovery duration");

    if (!categoryId) { toast.error("Select a category."); return; }
    if (!whatIsIt.trim()) { toast.error("What is it? is required."); return; }
    if (Number.isNaN(minPrice) || minPrice < 0) { toast.error("Min price must be a valid non-negative number."); return; }
    if (Number.isNaN(maxPrice) || maxPrice < minPrice) { toast.error("Max price must be ≥ min price."); return; }
    if (resultsDurationError) { toast.error(resultsDurationError); return; }
    if (recoveryDurationError) { toast.error(recoveryDurationError); return; }
    if (!duration) { toast.error("Session duration must be a positive number."); return; }
    if (status === "published" && selectedBranchIds.length === 0) {
      toast.error("Add at least one branch before publishing.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category_id: categoryId,
        name: name.trim(),
        slug: slug.trim(),
        description: whatIsIt.trim() || null,
        what_is_it: whatIsIt.trim(),
        who_is_it_for: whoIsItFor.trim() || null,
        who_is_it_not_for: whoIsItNotFor.trim() || null,
        results_duration: serializeDurationField(resultsDuration),
        discomfort_level: discomfortLevel.trim() || null,
        side_effects: sideEffects.trim() || null,
        recovery_duration: serializeDurationField(recoveryDuration),
        downtime: downtime.trim() || null,
        min_price_cents: Math.round(minPrice * 100),
        max_price_cents: Math.round(maxPrice * 100),
        currency: currency.trim().toUpperCase() || DEFAULT_CURRENCY,
        duration_minutes: duration,
        cover_image_url: coverImageUrl.trim() || null,
        status,
        is_featured: isFeatured,
        branch_ids: selectedBranchIds,
      };

      const endpoint = isEditMode ? `/api/admin/services/${serviceId}` : "/api/admin/services";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? (isEditMode ? "Failed to update service." : "Failed to create service."));
      }

      toast.success(isEditMode ? "Service updated." : "Service created.");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/services");
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save service.";
      if (/23505|unique|duplicate/i.test(message)) {
        toast.error("A service with the same slug or name already exists.");
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const form = (
    <div className="space-y-1">
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading form…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Identity ── */}
          <FormSection title="Identity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Carbon Laser Facial"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug <span className="text-destructive">*</span></Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true); }}
                  placeholder="e.g. carbon-laser-facial"
                  required
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">Auto-generated from name.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={submitting}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ServiceStatus)} disabled={submitting}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          {/* ── Description ── */}
          <FormSection title="Description">
            <div className="space-y-2">
              <Label htmlFor="what-is-it">What is it? <span className="text-destructive">*</span></Label>
              <Textarea
                id="what-is-it"
                value={whatIsIt}
                onChange={(e) => setWhatIsIt(e.target.value)}
                placeholder="Describe what the treatment is."
                className="min-h-24 resize-y"
                required
                disabled={submitting}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="who-is-it-for">Who is it for?</Label>
                <Textarea
                  id="who-is-it-for"
                  value={whoIsItFor}
                  onChange={(e) => setWhoIsItFor(e.target.value)}
                  placeholder="Who benefits most?"
                  className="min-h-20 resize-y"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="who-is-it-not-for">Who is it not for?</Label>
                <Textarea
                  id="who-is-it-not-for"
                  value={whoIsItNotFor}
                  onChange={(e) => setWhoIsItNotFor(e.target.value)}
                  placeholder="Contraindications."
                  className="min-h-20 resize-y"
                  disabled={submitting}
                />
              </div>
            </div>
          </FormSection>

          {/* ── Pricing & Duration ── */}
          <FormSection title="Pricing & Duration">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price-from">Min Price <span className="text-destructive">*</span></Label>
                <Input
                  id="price-from"
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-to">Max Price</Label>
                <Input
                  id="price-to"
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceTo}
                  onChange={(e) => setPriceTo(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={submitting}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([...CURRENCY_OPTIONS, currency || DEFAULT_CURRENCY])).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Session Duration <span className="text-destructive">*</span></Label>
              <div className="flex gap-3">
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={sessionDurationAmount}
                  onChange={(e) => setSessionDurationAmount(e.target.value)}
                  placeholder="e.g. 60"
                  required
                  disabled={submitting}
                  className="flex-1"
                />
                <Select
                  value={sessionDurationUnit}
                  onValueChange={(v) => setSessionDurationUnit(v as SessionDurationUnit)}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_DURATION_UNITS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt === "hours" ? "Hours" : "Minutes"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">Stored as minutes internally.</p>
            </div>
          </FormSection>

          {/* ── Treatment Details ── */}
          <FormSection title="Treatment Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DurationInput
                id="results-duration"
                value={resultsDuration}
                onChange={setResultsDuration}
                label="Results Duration"
                allowedUnits={RESULTS_DURATION_UNITS}
                amountPlaceholder="e.g. 6"
                structuredHint="e.g. 6 months or 1 year."
                customHint="Custom value — switch to selector if needed."
                disabled={submitting}
              />
              <div className="space-y-2">
                <Label htmlFor="discomfort-level">Discomfort Level</Label>
                <Input
                  id="discomfort-level"
                  value={discomfortLevel}
                  onChange={(e) => setDiscomfortLevel(e.target.value)}
                  placeholder="e.g. Mild to moderate"
                  disabled={submitting}
                />
              </div>
              <DurationInput
                id="recovery-duration"
                value={recoveryDuration}
                onChange={setRecoveryDuration}
                label="Recovery Duration"
                allowedUnits={RECOVERY_DURATION_UNITS}
                amountPlaceholder="e.g. 2"
                structuredHint="e.g. 2 days or 1 week."
                customHint="Custom value — switch to selector if needed."
                disabled={submitting}
              />
              <div className="space-y-2">
                <Label htmlFor="downtime">Downtime</Label>
                <Textarea
                  id="downtime"
                  value={downtime}
                  onChange={(e) => setDowntime(e.target.value)}
                  placeholder="e.g. None to minimal."
                  className="min-h-[72px] resize-y"
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="side-effects">Side Effects</Label>
              <Textarea
                id="side-effects"
                value={sideEffects}
                onChange={(e) => setSideEffects(e.target.value)}
                placeholder="e.g. Temporary redness, mild swelling."
                className="min-h-20 resize-y"
                disabled={submitting}
              />
            </div>
          </FormSection>

          {/* ── Media & Settings ── */}
          <FormSection title="Media & Settings">
            <div className="space-y-2">
              <Label htmlFor="image">Cover Image URL</Label>
              <Input
                id="image"
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                disabled={submitting}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Featured Service</p>
                <p className="text-xs text-muted-foreground">Highlight in featured sections.</p>
              </div>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} disabled={submitting} />
            </div>
          </FormSection>

          {/* ── Branch Assignment ── */}
          <FormSection title="Branch Assignment">
            <p className="text-xs text-muted-foreground">
              Select which branches offer this service. Published services require at least one branch.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {activeBranches.map((branch) => {
                const checked = selectedBranchIds.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => toggleBranch(branch.id)}
                    disabled={submitting}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      checked
                        ? "border-[#C9A96E] bg-[#FFF4E2] text-[#6B4423]"
                        : "border-gray-200 bg-white text-foreground hover:bg-gray-50"
                    }`}
                  >
                    <div className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${
                      checked ? "border-[#C9A96E] bg-[#C9A96E]" : "border-gray-300"
                    }`}>
                      {checked && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium">{branch.name}</span>
                    {branch.city && (
                      <span className="ml-auto text-xs text-muted-foreground">{branch.city}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </FormSection>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#3E2723] text-white hover:bg-[#52342d]"
            >
              {submitting ? "Saving…" : isEditMode ? "Update Service" : "Create Service"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => (onSuccess ? onSuccess() : router.push("/admin/services"))}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );

  if (isEmbedded) return form;

  return (
    <AdminFormShell
      title={isEditMode ? "Edit Service" : "Create Service"}
      description="Manage service details and assign to branches."
    >
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">{form}</div>
    </AdminFormShell>
  );
}
