import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrencies, getPaymentMethods } from '@/features/admin/settings/lib/system-defaults'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dynamic configuration
    const [currencies, paymentMethods] = await Promise.all([
      getCurrencies(),
      getPaymentMethods()
    ])

    return NextResponse.json({
      currencies,
      paymentMethods
    })
  } catch (error) {
    console.error('Config API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}