import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemDefaults } from '@/features/admin/settings/lib/system-defaults'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch payment settings from app_settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'payment_settings')
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Payment settings fetch error:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Get dynamic default settings
    const systemDefaults = await getSystemDefaults()
    const settings = settingsData?.value || systemDefaults.defaultPaymentSettings

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Payment settings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Update payment settings in app_settings table
    const { error: updateError } = await supabase
      .from('app_settings')
      .upsert({
        key: 'payment_settings',
        value: body,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Payment settings update error:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment settings update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}