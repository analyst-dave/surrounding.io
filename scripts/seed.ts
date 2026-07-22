import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const Narratives: Record<string, string[]> = {
    "Work": ["Did you see the Q3 reorg email?", "Sarah resigned, taking the leads with her.", "The D3 logic is finally stable.", "CEO wants a demo of the spatial map.", "Can we push the meeting to 3?", "Sure, no problem.", "The new feature is finally stable.", "Are you in the office today?", "Working from home.", "Let's grab coffee later.", "Sounds good!"],
    "Family": ["Aunt May's pie is officially toxic.", "Mark's mansion moat is leaking.", "Thanksgiving is in Tahoe this year.", "Mom found the old albums.", "Are we still on for Sunday dinner?", "Yes! Bringing dessert.", "Don't tell her that!", "Again?!", "Awesome, booking flights now.", "Call me when you're free.", "Will do!"],
    "Church": ["Pastor's Vegas secret is out.", "Bake sale hit the 10k target.", "Youth group needs a new leader.", "Audit starts on Friday.", "Choir practice at 7 PM.", "I'll be there.", "Can you help set up chairs?", "Already on it.", "Community drive this weekend.", "I have some clothes to donate.", "Praying for your family."],
    "Investors": ["Burn rate is $180k. We have 14 months.", "Series A term sheet is signed. 25M post-money.", "Lead VC wants observer rights.", "User retention is up 40%.", "Q2 margins are looking thin.", "We're optimizing server costs.", "Growth is up 40% MoM.", "Excellent, keep it up.", "Need the updated cap table.", "Board meeting moved to Friday.", "Noted."],
    "DevTeam": ["Elasticity target set to 0.1.", "React flow vs D3?", "Websocket latency is high.", "Merge the hotfix.", "Prod is down!", "Reverting the last PR.", "Docker container failed.", "Check the logs.", "Who pushed to main?", "API response is too slow.", "Adding Redis cache."],
    "Singles": ["MRI results are clear. Fast for 20h.", "Legal discovery phase begins Monday.", "Tax returns are finalized.", "The broker called about the property."]
};

const GROUP_NAMES = ["Work", "Family", "Church", "Investors", "DevTeam"];

