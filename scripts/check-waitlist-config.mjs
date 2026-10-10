#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 Checking waitlist dispatcher configuration...\n');

// Check app_settings
const { data: settings, error: settingsError } = await supabase
  .from('app_settings')
  .select('key, value')
  .in('key', ['waitlist_dispatcher_url', 'waitlist_dispatcher_bearer'])
  .order('key');

if (settingsError) {
  console.error('❌ Error fetching app_settings:', settingsError.message);
} else {
  console.log('📋 App Settings:');
  settings.forEach(setting => {
    const value = setting.value;
    console.log(`  ${setting.key}:`);
    if (typeof value === 'object') {
      Object.entries(value).forEach(([k, v]) => {
        if (k === 'token' && v) {
          console.log(`    ${k}: ${v.substring(0, 20)}...`);
        } else {
          console.log(`    ${k}: ${v || '(empty)'}`);
        }
      });
    }
  });
}

// Check pg_cron job
console.log('\n🕐 Checking pg_cron job...');
const { data: cronJob, error: cronError } = await supabase.rpc('check_cron_job', {});

if (cronError) {
  console.log('⚠️  Cannot check cron job directly (requires custom function)');
  console.log('   You can check manually in Supabase SQL Editor with:');
  console.log('   SELECT * FROM cron.job WHERE jobname = \'waitlist_dispatcher_every_minute\';');
}

console.log('\n✅ Configuration check complete!');
console.log('\n📝 To fix the dispatcher, run:');
console.log(`   UPDATE public.app_settings SET value = jsonb_build_object('url', 'YOUR_APP_URL/api/jobs/waitlist-dispatch') WHERE key = 'waitlist_dispatcher_url';`);
console.log(`   UPDATE public.app_settings SET value = jsonb_build_object('token', '${process.env.CRON_SECRET}') WHERE key = 'waitlist_dispatcher_bearer';`);
