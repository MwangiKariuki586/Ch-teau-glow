// ─── Recovery Case Types ──────────────────────────────────────────────────────

export type CaseSeverity = 'critical' | 'high' | 'medium' | 'low';
export type CaseStatus = 'open' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
export type CasePriority = 'urgent' | 'normal' | 'low';

export interface RecoveryCase {
  id: string;
  caseNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  appointmentId?: string;
  appointmentDate?: string;
  serviceName?: string;
  branchName?: string;
  practitionerName?: string;
  issueType: string;
  issueDescription: string;
  severity: CaseSeverity;
  status: CaseStatus;
  priority: CasePriority;
  assignedTo?: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  slaDeadline?: string;
  isOverdue: boolean;
  tags: string[];
}

export interface RecoveryAction {
  id: string;
  caseId: string;
  type: 'note' | 'status_change' | 'assignment' | 'escalation' | 'playbook_step' | 'resolution';
  description: string;
  performedBy: string;
  performedAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface PlaybookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: string;
  isRequired: boolean;
}

export interface RecoveryPlaybook {
  id: string;
  name: string;
  issueType: string;
  severity: CaseSeverity;
  steps: PlaybookStep[];
  estimatedResolutionHours: number;
}

export interface EscalationRecord {
  id: string;
  caseId: string;
  escalatedTo: string;
  escalatedBy: string;
  reason: string;
  escalatedAt: string;
  resolvedAt?: string;
}

export interface RecoveryOutcome {
  id: string;
  caseId: string;
  resolution: string;
  compensationOffered?: string;
  clientSatisfactionScore?: number;
  followUpRequired: boolean;
  followUpDate?: string;
  notes: string;
  closedBy: string;
  closedAt: string;
}

export interface RecoveryStats {
  totalOpen: number;
  totalInProgress: number;
  totalEscalated: number;
  totalResolved: number;
  totalClosed: number;
  overdueCount: number;
  avgResolutionHours: number;
  criticalCount: number;
}

// ─── Filter / View Types ──────────────────────────────────────────────────────

export type RecoveryView = 'inbox' | 'detail' | 'analytics';

export interface RecoveryFilters {
  status: CaseStatus | 'all';
  severity: CaseSeverity | 'all';
  branch: string | 'all';
  overdue: boolean;
  search: string;
}