async function seed() {
  console.log("🌱 Starting Database Seed (168 Connections + 30 Discoverable)...");

  // 1. Create Main User
  console.log("Creating main test user (test@surrounding.io)...");
  await supabase.auth.admin.createUser({
    email: 'test@surrounding.io',
    password: 'password123',
    email_confirm: true,
    user_metadata: { full_name: 'Test User', user_name: 'testuser', avatar_url: 'https://github.com/shadcn.png' }
  });

  const { data: existingUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const mainUserId = existingUser.users.find(u => u.email === 'test@surrounding.io')?.id;

  if (!mainUserId) {
    console.error("Could not find or create main user.");
    return;
  }

  await new Promise(res => setTimeout(res, 2000));

  const baseLat = 38.5816;
  const baseLng = -121.4944;
  await supabase.from('profiles').update({ location: `POINT(${baseLng} ${baseLat})` }).eq('id', mainUserId);

  console.log("Generating dummy users data...");
  const nodes: any[] = [];
  
  // 168 Connected Nodes
  for(let i=1; i <= 168; i++) {
    const isSingle = i > 158;
    const group = isSingle ? 'singles' : (i % 5);
    const groupName = isSingle ? 'Singles' : GROUP_NAMES[group as number];
    const gender = i % 2 === 0 ? 'men' : 'women';
    const faceId = Math.floor(i / 2) % 100;
    
    nodes.push({
      id: i,
      email: `user${i}@mock.surrounding.io`,
      name: isSingle ? ["Lawyer", "CPA", "MD", "Agent", "Mentor"][i%5] + "_" + i : `Contact_${i}`,
      group: group,
      groupName: groupName,
      avatar: `https://randomuser.me/api/portraits/${gender}/${faceId}.jpg`,
      isConnected: true
    });
  }

  // 30 Discoverable Nodes
  for(let i=169; i <= 198; i++) {
    const gender = i % 2 === 0 ? 'men' : 'women';
    const faceId = Math.floor(i / 2) % 100;
    nodes.push({
      id: i,
      email: `discover${i}@mock.surrounding.io`,
      name: `Nearby_${i}`,
      group: 'discover',
      groupName: 'Discover',
      avatar: `https://randomuser.me/api/portraits/${gender}/${faceId}.jpg`,
      isConnected: false
    });
  }

  console.log("Creating auth users and profiles in Supabase...");
  const authIds: Record<string, string> = {};
  for (let i = 0; i < nodes.length; i += 5) {
    const batch = nodes.slice(i, i + 5);
    await Promise.all(batch.map(async (n) => {
      await supabase.auth.admin.createUser({
        email: n.email, password: 'password123', email_confirm: true,
        user_metadata: { full_name: n.name, user_name: n.name.toLowerCase(), avatar_url: n.avatar }
      });
    }));
    process.stdout.write(`.` );
  }
  console.log("\nUsers created. Waiting for triggers...");
  await new Promise(res => setTimeout(res, 3000));

  const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  nodes.forEach(n => {
    const u = allUsers.users.find(u => u.email === n.email);
    if (u) authIds[n.id] = u.id;
  });

  console.log("Setting spatial locations and group metadata...");
  for (const n of nodes) {
    if (!authIds[n.id]) continue;
    const latOffset = (Math.random() - 0.5) * 0.4;
    const lngOffset = (Math.random() - 0.5) * 0.4;
    await supabase.from('profiles').update({
      location: `POINT(${baseLng + lngOffset} ${baseLat + latOffset})`,
      group_name: n.groupName
    }).eq('id', authIds[n.id]);
  }

  console.log("Building direct connections and chat history...");
  const connectedNodes = nodes.filter(n => n.isConnected);
  for (const n of connectedNodes) {
    const targetId = authIds[n.id];
    if (!targetId) continue;
    
    const { data: conn } = await supabase.from('connections').insert({
      requester_id: mainUserId,
      addressee_id: targetId,
      status: 'accepted'
    }).select().single();

    if (conn) {
      const typeStr = n.group === 'singles' ? 'Singles' : GROUP_NAMES[n.group as number];
      const pool = Narratives[typeStr] || Narratives["Work"];
      const messagesToInsert = [];
      
      let baseTime = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
      
      const numMsgs = Math.floor(Math.random() * 8) + 3;
      for(let j=0; j < numMsgs; j++) {
        baseTime = new Date(baseTime.getTime() + 1000 * 60 * Math.random() * 60);
        const sender = j % 2 === 0 ? targetId : mainUserId;
        const text = j === 0 ? pool[(n.id * 7 + j) % pool.length] : pool[(n.id * 3 + j) % pool.length];
        messagesToInsert.push({
          connection_id: conn.id,
          sender_id: sender,
          content: text,
          created_at: baseTime.toISOString()
        });
      }
      
      await supabase.from('messages').insert(messagesToInsert);
    }
    process.stdout.write(`.`);
  }

  console.log("\nBuilding mutual connections topology...");
  const groupIds = [0, 1, 2, 3, 4];
  for (const g of groupIds) {
    const mems = connectedNodes.filter(n => n.group === g);
    for (let i = 0; i < mems.length; i++) {
       for (let j = i + 1; j < mems.length; j++) {
           if (Math.random() > 0.65) {
               await supabase.from('connections').insert({
                  requester_id: authIds[mems[i].id],
                  addressee_id: authIds[mems[j].id],
                  status: 'accepted'
               });
           }
       }
    }
  }

  console.log("✅ Database successfully seeded with 198 nodes (168 connected, 30 discoverable)!");
}

seed().catch(console.error);
