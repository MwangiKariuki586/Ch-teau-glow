export type ComplaintStatus = 'open' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
export type ComplaintSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ComplaintPriority = 'urgent' | 'normal' | 'low';

// ── Issue types grouped by category ──────────────────────────────────────────
// Staff → high severity | Service → medium severity | System → low severity

export const ISSUE_TYPES = [
  // Staff-related (high)
  'Staff Conduct',
  'Staff Attitude',
  'Practitioner Skill',
  // Service-related (medium)
  'Service Quality',
  'Product Reaction',
  'Facility / Hygiene',
  // System-related (low)
  'Scheduling Error',
  'Pricing Dispute',
  'Communication Gap',
  'Other',
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

// ── Category grouping (used for UI labels) ────────────────────────────────────
export const ISSUE_CATEGORIES: {
  label: string;
  description: string;
  severity: ComplaintSeverity;
  issues: IssueType[];
}[] = [
  {
    label: 'Staff',
    description: 'Issues involving practitioner or team member behaviour',
    severity: 'high',
    issues: ['Staff Conduct', 'Staff Attitude', 'Practitioner Skill'],
  },
  {
    label: 'Service',
    description: 'Issues with the quality or delivery of a service',
    severity: 'medium',
    issues: ['Service Quality', 'Product Reaction', 'Facility / Hygiene'],
  },
  {
    label: 'System',
    description: 'Operational, scheduling, or communication issues',
    severity: 'low',
    issues: ['Scheduling Error', 'Pricing Dispute', 'Communication Gap', 'Other'],
  },
];

// ── Single source of truth for priority classification ────────────────────────
export const ISSUE_PRIORITY_MAP: Record<
  IssueType,
  { severity: ComplaintSeverity; priority: ComplaintPriority; slaHours: number; category: 'Staff' | 'Service' | 'System' }
> = {
  // Staff → high / urgent / 48h
  'Staff Conduct':       { severity: 'high',   priority: 'urgent', slaHours: 48, category: 'Staff' },
  'Staff Attitude':      { severity: 'high',   priority: 'urgent', slaHours: 48, category: 'Staff' },
  'Practitioner Skill':  { severity: 'high',   priority: 'urgent', slaHours: 48, category: 'Staff' },
  // Service → medium / normal / 72h
  'Service Quality':     { severity: 'medium', priority: 'normal', slaHours: 72, category: 'Service' },
  'Product Reaction':    { severity: 'medium', priority: 'normal', slaHours: 72, category: 'Service' },
  'Facility / Hygiene':  { severity: 'medium', priority: 'normal', slaHours: 72, category: 'Service' },
  // System → low / low / 96h
  'Scheduling Error':    { severity: 'low',    priority: 'low',    slaHours: 96, category: 'System' },
  'Pricing Dispute':     { severity: 'low',    priority: 'low',    slaHours: 96, category: 'System' },
  'Communication Gap':   { severity: 'low',    priority: 'low',    slaHours: 96, category: 'System' },
  'Other':               { severity: 'low',    priority: 'low',    slaHours: 96, category: 'System' },
};

export const SEVERITY_CONFIG: Record<
  ComplaintSeverity,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  critical: { label: 'Critical', color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200',   dot: 'bg-rose-500' },
  high:     { label: 'High',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  low:      { label: 'Low',      color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-500' },
};

export const PRIORITY_CONFIG: Record<
  ComplaintPriority,
  { label: string; color: string; bg: string; border: string }
> = {
  urgent: { label: 'Urgent', color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
  normal: { label: 'Normal', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  low:    { label: 'Low',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
};

export interface ComplaintSubmission {
  issue_type: IssueType;
  description: string;
  booking_id?: string;
  service_name?: string;
  branch_name?: string;
}

export interface CustomerComplaint {
  id: string;
  case_number: string;
  issue_type: string;
  issue_description: string;
  status: ComplaintStatus;
  severity: ComplaintSeverity;
  priority: ComplaintPriority;
  service_name: string | null;
  branch_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}
