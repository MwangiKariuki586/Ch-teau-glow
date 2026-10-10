import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session.ok) {
      return NextResponse.json({ error: session.message }, { status: session.status })
    }

    const supabase = await createServiceRoleClient('admin_dashboard_read')

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const todayStart = `${today}T00:00:00`
    const todayEnd = `${today}T23:59:59`

    // Get today's appointments with related data using the correct schema
    const { data: appointments, error } = await supabase
      .from('bookings')
      .select(`
        id,
        starts_at,
        ends_at,
        status,
        user_id,
        service:services(id,name),
        specialist:specialists(id,name)
      `)
      .gte('starts_at', todayStart)
      .lte('starts_at', todayEnd)
      .order('starts_at', { ascending: true })
      .limit(10)

    if (error) {
      console.error('Error fetching schedule:', error)
      return NextResponse.json({ 
        appointments: [],
        error: `Database error: ${error.message}`
      })
    }

    // Get user names from auth.admin (user_profiles table is empty for these users)
    const userIds = appointments?.map((apt: any) => apt.user_id).filter(Boolean) || []
    let nameMap: Record<string, string> = {}

    if (userIds.length > 0) {
      await Promise.all(
        userIds.map(async (uid: string) => {
          const { data } = await supabase.auth.admin.getUserById(uid)
          if (data?.user) {
            const meta = data.user.user_metadata
            const name =
              meta?.full_name ||
              `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() ||
              meta?.name ||
              data.user.email?.split('@')[0] ||
              null
            if (name) nameMap[uid] = name
          }
        })
      )
    }

    const transformedAppointments = appointments?.map((appointment: any) => {
      const startTime = appointment.starts_at ? new Date(appointment.starts_at) : null
      const endTime = appointment.ends_at ? new Date(appointment.ends_at) : null
      const duration = startTime && endTime ?
        Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) : 60

      const clientName =
        (appointment.user_id && nameMap[appointment.user_id]) ||
        appointment.guest_name ||
        'Guest'

      return {
        id: appointment.id,
        time: startTime ?
          startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD',
        clientName,
        serviceName: appointment.service?.name || 'Unknown Service',
        practitionerName: appointment.specialist?.name || 'Unassigned',
        duration,
        status: appointment.status === 'confirmed' ? 'Confirmed' :
                appointment.status === 'completed' ? 'Completed' :
                appointment.status === 'pending' ? 'In Progress' : 'Confirmed'
      }
    }) || []

    return NextResponse.json({ appointments: transformedAppointments })
  } catch (error) {
    console.error('Dashboard schedule error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        appointments: []
      },
      { status: 500 }
    )
  }
}