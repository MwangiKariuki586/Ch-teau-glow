'use client';

import { CheckCircle2, Circle, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecoveryPlaybook } from '../types';

interface RecoveryPlaybookPanelProps {
  playbook: RecoveryPlaybook;
  onToggleStep: (stepId: string) => void;
}

export function RecoveryPlaybookPanel({ playbook, onToggleStep }: RecoveryPlaybookPanelProps) {
  const completedCount = playbook.steps.filter((s) => s.isCompleted).length;
  const totalCount = playbook.steps.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[#6B4423]/10 p-1.5">
            <BookOpen className="h-4 w-4 text-[#6B4423]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{playbook.name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Est. {playbook.estimatedResolutionHours}h resolution
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-[#6B4423]">{progressPct}%</p>
          <p className="text-xs text-gray-400">{completedCount}/{totalCount} steps</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6B4423] to-[#C9A96E] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <ol className="space-y-2">
        {playbook.steps.map((step) => (
          <li key={step.id}>
            <button
              onClick={() => onToggleStep(step.id)}
              className={cn(
                'w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-all duration-150',
                step.isCompleted
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-gray-200 hover:border-[#C9A96E]/50 hover:bg-[#FFF8F0]'
              )}
            >
              <span className="mt-0.5 shrink-0">
                {step.isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      step.isCompleted ? 'text-emerald-700 line-through' : 'text-gray-900'
                    )}
                  >
                    {step.order}. {step.title}
                  </span>
                  {step.isRequired && !step.isCompleted && (
                    <span className="text-xs text-rose-500 font-medium">Required</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                {step.isCompleted && step.completedBy && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ✓ Completed by {step.completedBy}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
