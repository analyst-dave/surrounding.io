import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('Running location update...');
  // Since we don't have direct access to PostGIS raw functions without RPC,
  // we will call exec_sql which we saw might exist in the db.
  // Wait, I saw earlier in run_sql.ts that exec_sql "might not exist". 
  // Let's see if we can do this without raw SQL... No, we need ST_MakePoint.
  
  // We can just fetch all profiles, and update their location column? No, Supabase JS doesn't support ST_MakePoint string literals directly in .update().
  // However, I can use the same exec_sql function that was attempted before, or check if we can do it via a quick RPC creation.
  
  // Actually, we can fetch all users, then trigger a quick Deno edge function or just do it via standard exec_sql.
  const sql = `UPDATE profiles SET location = ST_SetSRID(ST_MakePoint(last_location_lng, last_location_lat), 4326)::geography WHERE last_location_lat IS NOT NULL;`;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  if (error) {
    console.error('Error running exec_sql:', error.message);
  } else {
    console.log('Success updating locations!');
  }
}
run();
