import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Missing environment variables" }, { status: 500 });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { lat, lng } = await req.json();
        
        const { data: profiles, error } = await supabase.from('profiles').select('id');
        if (error) throw error;
        
        for (const profile of profiles) {
            // Randomize within ~5000 meters (0.045 degrees)
            const newLat = lat + (Math.random() * 0.09 - 0.045);
            const newLng = lng + (Math.random() * 0.09 - 0.045);
            
            await supabase.from('profiles')
                .update({ 
                    location: `POINT(${newLng} ${newLat})`
                })
                .eq('id', profile.id);
        }
        
        return NextResponse.json({ success: true, count: profiles.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
