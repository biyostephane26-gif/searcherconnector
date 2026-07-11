require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('opportunities').select('*');
  if (error) console.error(error);
  console.log('Total opportunities:', data?.length);
  if (data?.length > 0) {
    console.log('Sample:', data[data.length - 1]);
  }
}

run();
