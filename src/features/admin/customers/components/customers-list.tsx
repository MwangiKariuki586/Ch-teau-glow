'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  full_name: string | null;
  booking_count: number;
  completed_bookings: number;
  total_spent: number;
  last_booking: string | null;
  provider: string;
}

interface CustomersListProps {
  customers: Customer[];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'MMM dd, yyyy'); } catch { return '—'; }
}

export function CustomersList({ customers }: CustomersListProps) {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Records</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage all client accounts</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search clients by name, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/40 focus:border-[#C9A96E] shadow-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4" />
          Filter Records
        </button>
      </div>

      {/* Table card */}
      <div
        className="bg-white rounded-xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Visit</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Visits</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Preferred Services</th>
                <th className="px-6 py-3.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {search ? 'No clients match your search.' : 'No clients yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(customer => {
                  const displayName = customer.full_name || customer.email;
                  const initials = customer.full_name
                    ? getInitials(customer.full_name)
                    : customer.email.slice(0, 2).toUpperCase();

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-[#FFF8F0] transition-colors cursor-pointer group"
                    >
                      {/* Client Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#3E2723] flex items-center justify-center text-xs font-bold text-[#C9A96E] shrink-0">
                            {initials}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{displayName}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.phone || customer.email}
                      </td>

                      {/* Last Visit */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(customer.last_booking ?? customer.last_sign_in_at)}
                      </td>

                      {/* Total Visits */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {customer.booking_count}
                      </td>

                      {/* Preferred Services — completed bookings as proxy */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {customer.completed_bookings > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {customer.completed_bookings} completed
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No visits yet</span>
                          )}
                        </div>
                      </td>

                      {/* Chevron */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#C9A96E] transition-colors ml-auto" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
