'use client';

import { useState } from 'react';
import { Plus, Calendar, Mail, Phone, MapPin, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Specialist {
    id: string;
    name: string;
    title: string;
    email: string | null;
    phone: string | null;
    bio: string | null;
    image_url: string | null;
    is_active: boolean;
    specialties: string[] | null;
    branch_id: string;
    branches?: { id: string; name: string; city: string; country: string };
    specialist_services?: { service_id: string; is_active: boolean; services: { id: string; name: string } | null }[];
}

interface SpecialistsListProps {
    specialists: Specialist[];
    services: { id: string; name: string }[];
    onSpecialistDeleted?: () => void;
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const filters = ['All Staff', 'Brow Specialists', 'Lash Technicians', 'Facial Therapists'];

const filterMap: Record<string, string> = {
    'Brow Specialists': 'brow',
    'Lash Technicians': 'lash',
    'Facial Therapists': 'facial',
};

export function SpecialistsList({ specialists, services, onSpecialistDeleted }: SpecialistsListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('All Staff');
    const supabase = createClient();

    const dynamicFilters = ['All Staff', ...services.map(s => s.name)]

    const filteredSpecialists = activeFilter === 'All Staff'
        ? specialists
        : specialists.filter(s =>
            s.specialist_services?.some(ss => ss.services?.name === activeFilter)
          )

    const handleDelete = async (specialistId: string, specialistName: string) => {
        setDeletingId(specialistId);
        try {
            const { error } = await supabase.from('specialists').delete().eq('id', specialistId);
            if (error) throw error;
            toast.success(`${specialistName} has been removed`);
            onSpecialistDeleted?.();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Failed to remove practitioner', { description: msg });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Practitioners</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage beauty and wellness specialists</p>
                </div>
                <Link
                    href="/admin/specialists/new"
                    className="flex items-center px-4 py-2 bg-[#6B4423] hover:bg-[#4A2C1A] text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Practitioner
                </Link>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
                {dynamicFilters.map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={cn(
                            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                            activeFilter === f
                                ? 'bg-[#6B4423] text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSpecialists.length === 0 && (
                    <div className="col-span-full py-16 text-center text-sm text-gray-500">
                        No practitioners found.{' '}
                        <Link href="/admin/specialists/new" className="text-[#6B4423] hover:underline">Add one</Link>.
                    </div>
                )}

                {filteredSpecialists.map(specialist => {
                    const initials = getInitials(specialist.name);
                    return (
                        <div
                            key={specialist.id}
                            className="bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden"
                            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                        >
                            {/* Card body */}
                            <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center">
                                {/* Avatar */}
                                <div className="relative mb-4">
                                    {specialist.image_url ? (
                                        <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-[#FFF8F0] shadow-sm">
                                            <Image
                                                src={specialist.image_url}
                                                alt={specialist.name}
                                                width={80}
                                                height={80}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-[#6B4423]/10 flex items-center justify-center text-xl font-bold text-[#6B4423] ring-4 ring-[#FFF8F0] shadow-sm">
                                            {initials}
                                        </div>
                                    )}
                                    <span className={cn(
                                        'absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white',
                                        specialist.is_active ? 'bg-emerald-500' : 'bg-rose-400'
                                    )} />
                                </div>

                                {/* Name + role */}
                                <h3 className="text-base font-bold text-gray-900 leading-tight">{specialist.name}</h3>
                                <p className="text-xs text-[#6B4423] font-medium mt-0.5 mb-4">{specialist.title}</p>

                                {/* Contact rows */}
                                <div className="w-full space-y-2 text-left">
                                    {specialist.email && (
                                        <div className="flex items-center gap-2.5 text-xs text-gray-500">
                                            <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                            <span className="truncate">{specialist.email}</span>
                                        </div>
                                    )}
                                    {specialist.phone && (
                                        <div className="flex items-center gap-2.5 text-xs text-gray-500">
                                            <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                            <span>{specialist.phone}</span>
                                        </div>
                                    )}
                                    {specialist.branches && (
                                        <div className="flex items-center gap-2.5 text-xs text-gray-500">
                                            <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                            <span className="truncate">{specialist.branches.name}, {specialist.branches.city}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer: Schedule | Edit */}
                            <div className="mt-auto border-t border-gray-100 grid grid-cols-2">
                                <Link
                                    href={`/admin/specialists/${specialist.id}/schedule`}
                                    className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
                                >
                                    <Calendar className="w-3.5 h-3.5" /> Schedule
                                </Link>
                                <Link
                                    href={`/admin/specialists/${specialist.id}`}
                                    className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-[#6B4423] hover:bg-[#6B4423]/5 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </Link>
                            </div>

                            {/* Remove */}
                            <div className="border-t border-gray-100">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="w-full py-2.5 text-xs text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5">
                                            <Trash2 className="w-3.5 h-3.5" /> Remove
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Practitioner</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to remove <strong>{specialist.name}</strong>? This cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(specialist.id, specialist.name)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                disabled={deletingId === specialist.id}
                                            >
                                                {deletingId === specialist.id ? 'Removing...' : 'Remove'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
