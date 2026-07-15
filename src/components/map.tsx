"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, SVGOverlay, useMap, useMapEvents } from 'react-leaflet';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import * as htmlToImage from 'html-to-image';
import { Layers, Image as ImageIcon, X, Download, Settings, Link as LinkIcon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface MapProps {
    user?: {
        name: string;
        image: string;
    } | null;
    isExpanded?: boolean;
    onBackClick?: () => void;
    onExpandClick?: () => void;
    isDroppingPinMode?: boolean;
    setIsDroppingPinMode?: (val: boolean) => void;
    pins?: any[];
    setPins?: any;
    showPins?: boolean;
    showRadar?: boolean;
    onProfileSelect?: (profile: any) => void;
    onConnect?: (userId: string) => void;
}

// Fix leaflet marker icon resolution issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create a custom emerald blip marker to match branding
const pulseIcon = L.divIcon({
    className: 'custom-pulse-icon',
    html: `<div style="width: 20px; height: 20px; background-color: #10b981; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(16,185,129,0.8);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10], // Adjusted half of the new size
});

// Calculate delay based on angle from center to sync with radar sweep
const getRadarDelay = (targetLat: number, targetLng: number, centerLat: number, centerLng: number) => {
    // Adjust for Mercator projection scale to get accurate visual angle
    const dx = (targetLng - centerLng) * Math.cos(centerLat * Math.PI / 180);
    const dy = targetLat - centerLat;
    // Math.atan2(dx, dy) returns angle from positive y-axis (North), clockwise is positive
    let theta = Math.atan2(dx, dy);
    if (theta < 0) theta += 2 * Math.PI;
    const f = theta / (2 * Math.PI);
    return (f * 5) - 5; // Negative delay to sync immediately with 5s radar cycle
};

const createProfileIcon = (user: { name: string, image: string, type: 'connection' | 'group' | 'none', isOnline?: boolean }, delay: number = 0) => {
    let borderColor = '#9ca3af'; // zinc-400 for 'none'
    let shadowColor = 'rgba(156,163,175,0.5)';
    if (user.type === 'connection') {
        borderColor = '#10b981'; // emerald-500
        shadowColor = 'rgba(16,185,129,1)';
    } else if (user.type === 'group') {
        borderColor = '#3b82f6'; // blue-500
        shadowColor = 'rgba(59,130,246,1)';
    }

    const onlinePulse = user.isOnline ? `
      <div style="position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; border: 2px solid #18181b; box-shadow: 0 0 5px #10b981; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
    ` : '';

    return L.divIcon({
        className: 'custom-profile-icon bg-transparent border-none',
        html: `
            <div class="relative flex flex-col items-center justify-center">
                <span class="absolute -top-10 whitespace-nowrap px-2.5 py-1 rounded-full bg-emerald-500/5 text-emerald-100/50 text-[10px] font-black tracking-widest uppercase animate-name-flash backdrop-blur-sm border border-emerald-400/10 z-50 pointer-events-none" style="animation-delay: ${delay}s;">
                ${(user.name || user.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'UNDEFINED').toUpperCase()}
                </span>
                <img src="${user.image}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid ${borderColor}; box-shadow: 0 0 15px ${shadowColor}; object-fit: cover;" />
                ${onlinePulse}
            </div>
            `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

function UserRadarMarker({ u, position, showRadar, playRadarPing, onProfileSelect, onConnect }: { u: any, position: [number, number], showRadar: boolean, playRadarPing: () => void, onProfileSelect?: (profile: any) => void, onConnect?: (userId: string) => void }) {
    const delay = getRadarDelay(u.lat, u.lng, position[0], position[1]);

    const hasPingedRef = useRef(false);

    // Trigger sound effect synced with radar cycle (approximate)
    useEffect(() => {
        if (!showRadar || hasPingedRef.current) return;
        const syncDelay = delay < 0 ? 5 + delay : delay; // convert -5 to 0 into 0 to 5s timeframe

        const timer = setTimeout(() => {
            if (!hasPingedRef.current) {
                playRadarPing();
                hasPingedRef.current = true;
            }
        }, syncDelay * 1000);

        return () => { clearTimeout(timer); };
    }, [showRadar, delay, playRadarPing]);

    return (
        <Marker position={[u.lat, u.lng]} icon={createProfileIcon({ name: u.name, image: u.image, type: u.type, isOnline: u.isOnline }, delay)}>
            <Popup className="dark-popup">
                <div className="font-sans text-sm font-medium">
                    <button onClick={() => onProfileSelect?.(u)} className="font-bold border-b border-white/10 pb-1 mb-1 hover:text-emerald-400 transition-colors w-full text-left cursor-pointer">{u.name}</button>
                    <div className="text-zinc-300 text-xs">{u.role || 'Proximity Member'}</div>
                    <div className="text-emerald-500 text-[10px] uppercase mt-1 mb-2">{(getDistance(position[0], position[1], u.lat, u.lng)).toFixed(0)}m away</div>
                    {onConnect && (
                        <button onClick={() => onConnect(u.id)} className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/50 rounded py-1 text-[10px] font-bold uppercase transition-colors">
                            Connect
                        </button>
                    )}
                </div>
            </Popup>
        </Marker>
    );
}

function MapResizer({ isExpanded }: { isExpanded: boolean }) {
    const map = useMap();
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            map.invalidateSize();
        });
        const container = map.getContainer();
        if (container) observer.observe(container);
        
        let count = 0;
        const interval = setInterval(() => {
            map.invalidateSize();
            count++;
            if (count > 200) clearInterval(interval);
        }, 20);

        return () => {
            observer.disconnect();
            clearInterval(interval);
        };
    }, [map, isExpanded]);
    return null;
}
function MapLogic({ radius, position }: { radius: number, position: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (!position) return;
        const earthRadius = 6378137;
        const latDiff = (radius / earthRadius) * (180 / Math.PI);
        const lngDiff = (radius / earthRadius) * (180 / Math.PI) / Math.cos(position[0] * Math.PI / 180);
        const bounds = L.latLngBounds(
            [position[0] - latDiff, position[1] - lngDiff],
            [position[0] + latDiff, position[1] + lngDiff]
        );
        try {
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 20 });
        } catch (e) {
            // Ignore error if map container isn't fully initialized yet
        }
    }, [radius, position, map]);
    return null;
}

function PinDropHandler({ isDroppingPinMode, setPendingPin }: { isDroppingPinMode?: boolean, setPendingPin: (loc: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            if (isDroppingPinMode) {
                setPendingPin([e.latlng.lat, e.latlng.lng]);
            }
        }
    });
    return null;
}

const createPinIcon = (message: string) => L.divIcon({
    className: 'custom-pin-icon bg-transparent border-none',
    html: `
      <div class="relative flex flex-col items-center justify-center">
        <div class="w-10 h-10 bg-amber-200 rotate-3 shadow-md border border-amber-300 p-1 flex items-center justify-center overflow-hidden">
            <span class="text-[8px] text-zinc-800 leading-tight font-sans text-center">${message.length > 20 ? message.substring(0, 18) + '...' : message}</span>
        </div>
        <div class="w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm mt-0.5 border border-white"></div>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
});

const createPhotoPinIcon = (score: number, imageUrl: string) => L.divIcon({
    className: 'custom-pin-icon bg-transparent border-none',
    html: `
      <div class="relative flex flex-col items-center justify-center transition-transform hover:scale-110">
        <div class="w-12 h-12 rounded-xl bg-zinc-900 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] p-0.5 flex items-center justify-center overflow-hidden">
            <img src="${imageUrl}" class="w-full h-full object-cover rounded-lg opacity-80" />
            <div class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-lg">
               <span class="text-xs font-black text-white drop-shadow-md">${score}</span>
            </div>
        </div>
        <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm mt-1 border border-white"></div>
      </div>
    `,
    iconSize: [48, 56],
    iconAnchor: [24, 56],
});

// Haversine distance helper (returns meters)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export default function Map({ user, isExpanded, onBackClick, onExpandClick, isDroppingPinMode, setIsDroppingPinMode, pins = [], setPins, showPins = true, showRadar = true, onProfileSelect, onConnect }: MapProps) {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [radius, setRadius] = useState(100);
    const [mapLayer, setMapLayer] = useState<'dark' | 'street' | 'satellite' | 'terrain' | 'light' | 'topo'>('dark');
    const [isGenerating, setIsGenerating] = useState(false);
    const [infographicBox, setInfographicBox] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Synthetic Audio for Radar Ping
    const audioCtxRef = useRef<AudioContext | null>(null);

    const playRadarPing = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            // Marimba sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2); // pitch drop
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); // fast decay

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
        } catch (e) {
            console.warn('Audio play failed', e);
        }
    }, []);

    // Pin Drop State
    const [pendingPin, setPendingPin] = useState<[number, number] | null>(null);
    const [pinMessage, setPinMessage] = useState("");
    const [pinVisibility, setPinVisibility] = useState<'public' | 'connections' | 'private'>('public');

    const supabase = createClient();
    const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!position) return;
        
        const fetchNearby = async () => {
            const { data, error } = await supabase.rpc('find_nearby_users', {
                current_lng: position[1],
                current_lat: position[0],
                radius_meters: radius
            });
            
            if (error) {
                console.error("Error fetching nearby users:", error);
                return;
            }
            
            // Format data to match what the marker component expects
            const formattedUsers = data.map((u: any) => ({
                id: u.id,
                lat: u.lat + (Math.random() - 0.5) * 0.0001, // Add slight jitter if they share same exact lat/lng for display
                lng: u.lng + (Math.random() - 0.5) * 0.0001,
                name: u.username || `User_${u.id.substring(0, 4)}`,
                role: 'User', // We can add role to DB later
                image: u.avatar_url || 'https://i.pravatar.cc/150',
                type: 'connection', // Simplified for now
                isOnline: true,
                distance: u.distance_meters
            }));
            
            setNearbyUsers(formattedUsers);
        };
        
        fetchNearby();
    }, [position, radius]);

    const visibleUsers = useMemo(() => {
        if (!position) return [];
        return nearbyUsers.filter(u => getDistance(position[0], position[1], u.lat, u.lng) <= radius);
    }, [nearbyUsers, position, radius]);

    const mapRef = useRef<HTMLDivElement>(null);

    const LAYERS: Record<string, string> = {
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        street: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        topo: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    };

    const handleGenerateInfographic = async () => {
        if (!mapRef.current) return;
        setIsGenerating(true);
        try {
            // Apply a temporary CSS filter to make it look "infographic" style
            const originalFilter = mapRef.current.style.filter;
            mapRef.current.style.filter = "saturate(1.5) contrast(1.1) hue-rotate(-5deg) drop-shadow(0 0 10px rgba(16,185,129,0.2))";

            // Wait for map to settle
            await new Promise(res => setTimeout(res, 800));

            const dataUrl = await htmlToImage.toPng(mapRef.current, {
                quality: 0.95,
                pixelRatio: 2,
                cacheBust: true,
            });

            mapRef.current.style.filter = originalFilter;
            setInfographicBox(dataUrl);
        } catch (error) {
            console.error('Failed to generate infographic snapshot:', error);
            // Fallback mock image if CORS fails on external tiles
            setInfographicBox(`https://placehold.co/600x800/10b981/000000?text=Map+Snapshot+Captured`);
        }
        setIsGenerating(false);
    };

    useEffect(() => {
        // Get user location using browser API
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                    setPosition(newPos);
                    
                    // Trigger Teleport API to move dummy nodes near this new location exactly once
                    if (user && !localStorage.getItem('dummy_relocated_v4')) {
                        fetch('/api/teleport', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lat: newPos[0], lng: newPos[1] })
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                console.log('Dummy nodes relocated to your area.');
                                localStorage.setItem('dummy_relocated_v4', 'true');
                                // Force a slight jitter to trigger radar updates
                                setPosition([newPos[0] + 0.0001, newPos[1] + 0.0001]);
                            }
                        })
                        .catch(err => console.error('Teleport failed:', err));
                    }
                },
                (err) => {
                    setPosition([38.5816, -121.4944]);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            setPosition([38.5816, -121.4944]);
        }
    }, [user]);

    if (!position) {
        return (
            <div className="w-full h-full flex items-center justify-center text-zinc-400 bg-background/50 rounded-3xl animate-pulse">
                <span className="flex items-center gap-2">
                    <span className="h-3 w-3 bg-emerald-500 rounded-full animate-ping"></span>
                    Acquiring Satellite Lock...
                </span>
            </div>
        );
    }

    const earthRadius = 6378137;
    const latDiff = (radius / earthRadius) * (180 / Math.PI);
    const lngDiff = (radius / earthRadius) * (180 / Math.PI) / Math.cos(position[0] * Math.PI / 180);
    const bounds: [number, number][] = [
        [position[0] - latDiff, position[1] - lngDiff],
        [position[0] + latDiff, position[1] + lngDiff]
    ];

    return (
        <div ref={mapRef} className={`w-full h-full rounded-[2rem] overflow-hidden relative shadow-inner bg-black ${isDroppingPinMode ? 'pin-drop-mode' : ''}`}>
            <MapContainer
                center={position}
                zoom={17}
                maxZoom={20}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
            >
                <MapLogic radius={radius} position={position} />
                <MapResizer isExpanded={isExpanded} />
                {/* Dynamically swapped map tiles */}
                <TileLayer
                    url={LAYERS[mapLayer]}
                    maxZoom={20}
                    crossOrigin="anonymous"
                />
                {/* Radar Radius SVG Overlay Animation */}
                {showRadar && (
                    <>
                        <Circle
                            center={position}
                            radius={radius}
                            pathOptions={{ color: '#10b981', fillColor: 'transparent', fillOpacity: 0, weight: 1.5 }}
                        />
                        <SVGOverlay key={`radar-${radius}`} bounds={bounds as import('leaflet').LatLngBoundsExpression}>
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <foreignObject x="0" y="0" width="100" height="100">
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'conic-gradient(from 0deg, rgba(52,211,153,0) 0%, rgba(52,211,153,0.05) 50%, rgba(52,211,153,0.15) 95%, rgba(52,211,153,0.5) 100%)' }} className="animate-radar-spin" />
                                </foreignObject>
                            </svg>
                        </SVGOverlay>
                    </>
                )}

                {/* Nearby Users (Filtered by Radius) */}
                {showRadar && visibleUsers.map(u => (
                    <UserRadarMarker 
                        key={u.id} 
                        u={u} 
                        position={position as [number, number]} 
                        showRadar={showRadar} 
                        playRadarPing={playRadarPing} 
                        onProfileSelect={onProfileSelect}
                        onConnect={onConnect}
                    />
                ))}



                {/* Pin Drop Handlers and Rendering */}
                <PinDropHandler isDroppingPinMode={isDroppingPinMode} setPendingPin={setPendingPin} />
                {showPins && pins.map(pin => (
                    <Marker 
                        key={pin.id} 
                        position={[pin.lat, pin.lng]} 
                        icon={pin.type === 'photo' ? createPhotoPinIcon(pin.passScore || 0, pin.imageUrl || '') : createPinIcon(pin.message)}
                    >
                        <Popup className={pin.type === 'photo' ? "dark-popup min-w-[200px] !p-0 overflow-hidden bg-black/80 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "dark-popup"}>
                            {pin.type === 'photo' ? (
                                <div className="flex flex-col w-full">
                                    <div className="h-28 w-full relative">
                                        <img src={pin.imageUrl} className="w-full h-full object-cover opacity-80" />
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                                            {pin.passScore} pts
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {pin.passTags?.map((tag: any, i: number) => (
                                                <span key={i} className="text-[8px] uppercase tracking-wider font-bold bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">
                                                    {tag.tag_text}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 italic leading-tight">{pin.message}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="font-sans text-sm font-medium p-3">
                                    {pin.message}
                                    <div className="text-[10px] text-zinc-500 mt-1 uppercase">Visibility: {pin.visibility}</div>
                                </div>
                            )}
                        </Popup>
                    </Marker>
                ))}

                {/* Nearby Users (Filtered by Radius) */}
                {showRadar && visibleUsers.map(u => (
                    <UserRadarMarker key={u.id} u={u} position={position as [number, number]} showRadar={showRadar} playRadarPing={playRadarPing} onProfileSelect={onProfileSelect} />
                ))}

                {/* Main User Marker */}
                <Marker position={position} icon={user ? createProfileIcon({ ...user, type: 'connection', image: user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150' }, 0) : pulseIcon}>
                    <Popup className="dark-popup">
                        <div className="font-sans text-sm font-medium">
                            {user ? `Broadcasting as ${user.user_metadata?.full_name || user.user_metadata?.name || user.email}` : `You are currently broadcasting at T1 (Hidden).`}
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>

            {/* Responsive Map UI Overlay */}
            <div className="absolute inset-0 z-[400] flex flex-col justify-between p-4 pointer-events-none">

                {/* Top Row: Back, Layers, Expand */}
                <div className="flex justify-between items-start gap-2 w-full">
                    {/* Left: Back */}
                    <div className="pointer-events-auto shrink-0 w-[46px]">
                        {onBackClick && (
                            <button onClick={onBackClick} className="bg-background/40 backdrop-blur-sm w-[46px] h-[46px] rounded-full border border-[var(--glass-border)] shadow-lg text-foreground hover:bg-background/80 transition-colors flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Center: Layers */}
                    {isExpanded && (
                        <div className="pointer-events-auto flex-1 flex justify-center min-w-0">
                            <div className="glass-card !p-1 !rounded-2xl flex gap-1 backdrop-blur-sm bg-black/20 overflow-x-auto no-scrollbar max-w-full">
                                <button onClick={() => setMapLayer('dark')} className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${mapLayer === 'dark' ? 'bg-emerald-500 text-black' : 'text-zinc-300 hover:bg-white/10'}`}>Dark</button>
                                <button onClick={() => setMapLayer('street')} className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${mapLayer === 'street' ? 'bg-emerald-500 text-black' : 'text-zinc-300 hover:bg-white/10'}`}>Street</button>
                                <button onClick={() => setMapLayer('satellite')} className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${mapLayer === 'satellite' ? 'bg-emerald-500 text-black' : 'text-zinc-300 hover:bg-white/10'}`}>Sat</button>
                                <button onClick={() => setMapLayer('terrain')} className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${mapLayer === 'terrain' ? 'bg-emerald-500 text-black' : 'text-zinc-300 hover:bg-white/10'}`}>Terrain</button>
                                <button onClick={() => setMapLayer('topo')} className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${mapLayer === 'topo' ? 'bg-emerald-500 text-black' : 'text-zinc-300 hover:bg-white/10'}`}>Topo</button>
                            </div>
                        </div>
                    )}

                    {/* Right: Expand/Collapse */}
                    <div className="pointer-events-auto shrink-0 w-[80px] flex justify-end">
                        {onExpandClick && (
                            <button onClick={onExpandClick} className="bg-emerald-500/50 backdrop-blur-sm px-3 h-[32px] rounded-full border border-[var(--glass-border)] shadow-[0_0_15px_rgba(16,185,129,0.4)] text-background font-bold text-xs hover:bg-emerald-400/80 transition-colors whitespace-nowrap mt-1.5">
                                {isExpanded ? 'Collapse' : 'Expand'}
                            </button>
                        )}
                    </div>
                </div>


                {/* Pin Drop Toast */}
                {isDroppingPinMode && !pendingPin && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none animate-in fade-in slide-in-from-top-4">
                        <div className="bg-emerald-500 text-black px-4 py-2 rounded-full font-bold text-xs shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                            Tap anywhere on map to drop pin
                            <button onClick={() => setIsDroppingPinMode?.(false)} className="ml-2 hover:bg-black/20 rounded-full p-1 pointer-events-auto">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Row: Radar Status, Radius Controls, Settings */}
                <div className="flex justify-between items-end gap-2 w-full">
                    {/* Left: Radar Status */}
                    <div className="pointer-events-auto shrink-0">
                        <div className="glass-card !p-3 !rounded-2xl flex flex-col min-w-[130px] backdrop-blur-sm bg-black/20 border-[var(--glass-border)] shadow-lg transition-colors">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${showRadar ? 'bg-emerald-500 animate-radar-dot' : 'bg-red-500'}`}></span>
                                Radar {showRadar ? 'Active' : 'Offline'}
                            </span>
                            {showRadar ? (
                                <span className="text-emerald-400 font-mono text-xs mt-0.5 whitespace-nowrap">Scanning {radius} meters</span>
                            ) : (
                                <span className="text-red-400/80 font-mono text-xs mt-0.5 whitespace-nowrap">Scanning stopped</span>
                            )}
                        </div>
                    </div>

                    {/* Center: Radius */}
                    {isExpanded && (
                        <div className="pointer-events-auto flex-1 flex justify-center min-w-0">
                            <div className="glass-card !p-0 !rounded-2xl flex overflow-hidden backdrop-blur-sm bg-black/20 border border-[var(--glass-border)] shadow-[0_0_15px_rgba(0,0,0,0.5)] divide-x divide-white/10 h-[46px] w-full max-w-[160px] shrink-0">
                                <button onClick={() => setRadius(Math.max(50, radius / 2))} className="flex-1 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all font-mono text-zinc-300 text-lg font-light">-</button>
                                <div className="flex items-center justify-center bg-transparent font-mono text-emerald-400 text-[10px] font-bold text-center px-1 w-[80px]">
                                    {(radius / 1609.344) < 0.1 ? `${(radius * 3.28084).toFixed(0)} ft` : `${(radius / 1609.344).toFixed(2)} miles`}
                                </div>
                                <button onClick={() => setRadius(Math.min(24000, radius * 2))} className="flex-1 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all font-mono text-emerald-400 text-lg font-light">+</button>
                            </div>
                        </div>
                    )}

                    {/* Right: Settings */}
                    <div className="pointer-events-auto shrink-0 w-[46px] flex justify-end relative">
                        {isExpanded && (
                            <>
                                <div className={`absolute bottom-full right-0 mb-4 w-56 glass-card p-2 rounded-2xl border border-[var(--glass-border)] shadow-2xl transition-all duration-300 origin-bottom-right flex flex-col gap-1 ${isSettingsOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
                                    <button onClick={() => { setIsSettingsOpen(false); handleGenerateInfographic(); }} className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-colors text-sm font-medium text-left">
                                        {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <ImageIcon className="w-4 h-4 text-emerald-400" />}
                                        Map Snapshot
                                    </button>
                                    <button onClick={() => setIsSettingsOpen(false)} className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-colors text-sm font-medium text-left">
                                        <LinkIcon className="w-4 h-4 text-emerald-400" />
                                        Bind Account
                                    </button>
                                </div>
                                <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="btn-touch glass-card !p-3 flex items-center justify-center text-foreground w-[46px] h-[46px] shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-sm bg-black/20 hover:bg-black/40">
                                    <Settings className="w-5 h-5 text-emerald-400" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Pin Drop Modal */}
            {pendingPin && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
                    <div className="glass-card w-80 p-5 rounded-2xl flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-widest text-center">Leave a Footprint</h3>
                        <textarea
                            value={pinMessage}
                            onChange={e => setPinMessage(e.target.value)}
                            placeholder="Write a message here..."
                            className="bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white resize-none h-24 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-500"
                        />
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Visibility Scope</label>
                            <select
                                value={pinVisibility}
                                onChange={e => setPinVisibility(e.target.value as any)}
                                className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            >
                                <option value="public">Public (Everyone)</option>
                                <option value="connections">Connections Only</option>
                                <option value="private">Private (Only Me)</option>
                            </select>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setPendingPin(null); setIsDroppingPinMode?.(false); setPinMessage(""); }}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-colors text-sm font-medium border border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (pinMessage.trim() && setPins) {
                                        setPins([...pins, { id: Date.now().toString(), lat: pendingPin[0], lng: pendingPin[1], message: pinMessage, visibility: pinVisibility }]);
                                        setPendingPin(null);
                                        setIsDroppingPinMode?.(false);
                                        setPinMessage("");
                                    }
                                }}
                                disabled={!pinMessage.trim()}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black p-3 rounded-xl transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                            >
                                Drop Pin
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Infographic Modal */}
            {infographicBox && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 pointer-events-auto animate-in fade-in zoom-in duration-300">
                    <div className="glass-card w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl border border-emerald-500/30 flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/50">
                            <h3 className="text-emerald-400 font-bold tracking-widest text-sm uppercase">Infographic Snapshot</h3>
                            <button onClick={() => setInfographicBox(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 bg-zinc-900 flex justify-center items-center">
                            <div className="w-full rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)] border border-white/10 relative bg-black">
                                <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/50 text-emerald-400 text-[10px] font-mono tracking-widest uppercase shadow-lg">
                                    surrounding.io • {new Date().toLocaleDateString()}
                                </div>
                                <img src={infographicBox} alt="Infographic" className="w-full h-auto object-cover" />
                            </div>
                        </div>
                        <div className="p-4 flex bg-black/50">
                            <button
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = infographicBox;
                                    a.download = 'surrounding-infographic.png';
                                    a.click();
                                    setInfographicBox(null);
                                }}
                                className="w-full btn-touch bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center justify-center gap-2 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                            >
                                <Download className="w-5 h-5" /> Download High-Res
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
