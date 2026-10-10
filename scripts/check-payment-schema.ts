/**
 * Script to verify if payment fields exist in the bookings table
 * This checks if the migration 20260320100000_add_payment_fields_to_bookings.sql has been applied
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaymentSchema() {
  console.log('Checking if payment fields exist in bookings table...\n');

  // Query the information_schema to check for payment columns
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name IN ('payment_intent_id', 'payment_status', 'payment_amount_cents', 'payment_currency')
      ORDER BY column_name;
    `
  });

  if (error) {
    console.error('Error checking schema:', error);
    
    // Try alternative method - just query the table
    console.log('\nTrying alternative method - querying bookings table...\n');
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('payment_intent_id, payment_status, payment_amount_cents, payment_currency')
      .limit(1);
    
    if (bookingError) {
      console.error('❌ Payment fields do NOT exist in bookings table');
      console.error('Error:', bookingError.message);
      console.log('\n⚠️  Migration needs to be applied!');
      process.exit(1);
    } else {
      console.log('✅ Payment fields exist in bookings table');
      console.log('Sample query successful:', bookingData);
      process.exit(0);
    }
  } else {
    if (data && data.length === 4) {
      console.log('✅ All payment fields exist in bookings table:');
      console.log(data);
      process.exit(0);
    } else {
      console.log('❌ Some payment fields are missing');
      console.log('Found columns:', data);
      console.log('\n⚠️  Migration needs to be applied!');
      process.exit(1);
    }
  }
}

checkPaymentSchema();
