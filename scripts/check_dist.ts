import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function run() {
    const { data: profiles, error } = await supabase.from('profiles').select('id, last_location_lat, last_location_lng, location').limit(5);
    if (error) { console.error('select error:', error); return; }
    
    const lat = 38.5816;
    const lng = -121.4944;

    for (const p of profiles) {
        const d = getDistance(lat, lng, p.last_location_lat, p.last_location_lng);
        console.log(`Profile ${p.id}: Dist = ${d}m, Lat = ${p.last_location_lat}, Lng = ${p.last_location_lng}`);
    }
}
run();
