'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  ISSUE_TYPES,
  ISSUE_CATEGORIES,
  ISSUE_PRIORITY_MAP,
  SEVERITY_CONFIG,
  type IssueType,
  type ComplaintSeverity,
  type ComplaintPriority,
  type CustomerComplaint,
} from '../types';
import { useComplaintOptions } from '../hooks/use-complaint-options';

const schema = z.object({
  issue_type: z.string().min(1, 'Please select an issue type.'),
  description: z
    .string()
    .min(10, 'Please describe the issue in at least 10 characters.')
    .max(2000, 'Description must be under 2000 characters.'),
  service_name: z.string().optional(),
  branch_name: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SubmittedCase {
  case_number: string;
  severity: ComplaintSeverity;
  priority: ComplaintPriority;
}

// ── Priority preview ──────────────────────────────────────────────────────────
// Shows the customer what to expect in terms of response time only — no severity/priority labels
function PriorityPreview({ issueType }: { issueType: string }) {
  const classification = ISSUE_PRIORITY_MAP[issueType as IssueType] ?? null;
  if (!classification) return null;

  const sev = SEVERITY_CONFIG[classification.severity];

  return (
    <div className={cn('rounded-xl border p-4 transition-all duration-300', sev.bg, sev.border)}>
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-1.5 bg-white/60">
          <Clock className={cn('h-4 w-4', sev.color)} />
        </div>
        <p className={cn('text-sm', sev.color)}>
          Our team will respond to this complaint within{' '}
          <strong>{classification.slaHours} hours</strong>.
        </p>
      </div>
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ submitted, onReset }: { submitted: SubmittedCase; onReset: () => void }) {
  const classification = ISSUE_PRIORITY_MAP[
    Object.keys(ISSUE_PRIORITY_MAP).find(
      (k) =>
        ISSUE_PRIORITY_MAP[k as IssueType].severity === submitted.severity &&
        ISSUE_PRIORITY_MAP[k as IssueType].priority === submitted.priority
    ) as IssueType
  ];

  return (
    <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-8 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h3 className="mb-1 text-xl font-bold text-emerald-900">Complaint Submitted</h3>
      <p className="mb-4 text-sm text-emerald-700">
        Your case has been logged. Our team will review it and be in touch shortly.
      </p>

      {/* Case reference */}
      <div className="mb-5 rounded-lg border border-emerald-200 bg-white px-5 py-3">
        <p className="text-xs text-gray-500 mb-0.5">Case Reference</p>
        <p className="font-mono text-lg font-bold text-gray-900">{submitted.case_number}</p>
      </div>

      {/* Response time only */}
      {classification && (
        <p className="mb-6 flex items-center gap-1.5 text-sm text-emerald-700">
          <Clock className="h-4 w-4 shrink-0" />
          Expected response within <strong className="ml-1">{classification.slaHours} hours</strong>
        </p>
      )}

      <Button
        variant="outline"
        className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
        onClick={onReset}
      >
        Submit Another Complaint
      </Button>
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────────
interface ComplaintFormProps {
  /** When provided, the form operates in edit mode */
  editingComplaint?: CustomerComplaint;
  onEditSuccess?: (updated: CustomerComplaint) => void;
  onCancelEdit?: () => void;
}

export function ComplaintForm({ editingComplaint, onEditSuccess, onCancelEdit }: ComplaintFormProps) {
  const isEditMode = !!editingComplaint;
  const [submitted, setSubmitted] = useState<SubmittedCase | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { services, branches, loading: optionsLoading } = useComplaintOptions();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      issue_type: editingComplaint?.issue_type ?? '',
      description: editingComplaint?.issue_description ?? '',
      service_name: editingComplaint?.service_name ?? '',
      branch_name: editingComplaint?.branch_name ?? '',
    },
  });

  // Sync defaults when editingComplaint changes
  useEffect(() => {
    if (editingComplaint) {
      form.reset({
        issue_type: editingComplaint.issue_type,
        description: editingComplaint.issue_description,
        service_name: editingComplaint.service_name ?? '',
        branch_name: editingComplaint.branch_name ?? '',
      });
    }
  }, [editingComplaint?.id]);

  const watchedIssueType = form.watch('issue_type');

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const url = isEditMode ? `/api/complaints/${editingComplaint.id}` : '/api/complaints';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json.detail ? `${json.error} (${json.detail})` : json.error ?? 'Something went wrong.';
        setServerError(msg);
        return;
      }

      if (isEditMode) {
        onEditSuccess?.(json.data);
      } else {
        setSubmitted(json.data);
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    }
  };

  if (submitted && !isEditMode) {
    return <SuccessScreen submitted={submitted} onReset={() => { setSubmitted(null); form.reset(); }} />;
  }

  const NO_SELECTION = '__none__';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 h-full">

        {isEditMode && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 font-medium">
            Editing complaint <span className="font-mono">{editingComplaint.case_number}</span>
          </div>
        )}

        {/* Issue type — grouped by category */}
        <FormField
          control={form.control}
          name="issue_type"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Issue Type <span className="text-rose-500">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select the type of issue…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ISSUE_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <div className="px-2 py-1.5 mt-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {cat.label}
                        </p>
                      </div>
                      {cat.issues.map((t) => {
                        const sev = SEVERITY_CONFIG[ISSUE_PRIORITY_MAP[t].severity];
                        return (
                          <SelectItem key={t} value={t}>
                            <span className="flex items-center gap-2">
                              <span className={cn('h-2 w-2 rounded-full shrink-0', sev.dot)} />
                              {t}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Live priority preview */}
        {watchedIssueType && <PriorityPreview issueType={watchedIssueType} />}

        {/* Description — grows to fill available space */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="w-full flex-1 flex flex-col">
              <FormLabel>Description <span className="text-rose-500">*</span></FormLabel>
              <FormControl className="flex-1">
                <Textarea
                  placeholder="Please describe what happened in as much detail as possible…"
                  className="w-full h-full min-h-[160px] resize-none bg-white"
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between mt-1">
                <FormMessage />
                <span className="ml-auto text-xs text-gray-400">{field.value.length}/2000</span>
              </div>
            </FormItem>
          )}
        />

        {/* Service dropdown */}
        <FormField
          control={form.control}
          name="service_name"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Service (optional)</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === NO_SELECTION ? '' : v)}
                value={field.value || NO_SELECTION}
                disabled={optionsLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder={optionsLoading ? 'Loading…' : 'Select a service…'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>
                    <span className="text-gray-400">No specific service</span>
                  </SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Branch dropdown */}
        <FormField
          control={form.control}
          name="branch_name"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Branch (optional)</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === NO_SELECTION ? '' : v)}
                value={field.value || NO_SELECTION}
                disabled={optionsLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder={optionsLoading ? 'Loading…' : 'Select a branch…'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>
                    <span className="text-gray-400">No specific branch</span>
                  </SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Server error */}
        {serverError && (
          <p className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          {isEditMode && (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancelEdit}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className={cn('bg-[#6B4423] hover:bg-[#5a3820] text-white', isEditMode ? 'flex-1' : 'w-full')}
          >
            {form.formState.isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? 'Saving…' : 'Submitting…'}</>
            ) : (
              <><ShieldAlert className="mr-2 h-4 w-4" />{isEditMode ? 'Save Changes' : 'Submit Complaint'}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
