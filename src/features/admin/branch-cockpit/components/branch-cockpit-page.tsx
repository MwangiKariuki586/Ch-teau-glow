'use client';

import { useState } from 'react';
import { Building, TrendingUp, Users, Clock, Star, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

const utilizationData = [
  { time: '09:00', staff: 4 },
  { time: '11:00', staff: 8 },
  { time: '13:00', staff: 10 },
  { time: '15:00', staff: 12 },
  { time: '17:00', staff: 11 },
  { time: '19:00', staff: 6 },
];

const revenueData = [
  { day: 'Mon', revenue: 12000 },
  { day: 'Tue', revenue: 15000 },
  { day: 'Wed', revenue: 14000 },
  { day: 'Thu', revenue: 18000 },
  { day: 'Fri', revenue: 24000 },
  { day: 'Sat', revenue: 28000 },
  { day: 'Sun', revenue: 22000 },
];

const serviceMix = [
  { name: 'Brow Services', percent: 45, color: 'bg-[#3E2723]' },
  { name: 'Lash Services', percent: 30, color: 'bg-[#C9A96E]' },
  { name: 'Facial Treatments', percent: 20, color: 'bg-gray-400' },
  { name: 'Other', percent: 5, color: 'bg-gray-200' },
];

const branches = ['Château Glow – Dubai Mall', 'Château Glow – JBR', 'Château Glow – DIFC'];

const tooltipStyle = {
  borderRadius: '8px',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  fontSize: '12px',
};

export function BranchCockpitPage() {
  const [branch, setBranch] = useState(branches[0]);

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#3E2723] rounded-lg">
            <Building className="w-6 h-6 text-[#C9A96E]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Branch Operations Cockpit</h2>
            <p className="text-sm text-gray-500">Real-time performance metrics</p>
          </div>
        </div>
        <select
          value={branch}
          onChange={e => setBranch(e.target.value)}
          className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg p-2.5 font-medium shadow-sm outline-none focus:ring-2 focus:ring-[#C9A96E]/40 focus:border-[#C9A96E]"
        >
          {branches.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Revenue Today', value: 'AED 14,250', sub: '+12% vs yesterday', subColor: 'text-emerald-600', icon: <TrendingUp className="w-5 h-5 text-emerald-500" /> },
          { label: 'Appointments', value: '42 / 50', sub: '84% capacity', subColor: 'text-gray-500', icon: <Users className="w-5 h-5 text-blue-500" /> },
          { label: 'Avg Service Time', value: '52 mins', sub: '+4 mins over target', subColor: 'text-rose-600', icon: <Clock className="w-5 h-5 text-amber-500" /> },
          { label: 'Client Satisfaction', value: '4.9 / 5.0', sub: 'Based on 18 reviews today', subColor: 'text-emerald-600', icon: <Star className="w-5 h-5 text-[#C9A96E]" /> },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl p-6 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">{card.label}</h3>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className={cn('text-xs font-medium mt-2', card.subColor)}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Charts column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Revenue line chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Revenue Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={v => `AED ${v / 1000}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`AED ${v.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#C9A96E" strokeWidth={3}
                    dot={{ r: 4, fill: '#C9A96E', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Staff utilization bar chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Staff Utilization Today</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="staff" fill="#3E2723" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">

          {/* Operational alerts */}
          <div className="bg-white rounded-xl p-6 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Operational Alerts
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <h4 className="text-sm font-semibold text-rose-800">Inventory Low</h4>
                <p className="text-xs text-rose-600 mt-1">Lash adhesive stock is below 15% threshold. Reorder required today.</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <h4 className="text-sm font-semibold text-amber-800">High Wait Times</h4>
                <p className="text-xs text-amber-600 mt-1">Average wait time in reception is currently 12 mins (Target: &lt;5 mins).</p>
              </div>
            </div>
          </div>

          {/* Service mix */}
          <div className="bg-white rounded-xl p-6 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Mix Today</h3>
            <div className="space-y-4">
              {serviceMix.map(item => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="text-gray-500">{item.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={cn('h-2 rounded-full', item.color)} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
