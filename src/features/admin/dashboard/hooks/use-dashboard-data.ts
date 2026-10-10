"use client"

import { useState, useEffect } from 'react'
import { getDashboardStats, getTodaySchedule } from '../api'
import type { DashboardStats, DashboardAppointment } from '../api'

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch stats and schedule separately to isolate errors
      let statsData: DashboardStats = {
        todayAppointments: 0,
        activeServices: 0,
        staffOnDuty: 0,
        pendingRecovery: 0
      }
      let scheduleData: DashboardAppointment[] = []

      // Try to fetch stats
      try {
        statsData = await getDashboardStats()
      } catch (statsError) {
        console.error('Failed to fetch dashboard stats:', statsError)
        // Continue with default values
      }

      // Try to fetch schedule
      try {
        scheduleData = await getTodaySchedule()
      } catch (scheduleError) {
        console.error('Failed to fetch today\'s schedule:', scheduleError)
        // Continue with empty array
      }
      
      setStats(statsData)
      setAppointments(scheduleData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data'
      setError(errorMessage)
      console.error('Dashboard data error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const refetch = async () => {
    await fetchDashboardData()
  }

  return {
    stats,
    appointments,
    loading,
    error,
    refetch
  }
}