import type { RecoveryCase, RecoveryFilters, RecoveryStats } from '../types';

// ── Map raw Supabase row → RecoveryCase ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RecoveryCase {
  // Resolve best available display name — never fall back to a hardcoded string
  const clientName =
    row.client_name?.trim() ||
    row.client_email?.split('@')[0] ||
    null;

  return {
    id: row.id,
    caseNumber: row.case_number,
    clientName: clientName ?? '—',
    clientEmail: row.client_email ?? undefined,
    clientPhone: row.client_phone ?? undefined,
    appointmentId: row.booking_id ?? undefined,
    appointmentDate: row.appointment_date ?? undefined,
    serviceName: row.service_name ?? undefined,
    branchName: row.branch_name ?? undefined,
    practitionerName: row.practitioner_name ?? undefined,
    issueType: row.issue_type,
    issueDescription: row.issue_description,
    severity: row.severity,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to ?? undefined,
    assignedToId: row.assigned_to_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    slaDeadline: row.sla_deadline ?? undefined,
    isOverdue: row.is_overdue ?? false,
    tags: row.tags ?? [],
  };
}

// ── Fetch all cases (with optional filters) ───────────────────────────────────
export async function fetchRecoveryCases(filters?: Partial<RecoveryFilters>): Promise<RecoveryCase[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.severity && filters.severity !== 'all') params.set('severity', filters.severity);
  if (filters?.branch && filters.branch !== 'all') params.set('branch', filters.branch);
  if (filters?.overdue) params.set('overdue', 'true');

  const res = await fetch(`/api/admin/recovery-cases?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to fetch recovery cases');
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data ?? []).map((r: any) => mapRow(r));
}

// ── Update a case ─────────────────────────────────────────────────────────────
export async function updateRecoveryCase(
  id: string,
  updates: Partial<Pick<RecoveryCase, 'status' | 'severity' | 'assignedTo' | 'tags' | 'isOverdue'>>
): Promise<RecoveryCase> {
  const body: Record<string, unknown> = {};
  if (updates.status !== undefined) body.status = updates.status;
  if (updates.severity !== undefined) body.severity = updates.severity;
  if (updates.assignedTo !== undefined) body.assigned_to = updates.assignedTo;
  if (updates.tags !== undefined) body.tags = updates.tags;
  if (updates.isOverdue !== undefined) body.is_overdue = updates.isOverdue;

  const res = await fetch(`/api/admin/recovery-cases/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Failed to update case');
  const json = await res.json();
  return mapRow(json.data);
}

// ── Derive stats from cases ───────────────────────────────────────────────────
export function deriveStats(cases: RecoveryCase[]): RecoveryStats {
  const resolved = cases.filter((c) => c.status === 'resolved');
  const avgHours =
    resolved.length > 0
      ? Math.round(
          resolved.reduce((sum, c) => {
            if (!c.resolvedAt) return sum;
            return sum + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()) / 3_600_000;
          }, 0) / resolved.length
        )
      : 0;

  return {
    totalOpen: cases.filter((c) => c.status === 'open').length,
    totalInProgress: cases.filter((c) => c.status === 'in_progress').length,
    totalEscalated: cases.filter((c) => c.status === 'escalated').length,
    totalResolved: resolved.length,
    totalClosed: cases.filter((c) => c.status === 'closed').length,
    overdueCount: cases.filter((c) => c.isOverdue).length,
    avgResolutionHours: avgHours,
    criticalCount: cases.filter((c) => c.severity === 'critical').length,
  };
}
