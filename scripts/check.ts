import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUser = users.users.find(u => u.email === 'test@surrounding.io');
  if (!testUser) {
     console.log("No test user found in first 50");
     // Let's search by email directly if listUsers paginates
     const { data: all } = await supabase.from('profiles').select('*');
     console.log("Total profiles:", all?.length);
  } else {
     console.log("Test user id:", testUser.id);
     const { data: conns, error } = await supabase.from('connections').select(`
        id,
        requester_id,
        addressee_id,
        requester:profiles!connections_requester_id_fkey(id, username),
        addressee:profiles!connections_addressee_id_fkey(id, username),
        messages(id)
     `).eq('status', 'accepted').or(`requester_id.eq.${testUser.id},addressee_id.eq.${testUser.id}`);
     
     console.log("Connections found:", conns?.length);
     if (error) console.error("Error:", error);
  }
}
check();
