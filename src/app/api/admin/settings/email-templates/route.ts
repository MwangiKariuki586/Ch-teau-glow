import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Default email templates - these could be moved to system configuration
const getDefaultTemplates = () => [
  {
    id: '1',
    name: 'Booking Confirmation',
    subject: `Your booking is confirmed - {{booking_number}}`,
    content: `Dear {{customer_name}},

Your booking for {{service_name}} on {{booking_date}} at {{booking_time}} has been confirmed.

Booking Details:
- Service: {{service_name}}
- Date: {{booking_date}}
- Time: {{booking_time}}
- Location: {{branch_name}}
- Specialist: {{specialist_name}}

Thank you for choosing ${process.env.BUSINESS_NAME || 'our service'}!

Best regards,
The ${process.env.BUSINESS_NAME || 'Team'} Team`,
    type: 'booking_confirmation',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Booking Reminder',
    subject: `Reminder: Your appointment tomorrow - {{booking_number}}`,
    content: `Dear {{customer_name}},

This is a reminder that you have an appointment for {{service_name}} tomorrow at {{booking_time}}.

Appointment Details:
- Service: {{service_name}}
- Date: {{booking_date}}
- Time: {{booking_time}}
- Location: {{branch_name}}
- Specialist: {{specialist_name}}

We look forward to seeing you!

Best regards,
The ${process.env.BUSINESS_NAME || 'Team'} Team`,
    type: 'booking_reminder',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Booking Cancellation',
    subject: `Booking Cancelled - {{booking_number}}`,
    content: `Dear {{customer_name}},

We confirm that your booking for {{service_name}} on {{booking_date}} at {{booking_time}} has been cancelled.

If you need to reschedule or have any questions, please don't hesitate to contact us at ${process.env.BUSINESS_EMAIL || 'our support team'}.

Thank you for your understanding.

Best regards,
The ${process.env.BUSINESS_NAME || 'Team'} Team`,
    type: 'booking_cancellation',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Contact Response',
    subject: `Thank you for contacting ${process.env.BUSINESS_NAME || 'us'}`,
    content: `Dear {{customer_name}},

Thank you for reaching out to us. We have received your message and will get back to you within 24 hours.

Your Message:
{{customer_message}}

If you have any urgent concerns, please call us directly at ${process.env.BUSINESS_PHONE || 'our phone number'}.

Best regards,
The ${process.env.BUSINESS_NAME || 'Team'} Team`,
    type: 'contact_response',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch email templates from app_settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'email_templates')
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Email templates fetch error:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    const rawTemplates = settingsData?.value || getDefaultTemplates();
    // Ensure every template has a unique non-empty id
    const templates = Array.isArray(rawTemplates)
      ? rawTemplates.map((t: any, i: number) => ({
          ...t,
          id: t.id || String(i + 1),
        }))
      : getDefaultTemplates();

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Email templates API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Get existing templates
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'email_templates')
      .single()

    const existingTemplates = (settingsData?.value as any[]) || []
    
    // Create new template
    const newTemplate = {
      id: Date.now().toString(),
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const updatedTemplates = [...existingTemplates, newTemplate]

    // Update in database
    const { error: updateError } = await supabase
      .from('app_settings')
      .upsert({
        key: 'email_templates',
        value: updatedTemplates,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Template creation error:', updateError)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json(newTemplate, { status: 201 })
  } catch (error) {
    console.error('Email template creation error:', error)
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
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Get existing templates
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'email_templates')
      .single()

    const existingTemplates = (settingsData?.value as any[]) || []
    
    // Update template
    const updatedTemplates = existingTemplates.map(template => 
      template.id === id 
        ? { ...template, ...updates, updated_at: new Date().toISOString() }
        : template
    )

    // Update in database
    const { error: updateError } = await supabase
      .from('app_settings')
      .upsert({
        key: 'email_templates',
        value: updatedTemplates,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Template update error:', updateError)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    const updatedTemplate = updatedTemplates.find(t => t.id === id)
    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Email template update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}