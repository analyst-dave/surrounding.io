import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const Narratives: Record<string, string[]> = {
    "Work": [
        "Hey, do you have the Q3 report?", "Yeah, just sent it.", "Did you see the reorg email?", "Sarah resigned, taking the leads with her.", 
        "Can we push the meeting to 3?", "Sure, no problem.", "The new feature is finally stable.", "CEO wants a demo tomorrow.",
        "Are you in the office today?", "Working from home.", "Let's grab coffee later.", "Sounds good!"
    ],
    "Family": [
        "Are we still on for Sunday dinner?", "Yes! Bringing dessert.", "Aunt May's pie is officially toxic.", "Don't tell her that!", 
        "Mark's mansion moat is leaking.", "Again?!", "Thanksgiving is in Tahoe this year.", "Awesome, booking flights now.",
        "Mom found the old albums.", "Oh boy...", "Call me when you're free.", "Will do!"
    ],
    "Church": [
        "Choir practice at 7 PM.", "I'll be there.", "Can you help set up chairs?", "Already on it.", 
        "Pastor wants a meeting.", "I'll check my schedule.", "Community drive this weekend.", "I have some clothes to donate.",
        "Praying for your family.", "Thank you, means a lot.", "Did you get the bulletin?", "Yes, saw it!"
    ],
    "Investors": [
        "Q2 margins are looking thin.", "We're optimizing server costs.", "Series B term sheet is ready.", "Let's review it at 10.", 
        "Growth is up 40% MoM.", "Excellent, keep it up.", "Competitor just launched.", "We have a better UX.",
        "Need the updated cap table.", "Sending it over now.", "Board meeting moved to Friday.", "Noted."
    ],
    "DevTeam": [
        "Prod is down!", "Reverting the last PR.", "Docker container failed.", "Check the logs.", 
        "Who pushed to main?", "Guilty... fixing it.", "API response is too slow.", "Adding Redis cache.",
        "New mockups look sick.", "Thanks, took all night.", "Code review requested.", "Looking now."
    ],
    "Singles": ["Are you free this weekend?", "Yeah, let's grab coffee.", "Did you finish the book?", "Almost done with it.", "Have you seen the new movie?", "Not yet, heard it's good.", "Where do you want to eat?", "I'm down for sushi."]
};

async function updateMessages() {
    console.log("Deleting old mock messages...");
    const { error: delErr } = await supabase.from('messages').delete().neq('id', -1);
    if (delErr) {
        console.error(delErr);
        return;
    }

    console.log("Fetching connections...");
    // Only get direct connections where requester is the main user (like in seed.ts)
    // Wait, the main user is "surround.io.ceo@gmail.com". We don't have it explicitly hardcoded, but we can just add messages to ALL connections.
    const { data: conns } = await supabase.from('connections').select('*');
    if (!conns) return;

    console.log(`Generating realistic histories for ${conns.length} connections...`);
    
    let totalMessages = 0;
    
    // Process sequentially to not overload DB
    for (let i = 0; i < conns.length; i++) {
        const conn = conns[i];
        
        // Random group category to assign narrative
        const groups = ["Work", "Family", "Church", "Investors", "DevTeam", "Singles"];
        const pool = Narratives[groups[i % groups.length]];
        
        const messagesToInsert = [];
        let baseTime = new Date(Date.now() - 1000 * 60 * 60 * 24 * (Math.random() * 14 + 1)); // 1 to 15 days ago
        
        // Generate between 3 and 15 messages for variance in connection strength
        const numMsgs = Math.floor(Math.random() * 13) + 3; 
        
        for(let j = 0; j < numMsgs; j++) {
            // Space messages out realistically over days or hours
            baseTime = new Date(baseTime.getTime() + 1000 * 60 * 60 * Math.random() * 12); 
            
            // Alternate sender
            const sender = j % 2 === 0 ? conn.addressee_id : conn.requester_id;
            const text = pool[j % pool.length];
            
            messagesToInsert.push({
                connection_id: conn.id,
                sender_id: sender,
                content: text,
                created_at: baseTime.toISOString()
            });
        }
        
        await supabase.from('messages').insert(messagesToInsert);
        totalMessages += numMsgs;
    }

    console.log(`✅ Successfully generated ${totalMessages} realistic messages!`);
}

updateMessages().catch(console.error);
