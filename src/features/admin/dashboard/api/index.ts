import { createClient } from '@/lib/supabase/client'

export interface DashboardStats {
  todayAppointments: number
  activeServices: number
  staffOnDuty: number
  pendingRecovery: number
}

export interface DashboardAppointment {
  id: string
  time: string
  clientName: string
  serviceName: string
  practitionerName: string
  duration: number
  status: 'Completed' | 'In Progress' | 'Confirmed'
}

/**
 * Fetch dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/admin/dashboard/stats')
  
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats')
  }
  
  return response.json()
}

/**
 * Fetch today's schedule
 */
export async function getTodaySchedule(): Promise<DashboardAppointment[]> {
  const response = await fetch('/api/admin/dashboard/schedule')
  
  if (!response.ok) {
    throw new Error('Failed to fetch today\'s schedule')
  }
  
  const data = await response.json()
  return data.appointments
}