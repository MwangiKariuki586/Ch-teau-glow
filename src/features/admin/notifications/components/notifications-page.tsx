'use client';

import { useState } from 'react';
import { Calendar, ShieldAlert, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationType = 'booking' | 'alert' | 'completion' | 'system' | 'recovery';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: 1, type: 'booking',    title: 'New Booking Received',   desc: 'Lash Lift for Emma W. scheduled for tomorrow at 3:00 PM.',          time: '10 mins ago',  read: false },
  { id: 2, type: 'alert',      title: 'High Wait Times',         desc: 'Average wait time in reception is currently 12 mins.',              time: '1 hour ago',   read: false },
  { id: 3, type: 'completion', title: 'Service Completed',       desc: 'Brow Lamination by Elena R. has been completed.',                   time: '2 hours ago',  read: true  },
  { id: 4, type: 'system',     title: 'System Update',           desc: 'DWS platform will undergo maintenance tonight at 2:00 AM.',         time: '5 hours ago',  read: true  },
  { id: 5, type: 'recovery',   title: 'New Recovery Case',       desc: 'Case #1042 raised for Scheduling Error (Sarah Smith).',             time: 'Yesterday',    read: true  },
  { id: 6, type: 'booking',    title: 'Booking Cancelled',       desc: 'HydraFacial for Zainab Ali at 4:00 PM has been cancelled.',         time: 'Yesterday',    read: true  },
  { id: 7, type: 'alert',      title: 'Inventory Low',           desc: 'Lash adhesive stock is below 15% threshold.',                       time: 'Yesterday',    read: true  },
  { id: 8, type: 'completion', title: 'Daily Target Reached',    desc: 'Branch has reached 100% of daily revenue target.',                  time: '2 days ago',   read: true  },
];

const tabs = ['All', 'Unread', 'Bookings', 'Alerts', 'System'] as const;

function getIcon(type: NotificationType) {
  switch (type) {
    case 'booking':    return <Calendar    className="w-5 h-5 text-blue-500" />;
    case 'alert':      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'completion': return <CheckCircle  className="w-5 h-5 text-emerald-500" />;
    case 'system':     return <Info         className="w-5 h-5 text-gray-500" />;
    case 'recovery':   return <ShieldAlert  className="w-5 h-5 text-rose-500" />;
  }
}

function getIconBg(type: NotificationType) {
  switch (type) {
    case 'booking':    return 'bg-blue-50 border-blue-100';
    case 'alert':      return 'bg-amber-50 border-amber-100';
    case 'completion': return 'bg-emerald-50 border-emerald-100';
    case 'system':     return 'bg-gray-50 border-gray-200';
    case 'recovery':   return 'bg-rose-50 border-rose-100';
  }
}

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('All');
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const filtered = notifications.filter(n => {
    if (activeTab === 'All')      return true;
    if (activeTab === 'Unread')   return !n.read;
    if (activeTab === 'Bookings') return n.type === 'booking';
    if (activeTab === 'Alerts')   return n.type === 'alert' || n.type === 'recovery';
    if (activeTab === 'System')   return n.type === 'system';
    return true;
  });

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">
            You have {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}.
          </p>
        </div>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Mark All Read
        </button>
      </div>

      {/* Card */}
      <div
        className="bg-white rounded-xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'border-[#C9A96E] text-[#3E2723]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* List */}
        <div className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-500">No notifications found.</p>
            </div>
          ) : (
            filtered.map(n => (
              <div
                key={n.id}
                className={cn(
                  'p-6 flex items-start gap-4 hover:bg-[#FFF8F0]/60 transition-colors cursor-pointer',
                  !n.read && 'bg-[#FFF8F0]/40'
                )}
                onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
              >
                {/* Icon */}
                <div className={cn('p-2 rounded-lg border shrink-0', getIconBg(n.type))}>
                  {getIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={cn('text-sm font-semibold', n.read ? 'text-gray-700' : 'text-gray-900')}>
                      {n.title}
                    </h4>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{n.time}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{n.desc}</p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="shrink-0 mt-1.5">
                    <div className="w-2.5 h-2.5 bg-[#C9A96E] rounded-full" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
