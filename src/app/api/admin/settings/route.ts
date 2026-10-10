import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all settings from app_settings table
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'email_templates',
        'notification_settings', 
        'payment_settings'
      ])

    if (settingsError) {
      console.error('Settings fetch error:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Transform settings data into expected format
    const settings = {
      email_templates: [],
      notifications: {
        email_notifications: true,
        sms_notifications: true,
        push_notifications: false,
        booking_alerts: true,
        system_alerts: true,
        marketing_emails: false,
        reminder_notifications: true
      },
      payments: {
        stripe_public_key: '',
        stripe_secret_key: '',
        payment_methods: ['card'],
        currency: 'USD',
        require_deposit: false,
        deposit_percentage: 0,
        refund_policy_days: 7,
        auto_capture: false
      }
    }

    // Apply fetched settings
    settingsData?.forEach(setting => {
      if (setting.key === 'notification_settings' && setting.value) {
        settings.notifications = { ...settings.notifications, ...(setting.value as any) }
      } else if (setting.key === 'payment_settings' && setting.value) {
        settings.payments = { ...settings.payments, ...(setting.value as any) }
      } else if (setting.key === 'email_templates' && setting.value) {
        settings.email_templates = setting.value as any
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 })
    }

    // Update settings in app_settings table
    const { error: updateError } = await supabase
      .from('app_settings')
      .upsert({
        key: type,
        value: data,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Settings update error:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}