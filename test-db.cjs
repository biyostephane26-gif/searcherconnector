require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Testing insert with anon client...');
  const testOpp = {
    user_id: 'd9bfa3b6-96b4-4e2a-bb3b-734e6bdf2cb9', // Dummy UUID or a valid user ID
    title: 'Test Opportunity',
    company: 'Test Company',
    score: 85,
    status: 'found'
  };

  const { data, error } = await supabase.from('opportunities').insert([testOpp]).select();
  if (error) {
    console.error('Insert error (anon client):', error);
  } else {
    console.log('Insert success (anon client):', data);
  }
}

run();
