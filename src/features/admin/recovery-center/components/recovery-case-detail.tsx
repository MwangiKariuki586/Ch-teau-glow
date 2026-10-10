'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  Wrench,
  Phone,
  Mail,
  ArrowUpCircle,
  CheckCircle2,
  MessageSquare,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RecoveryCase, RecoveryAction, RecoveryPlaybook } from '../types';
import { severityConfig, statusConfig } from './recovery-case-card';
import { RecoveryCaseTimeline } from './recovery-case-timeline';
import { RecoveryPlaybookPanel } from './recovery-playbook-panel';

interface RecoveryCaseDetailProps {
  recoveryCase: RecoveryCase;
  timeline: RecoveryAction[];
  playbook: RecoveryPlaybook | null;
  onBack: () => void;
  onToggleStep: (stepId: string) => void;
  onUpdateCase?: (id: string, updates: Partial<Pick<RecoveryCase, 'status' | 'severity' | 'assignedTo'>>) => Promise<void>;
}

type ActivePanel = 'timeline' | 'playbook' | 'escalate' | 'resolve';

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-gray-500 text-xs">{label}</span>
        <p className="text-gray-900 font-medium">{value}</p>
      </div>
    </div>
  );
}

export function RecoveryCaseDetail({
  recoveryCase: c,
  timeline,
  playbook,
  onBack,
  onToggleStep,
  onUpdateCase,
}: RecoveryCaseDetailProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>('timeline');
  const [noteText, setNoteText] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateTo, setEscalateTo] = useState('Branch Manager');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveType, setResolveType] = useState('Full Refund Issued');
  const [saving, setSaving] = useState(false);

  const sev = severityConfig(c.severity);
  const sta = statusConfig(c.status);

  const panelTabs: { id: ActivePanel; label: string }[] = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'playbook', label: 'Playbook' },
    { id: 'escalate', label: 'Escalate' },
    { id: 'resolve', label: 'Resolve' },
  ];

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0 -ml-1 text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono font-semibold text-gray-400">{c.caseNumber}</span>
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-bold border',
                sev.className
              )}
            >
              {sev.label}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-0.5 text-xs font-medium border',
                sta.className
              )}
            >
              {sta.label}
            </span>
            {c.isOverdue && (
              <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50">
                ⚠ Overdue
              </Badge>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{c.issueType}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{c.clientName}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: context + description */}
        <div className="lg:col-span-1 space-y-4">
          {/* Client & appointment context */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Client & Appointment
            </p>
            <InfoRow icon={User} label="Client" value={c.clientName} />
            <InfoRow icon={Mail} label="Email" value={c.clientEmail} />
            <InfoRow icon={Phone} label="Phone" value={c.clientPhone} />
            <InfoRow icon={Calendar} label="Appointment" value={c.appointmentDate} />
            <InfoRow icon={Wrench} label="Service" value={c.serviceName} />
            <InfoRow icon={MapPin} label="Branch" value={c.branchName} />
            <InfoRow icon={User} label="Practitioner" value={c.practitionerName} />
            <InfoRow icon={User} label="Assigned To" value={c.assignedTo} />
          </div>

          {/* Issue summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Issue Summary
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{c.issueDescription}</p>
          </div>

          {/* Tags */}
          {c.tags.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 border border-gray-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: action panels */}
        <div className="lg:col-span-2 space-y-4">
          {/* Panel tabs */}
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 overflow-x-auto">
            {panelTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={cn(
                  'flex-1 shrink-0 rounded-lg py-2 px-2 text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  activePanel === tab.id
                    ? 'bg-white text-[#6B4423] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 min-h-[320px]">
            {/* Timeline */}
            {activePanel === 'timeline' && (
              <div className="space-y-4">
                <RecoveryCaseTimeline actions={timeline} />

                {/* Add note */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> Add Note
                  </p>
                  <Textarea
                    placeholder="Add a note to the case timeline…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <Button
                    size="sm"
                    disabled={!noteText.trim()}
                    className="bg-[#6B4423] hover:bg-[#5a3820] text-white"
                    onClick={() => setNoteText('')}
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            )}

            {/* Playbook */}
            {activePanel === 'playbook' && (
              <>
                {playbook ? (
                  <RecoveryPlaybookPanel
                    playbook={playbook}
                    onToggleStep={onToggleStep}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-gray-400">
                      No playbook matched for this issue type.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Handle this case manually using the timeline.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Escalate */}
            {activePanel === 'escalate' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-purple-100 p-1.5">
                    <ArrowUpCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Escalate Case</p>
                    <p className="text-xs text-gray-500">
                      Assign to a senior owner and flag for priority handling.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Escalate To
                    </label>
                    <select
                      value={escalateTo}
                      onChange={(e) => setEscalateTo(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]"
                    >
                      <option>Branch Manager</option>
                      <option>Medical Team</option>
                      <option>HR / People Team</option>
                      <option>Operations Director</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Reason for Escalation
                    </label>
                    <Textarea
                      placeholder="Describe why this case needs escalation…"
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      rows={4}
                      className="text-sm resize-none"
                    />
                  </div>
                  <Button
                    disabled={!escalateReason.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={async () => {
                      if (!onUpdateCase) return;
                      setSaving(true);
                      await onUpdateCase(c.id, { status: 'escalated', assignedTo: escalateTo });
                      setSaving(false);
                      setEscalateReason('');
                    }}
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    {saving ? 'Escalating…' : 'Escalate Case'}
                  </Button>
                </div>
              </div>
            )}

            {/* Resolve */}
            {activePanel === 'resolve' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Resolve & Close Case</p>
                    <p className="text-xs text-gray-500">
                      Capture the outcome and close this recovery case.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Resolution Type
                    </label>
                    <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]">
                      <option>Full Refund Issued</option>
                      <option>Partial Refund Issued</option>
                      <option>Complimentary Redo Offered</option>
                      <option>Credit Applied to Account</option>
                      <option>Apology Accepted — No Compensation</option>
                      <option>Referred to Medical Team</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Client Satisfaction (1–5)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          className="h-9 w-9 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-[#C9A96E] hover:bg-[#FFF8F0] transition-colors"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Resolution Notes
                    </label>
                    <Textarea
                      placeholder="Describe the resolution and any follow-up actions…"
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      rows={4}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="followup"
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="followup" className="text-sm text-gray-600">
                      Schedule follow-up with client in 48 hours
                    </label>
                  </div>
                  <Button
                    disabled={!resolveNotes.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={async () => {
                      if (!onUpdateCase) return;
                      setSaving(true);
                      // Set status to 'closed' directly — 'resolved' is an intermediate
                      // admin state; from the customer's perspective the case is closed.
                      await onUpdateCase(c.id, { status: 'closed' });
                      setSaving(false);
                      setResolveNotes('');
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {saving ? 'Resolving…' : 'Resolve & Close Case'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
