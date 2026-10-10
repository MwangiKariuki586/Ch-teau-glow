'use client';

import { useState } from 'react';
import { ShieldAlert, PlusCircle, List, Clock, MessageSquare, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComplaintForm } from './complaint-form';
import { MyComplaintsList } from './my-complaints-list';

type Tab = 'new' | 'history';

const INFO_ITEMS = [
  {
    icon: Clock,
    title: 'Fast Response',
    body: 'All complaints are reviewed within 24–72 hours. Urgent cases are escalated immediately.',
  },
  {
    icon: MessageSquare,
    title: 'We Listen',
    body: 'Every complaint is read by our team. Your feedback directly improves our service quality.',
  },
  {
    icon: CheckCircle2,
    title: 'Tracked to Resolution',
    body: 'You can track the status of your complaint and edit or withdraw it at any time.',
  },
];

export function CustomerComplaintsPage() {
  const [tab, setTab] = useState<Tab>('new');

  return (
    <div className="min-h-screen pb-12">
      {/* ── Page header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-100 p-2.5">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Complaints</h1>
            <p className="text-sm text-gray-500">
              Report an issue with a service or experience. Our team will respond promptly.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setTab('new')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
              tab === 'new'
                ? 'bg-white text-[#6B4423] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <PlusCircle className="h-4 w-4" />
            New Complaint
          </button>
          <button
            onClick={() => setTab('history')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
              tab === 'history'
                ? 'bg-white text-[#6B4423] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <List className="h-4 w-4" />
            My Complaints
          </button>
        </div>
      </div>

      {/* ── New complaint — full-width two-column layout ── */}
      {tab === 'new' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form — takes 2/3 */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="rounded-2xl border border-gray-200 bg-white flex flex-col flex-1">
              {/* Form header */}
              <div className="border-b border-gray-100 px-8 py-5 shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">Submit a Complaint</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Fill in the details below. All fields marked{' '}
                  <span className="text-rose-500 font-medium">*</span> are required.
                </p>
              </div>
              {/* Form body — fills remaining height */}
              <div className="px-8 py-6 flex-1 flex flex-col">
                <ComplaintForm />
              </div>
            </div>
          </div>

          {/* Info panel — takes 1/3 */}
          <div className="lg:col-span-1 space-y-4">
            {/* What to expect */}
            <div className="rounded-2xl border border-gray-200 bg-[#FFF8F0] p-6">
              <h3 className="text-sm font-semibold text-[#6B4423] uppercase tracking-wide mb-4">
                What to Expect
              </h3>
              <div className="space-y-5">
                {INFO_ITEMS.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-white p-2 shadow-sm border border-[#C9A96E]/20 shrink-0">
                      <item.icon className="h-4 w-4 text-[#6B4423]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response time guide */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Response Times
              </h3>
              <div className="space-y-4">
                {[
                  {
                    category: 'Staff Issues',
                    examples: 'Conduct, Attitude, Skill',
                    time: '48 hrs',
                    dot: 'bg-orange-400',
                    label: 'High',
                  },
                  {
                    category: 'Service Issues',
                    examples: 'Quality, Product Reaction, Hygiene',
                    time: '72 hrs',
                    dot: 'bg-amber-400',
                    label: 'Medium',
                  },
                  {
                    category: 'System Issues',
                    examples: 'Scheduling, Pricing, Communication',
                    time: '96 hrs',
                    dot: 'bg-blue-400',
                    label: 'Low',
                  },
                ].map((row) => (
                  <div key={row.category} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', row.dot)} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{row.category}</p>
                        <p className="text-xs text-gray-400">{row.examples}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-gray-900">{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── My complaints — full width ── */}
      {tab === 'history' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Showing all complaints you have submitted. You can edit or withdraw open cases.
          </p>
          <MyComplaintsList />
        </div>
      )}
    </div>
  );
}
