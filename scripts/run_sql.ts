import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = fs.readFileSync('patch_relocate.sql', 'utf-8');
  console.log('Running SQL...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  if (error) {
    console.error('Error (exec_sql might not exist, using alternative):', error.message);
    // Let's just instruct the user to run it via supabase dashboard if we can't execute raw sql easily
  } else {
    console.log('Success:', data);
  }
}
run();
