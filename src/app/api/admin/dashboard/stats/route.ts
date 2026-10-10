import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const todayStart = `${today}T00:00:00`
    const todayEnd = `${today}T23:59:59`

    // Initialize default values
    let todayAppointments = 0
    let activeServices = 0
    let staffOnDuty = 0
    let pendingRecovery = 0

    // Get today's appointments count using starts_at field
    try {
      const { count, error: appointmentsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('starts_at', todayStart)
        .lte('starts_at', todayEnd)

      if (!appointmentsError && count !== null) {
        todayAppointments = count
      }
    } catch (error) {
      console.error('Error fetching appointments count:', error)
    }

    // Get active services count (using status = 'published' based on existing API)
    try {
      const { count, error: servicesError } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')

      if (!servicesError && count !== null) {
        activeServices = count
      }
    } catch (error) {
      console.error('Error fetching services count:', error)
    }

    // Get staff on duty count (using is_active = true based on existing API)
    try {
      const { count, error: staffError } = await supabase
        .from('specialists')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (!staffError && count !== null) {
        staffOnDuty = count
      }
    } catch (error) {
      console.error('Error fetching staff count:', error)
    }

    // Get pending recovery cases (cancelled bookings)
    try {
      const { count, error: recoveryError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')

      if (!recoveryError && count !== null) {
        pendingRecovery = count
      }
    } catch (error) {
      console.error('Error fetching recovery cases:', error)
    }

    return NextResponse.json({
      todayAppointments,
      activeServices,
      staffOnDuty,
      pendingRecovery,
      debug: {
        date: today,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        todayAppointments: 0,
        activeServices: 0,
        staffOnDuty: 0,
        pendingRecovery: 0
      },
      { status: 500 }
    )
  }
}