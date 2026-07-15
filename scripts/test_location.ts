import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    const { data: profiles, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) { console.error('select error:', error); return; }
    
    const pid = profiles[0].id;
    const { data, error: updateError } = await supabase.from('profiles').update({ location: 'POINT(-121.4944 38.5816)' }).eq('id', pid);
    console.log('Update result:', data, updateError);
}
run();
