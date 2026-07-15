"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Github, Twitter, Chrome, Linkedin, UserCircle2, Facebook, MapPinned, Send, MessageSquare, User, X, Share2, Slack, Gamepad2, Music } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Dynamically import Map with no SSR because leaflet requires the window object
const MapView = dynamic(() => import("@/components/map"), { ssr: false });


const BeaconO = () => (
  <span className="relative inline-flex items-center justify-center w-[0.7em] h-[0.7em] mx-[0.02em] translate-y-[0.05em]">
    <span className="absolute w-[180%] h-[180%] rounded-full border border-emerald-300/30"></span>
    <span className="absolute w-[130%] h-[130%] rounded-full border border-emerald-400/60"></span>
    <span className="absolute inset-0 m-auto w-[80%] h-[80%] rounded-full border-[0.1em] border-emerald-500"></span>
    <span className="absolute inset-0 m-auto w-[35%] h-[35%] bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,1)] dark:shadow-[0_0_8px_rgba(16,185,129,1)] shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
  </span>
);

export type Pin = {
  id: string;
  lat: number;
  lng: number;
  message: string;
  visibility: 'public' | 'connections' | 'private';
  type?: 'text' | 'photo';
  passScore?: number;
  passTags?: any[];
  imageUrl?: string;
};

export default function Home() {
  const { resolvedTheme } = useTheme();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConnections, setShowConnections] = useState(false);

  // Synchronize theme with the D3.js iframe
  useEffect(() => {
    const iframe = document.getElementById("connections-iframe") as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow && (iframe.contentWindow as any).App) {
      const app = (iframe.contentWindow as any).App;
      const isLight = resolvedTheme === "light";
      if (app.Config && app.Config.light !== isLight) {
        app.ui.theme();
      }
    }
  }, [resolvedTheme]);

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    if (iframe.contentWindow && (iframe.contentWindow as any).App) {
      const app = (iframe.contentWindow as any).App;
      const isLight = resolvedTheme === "light";
      if (app.Config && app.Config.light !== isLight) {
        app.ui.theme();
      }
    }
  };

  // Pin state
  const [pins, setPins] = useState<Pin[]>([]);
  const [showPins, setShowPins] = useState(false);
  const [isDroppingPinMode, setIsDroppingPinMode] = useState(false);

  const [showRadar, setShowRadar] = useState(true);

  // Auth simulation state
  const supabase = createClient();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('test@surrounding.io');
  const [password, setPassword] = useState('password123');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const [connections, setConnections] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!user) return;

    const fetchChatData = async () => {
      // In a real app we'd paginate, but for now we fetch all accepted connections
      const { data: conns, error } = await supabase
        .from('connections')
        .select(`
          id,
          requester_id,
          addressee_id,
          requester:profiles!connections_requester_id_fkey(id, username, avatar_url),
          addressee:profiles!connections_addressee_id_fkey(id, username, avatar_url),
          messages(id, content, created_at, sender_id)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching connections:", error);
        return;
      }

      const formattedConnections = [];
      const messagesMap: Record<string, any[]> = {};

      for (const conn of conns) {
        // Determine the "other" user in the connection
        const otherUser = conn.requester_id === user.id ? conn.addressee : conn.requester;
        
        // Ensure messages are an array (it might be an object if 1 message or empty)
        const msgs = Array.isArray(conn.messages) ? conn.messages : (conn.messages ? [conn.messages] : []);
        
        // Sort messages chronologically for the chat view
        msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const mappedMsgs = msgs.map((m: any) => ({
          sender: m.sender_id === user.id ? 'me' : 'them',
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        messagesMap[conn.id.toString()] = mappedMsgs;

        const latestDateMillis = msgs.length > 0 ? new Date(msgs[msgs.length - 1].created_at).getTime() : 0;
        const d = new Date(latestDateMillis);
        d.setHours(0, 0, 0, 0);
        const latestDateDay = d.getTime();
        
        formattedConnections.push({
          id: conn.id.toString(),
          name: otherUser.username,
          image: otherUser.avatar_url || 'https://i.pravatar.cc/150',
          latestMessageDate: latestDateDay,
          messageCount: msgs.length,
          unread: 0 // Mock for now
        });
      }

      // Sort by Message Count DESC (depth of bond), then Recency DESC
      formattedConnections.sort((a, b) => {
        if (b.messageCount !== a.messageCount) {
           return b.messageCount - a.messageCount;
        }
        return b.latestMessageDate - a.latestMessageDate;
      });

      setConnections(formattedConnections);
      setAllMessages(messagesMap);
      if (formattedConnections.length > 0) setActiveChat(formattedConnections[0]);
    };

    fetchChatData();
  }, [user]);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
       chatContainerRef.current.scrollTo({
         top: chatContainerRef.current.scrollHeight,
         behavior: 'smooth'
       });
    }
  };

  useEffect(() => {
    if (activeChat && showChat) {
      setTimeout(scrollToBottom, 100);
    }
  }, [activeChat, allMessages, showChat]);

  // Auto-expand map if untouched for 3s
  useEffect(() => {
    if (showMap && !isExpanded && !showChat && !showPins && !showConnections) {
      const t = setTimeout(() => setIsExpanded(true), 6000);
      return () => clearTimeout(t);
    }
  }, [showMap, isExpanded, showChat, showPins, showConnections]);

  // Profile Overlay State
  const [showProfile, setShowProfile] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null); // Passed from the map

  // PASS System State
  const [isUploadingPass, setIsUploadingPass] = useState(false);
  const [passResult, setPassResult] = useState<any>(null);
  const [showTagsExplosion, setShowTagsExplosion] = useState(false);

  const handlePassUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPass(true);
    setPassResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/pass', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      // Artificial delay for the scanning animation effect
      setTimeout(() => {
        setIsUploadingPass(false);
        setPassResult(data);
        setShowTagsExplosion(true);
        setTimeout(() => setShowTagsExplosion(false), 4000); // 4 second explosion
      }, 2500);

    } catch (error) {
      console.error('PASS Upload failed', error);
      setIsUploadingPass(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAllMessages(prev => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), { sender: 'me', text: chatInput, time: newTime }]
    }));
    setChatInput('');
    setIsTyping(true);

    // Simulate fake reply
    setTimeout(() => {
      setIsTyping(false);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAllMessages(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), { sender: 'them', text: 'Got it. Let me know if you want to link up!', time: replyTime }]
      }));
    }, 2500);
  };

  const handleBackClick = () => {
    setIsDiscovering(false);
    setIsExpanded(false);
    setShowMap(false);
    setShowChat(false);
    setShowConnections(false);
    setShowPins(false);
    setIsDroppingPinMode(false);
  };

  const handleDiscoverClick = () => {
    setIsDiscovering(true);
    // Wait for the upward expansion animation to complete before rendering the map payload
    setTimeout(() => {
      setShowMap(true);
    }, 400);
  };

  const handleExpandClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLeaveFootprint = () => {
    setIsDiscovering(true);
    setIsExpanded(true);
    setIsDroppingPinMode(true);
    if (!showMap) {
      setTimeout(() => {
        setShowMap(true);
      }, 400);
    }
  };

  const handleConnectRequest = async (targetUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from('connections').insert({
      requester_id: user.id,
      addressee_id: targetUserId,
      status: 'pending'
    });
    if (!error) {
      alert("Connection request sent successfully!");
    } else {
      console.error(error);
      alert("Failed to send request. You may have already sent one.");
    }
  };

  const handleOAuthLogin = async (provider: any) => {
    setIsLoggingIn(true);
    await supabase.auth.signInWithOAuth({ provider });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      setIsLoginOpen(false);
    }
    setIsLoggingIn(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsLoginOpen(false);
  };

  return (
    <div className={`h-[100dvh] w-full flex flex-col items-center justify-center px-6 pt-6 pb-24 overflow-hidden relative transition-all duration-2000`}>

      {/* Top Right Controls (Theme & Login) */}
      <div className={`absolute top-6 right-6 z-50 flex items-center gap-2 transition-all duration-2000 origin-top-right ${isExpanded ? 'scale-75 -translate-y-2' : 'scale-100 translate-y-0'}`}>

        <div className="relative w-[46px] h-[46px]">
          <ThemeToggle />
        </div>

        {/* Login Dropdown Wrapper */}
        <div className="relative">
          <button
            onClick={() => setIsLoginOpen(!isLoginOpen)}
            className="btn-touch glass-card flex items-center justify-center text-foreground w-[46px] h-[46px] !p-0 !min-h-0 overflow-hidden"
          >
            {user ? (
              <img src={user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150'} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-5 h-5" />
            )}
          </button>

          {/* Social Login Popup Modal */}
          <div className={`absolute top-12 right-0 w-64 glass-card p-4 rounded-2xl border border-[var(--glass-border)] shadow-2xl transition-all duration-500 origin-top-right
            ${isLoginOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}
          >
            <div className="flex flex-col space-y-3">
              <h3 className="text-sm font-bold text-center mb-1">{user ? 'Signed In' : 'Authenticate'}</h3>

              {!user ? (
                <div className="space-y-4">
                  <form onSubmit={handleEmailLogin} className="flex flex-col gap-2 border-b border-white/10 pb-4">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                    <button type="submit" disabled={isLoggingIn} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold p-2.5 rounded-xl transition-colors text-sm shadow-sm flex items-center justify-center">
                      {isLoggingIn ? <span className="animate-spin w-4 h-4 rounded-full border-2 border-black/20 border-t-black"></span> : 'Test Sign In'}
                    </button>
                  </form>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleOAuthLogin('google')} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-white/5"><Chrome className="w-3 h-3 text-blue-400" /> Google</button>
                    <button onClick={() => handleOAuthLogin('facebook')} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-white/5"><Facebook className="w-3 h-3 text-blue-500" /> Facebook</button>
                    <button onClick={() => handleOAuthLogin('linkedin')} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-white/5"><Linkedin className="w-3 h-3 text-sky-500" /> LinkedIn</button>
                    <button onClick={() => handleOAuthLogin('github')} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-white/5"><Github className="w-3 h-3" /> GitHub</button>
                    <button onClick={() => handleOAuthLogin('twitter')} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-white/5"><Twitter className="w-3 h-3 text-sky-400" /> Twitter</button>
                    <button onClick={() => handleOAuthLogin('slack')} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-white/5"><Slack className="w-3 h-3 text-purple-400" /> Slack</button>
                    <button onClick={() => handleOAuthLogin('discord')} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-white/5"><Gamepad2 className="w-3 h-3 text-indigo-400" /> Discord</button>
                    <button onClick={() => handleOAuthLogin('tiktok')} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-white/5"><Music className="w-3 h-3 text-pink-400" /> TikTok</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2.5 rounded-xl transition-colors text-sm font-medium border border-red-500/20"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <header className={`flex flex-col items-center transition-all duration-2000 z-10 shrink-0 ${isDiscovering ? (isExpanded ? 'scale-50 opacity-100 mb-0 -mt-2' : 'scale-75 opacity-100 mb-2 mt-0') : 'scale-100 opacity-100 mb-8 mt-0'}`}>
        <button onClick={handleBackClick} className="cursor-pointer hover:opacity-80 transition-opacity">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground flex items-center drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] select-none">
            surr<BeaconO />unding.i<BeaconO />
          </h1>
        </button>
        <p className={`text-zinc-400 text-lg max-w-sm mx-auto transition-all duration-1000 overflow-hidden ${isDiscovering ? 'h-0 opacity-0 mt-0' : 'h-[60px] opacity-100 mt-4'}`}>
          Connections within your immediate reach.
        </p>
      </header>


      {/* Main Container */}
      <div className={`w-full flex flex-col items-center justify-center relative transition-all duration-2000 shrink-0 ${isExpanded ? 'max-w-[100vw] px-4' : 'max-w-md px-0'} ${isDiscovering ? 'mt-0 mb-0' : 'mt-20'}`}>

        {/* Expanding Map Area */}
        <div 
          className={`w-full flex justify-center items-center transition-all duration-2000 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-20 ${isDiscovering ? (isExpanded ? 'h-[calc(100dvh-150px)] mb-0' : 'h-[50dvh] min-h-[400px] mb-6') : 'h-[56px] min-h-[56px] mb-6'}`}
        >
          {!showMap ? (
            <button
              onClick={handleDiscoverClick}
              className={`btn-touch w-full flex items-center justify-center bg-emerald-500 text-background font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-2000
              ${isDiscovering ? 'h-full rounded-[2rem] bg-black border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]' : 'h-[56px] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95'}`}
            >
              <span className={`transition-all duration-1000 ${isDiscovering ? 'opacity-0 scale-90 tracking-widest translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                Discover
              </span>
            </button>
          ) : (
            <div className="absolute inset-0 w-full h-full border-none rounded-[2rem] overflow-hidden bg-black shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-1000">
              {/* Click Interceptor for Collapsed Map */}
              {!isExpanded && (
                <div
                  className="absolute inset-0 z-[1000] cursor-pointer"
                  onClick={handleExpandClick}
                />
              )}
              {showConnections ? (
                <div className="w-full h-full relative">
                  <iframe
                    id="connections-iframe"
                    src="/connections.html"
                    className="w-full h-full border-0"
                    title="Connections Map"
                    onLoad={handleIframeLoad}
                  />
                </div>
              ) : (
                <>
                  {showMap && (
                    <div className="absolute inset-0 transition-opacity duration-1000 animate-in fade-in z-0 p-4 pt-16 h-full">
                      <MapView 
                        isExpanded={isExpanded}
                        user={user}
                        onBackClick={handleBackClick}
                        onExpandClick={handleExpandClick}
                        isDroppingPinMode={isDroppingPinMode}
                        setIsDroppingPinMode={setIsDroppingPinMode}
                        showRadar={showRadar}
                        onConnect={handleConnectRequest}
                        onProfileSelect={(p) => {
                          setSelectedProfile(p);
                          setShowProfile(true);
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* PASS Scanning Overlay */}
              {isUploadingPass && (
                <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                  <div className="relative w-32 h-32 mb-8">
                     <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/30"></div>
                     <div className="absolute inset-0 rounded-full border-[3px] border-emerald-400 border-t-transparent animate-spin"></div>
                     <div className="absolute inset-0 m-auto w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-400 tracking-widest uppercase animate-pulse">PASS Engine</h2>
                  <p className="text-zinc-400 text-sm mt-4 text-center">Analyzing object density and composition...</p>
                </div>
              )}

              {/* PASS Floating Tags Animation */}
              {showTagsExplosion && passResult && (
                <div className="absolute inset-0 z-[2000] pointer-events-none overflow-hidden">
                  {passResult.tags?.map((t: any, i: number) => {
                    const randomX = Math.floor(Math.random() * 80) + 10;
                    const randomY = Math.floor(Math.random() * 80) + 10;
                    const randomDelay = Math.random() * 0.5;
                    const randomScale = 0.8 + Math.random() * 1.5;
                    return (
                      <div 
                        key={`float-${i}`} 
                        className="absolute text-emerald-400 font-black tracking-widest uppercase drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-in fade-in zoom-in slide-out-to-top-full duration-[3000ms] fill-mode-forwards"
                        style={{ 
                          left: `${randomX}%`, 
                          top: `${randomY}%`, 
                          animationDelay: `${randomDelay}s`,
                          transform: `scale(${randomScale})`
                        }}
                      >
                        {t.tag_text}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* PASS Result Modal */}
              {passResult && (
                <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-500">
                  <div className="bg-zinc-900 border border-emerald-500/50 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                    <button onClick={() => setPassResult(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                    
                    <span className="text-xs uppercase tracking-widest text-emerald-500 font-bold mb-2">Final Score</span>
                    <div className="text-6xl font-black text-white mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                      {passResult.total_points_earned}<span className="text-2xl text-emerald-500/50">/100</span>
                    </div>

                    <div className="w-full flex justify-between px-4 py-3 bg-black/40 rounded-xl border border-white/5 mb-6 shadow-inner">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Base Pts</span>
                        <span className="text-sm font-black text-zinc-300">+{passResult.analysis_breakdown?.raw_points || 45}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Multiplier</span>
                        <span className="text-sm font-black text-zinc-300">x{passResult.analysis_breakdown?.rarity_multiplier || 1.25}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Tags</span>
                        <span className="text-sm font-black text-emerald-400">{passResult.analysis_breakdown?.tags_detected || 4}</span>
                      </div>
                    </div>

                    <div className="w-full flex flex-wrap gap-2 justify-center mb-6">
                      {passResult.tags?.map((t: any, i: number) => (
                        <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold border ${t.is_high_value ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-zinc-300 border-white/10'}`}>
                          {t.tag_text} <span className="opacity-50 ml-1">{t.weight}x</span>
                        </span>
                      ))}
                    </div>

                    <div className="w-full bg-black/50 rounded-xl p-4 border border-white/5">
                      <p className="text-xs text-zinc-300 italic">{passResult.pro_tip}</p>
                    </div>

                    <button onClick={() => {
                      const newPin: Pin = {
                        id: Date.now().toString(),
                        lat: 34.0522 + (Math.random() - 0.5) * 0.01,
                        lng: -118.2437 + (Math.random() - 0.5) * 0.01,
                        message: passResult.pro_tip || "Dropped a new Photo Pin!",
                        visibility: 'public',
                        type: 'photo',
                        passScore: passResult.total_points_earned,
                        passTags: passResult.tags,
                        imageUrl: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=300&h=300&fit=crop"
                      };
                      setPins((prev: Pin[]) => [...prev, newPin]);
                      setPassResult(null);
                      setShowPins(false);
                    }} className="mt-6 w-full py-3 bg-emerald-500 text-black font-bold rounded-xl btn-touch">
                      Drop Photo Pin
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Overlay */}
                  <div className={`absolute inset-0 w-full h-full bg-zinc-100/90 dark:bg-zinc-950/90 backdrop-blur-xl border-zinc-500/30 rounded-[2rem] z-[600] flex flex-col min-h-0 overflow-hidden shadow-inner transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showChat ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                  
                  {/* Horizontal Connections List */}
                  <div className="flex overflow-x-auto p-4 gap-4 no-scrollbar border-b border-black/10 dark:border-white/10 shrink-0 bg-black/5 dark:bg-black/40 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }} onWheel={(e) => { if (e.currentTarget) e.currentTarget.scrollLeft += e.deltaY; }}>
                    {connections.map((conn) => (
                      <button
                        key={conn.id}
                        onClick={() => setActiveChat(conn)}
                        className={`flex flex-col items-center gap-2 shrink-0 transition-all duration-300 ${activeChat?.id === conn.id ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`}
                      >
                        <div className="relative">
                          <img src={conn.image} alt={conn.name} className={`rounded-full object-cover border-2 transition-all ${activeChat?.id === conn.id ? 'w-20 h-20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'w-14 h-14 border-transparent'}`} />
                          {conn.unread > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black border border-black shadow-sm">
                              {conn.unread}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium truncate w-14 text-center text-zinc-300">{conn.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Chat Detail View */}
                  {activeChat ? (
                    <>
                      <div className="flex justify-between items-center bg-black/5 dark:bg-black/40 px-4 py-3 shrink-0 border-b border-black/10 dark:border-white/10">
                        <div className="flex flex-col">
                           <h3 className="font-bold text-foreground text-sm">{activeChat.name}</h3>
                           <span className="text-[10px] text-emerald-500 font-medium tracking-wide">Connected</span>
                        </div>
                        <button onClick={() => setShowChat(false)} className="btn-touch p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                          <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </button>
                      </div>
                      
                      <div ref={chatContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4 no-scrollbar bg-black/5 dark:bg-black/20 min-h-0">
                        {(allMessages[activeChat.id] || []).map((msg, i) => (
                          <div key={i} className={`flex w-full flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-md ${msg.sender === 'me' ? 'bg-emerald-500 text-black font-medium rounded-tr-sm' : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 rounded-tl-sm'}`}>
                              {msg.text}
                            </div>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-1 mx-1 font-medium tracking-wide uppercase opacity-70">{msg.time}</span>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="flex w-full justify-start animate-in fade-in">
                            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white dark:bg-zinc-800 text-zinc-500 text-xs italic border border-black/5 dark:border-white/5 rounded-tl-sm flex items-center gap-1.5 h-[44px]">
                              <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        )}
                        {/* Auto-scroll anchor removed, using container scrollTop instead */}
                      </div>
                      
                      <div className="relative">
                        <button onClick={scrollToBottom} className="absolute -top-10 right-4 btn-touch bg-zinc-100 dark:bg-zinc-800/80 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-full p-2 text-foreground shadow-lg z-10 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                      </div>

                      <form onSubmit={handleSendMessage} className="p-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/40 flex gap-2 shrink-0 relative z-20">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Message..." className="flex-1 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full px-4 py-2 text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-500 shadow-inner" />
                        <button type="submit" disabled={!chatInput.trim()} className="btn-touch bg-emerald-500 text-black w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 dark:disabled:text-zinc-400 shadow-lg shrink-0">
                          <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-black/20">
                      <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                      <p className="text-sm">Select a connection to chat</p>
                    </div>
                  )}
              </div>

              <div className={`absolute inset-0 bg-background/50 dark:bg-zinc-950/50 backdrop-blur-xl border-t border-zinc-500/30 rounded-[2rem] z-[500] flex flex-col items-center justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-500 p-6 ${showPins ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                  <div className="flex justify-between items-center w-full mb-6 shrink-0">
                    <h2 className="text-xl font-bold text-foreground tracking-wide flex items-center gap-2">
                      <MapPinned className="w-5 h-5 text-emerald-500" /> My Photo Pins
                    </h2>
                    <button onClick={() => setShowPins(false)} className="btn-touch p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                      <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    </button>
                  </div>
                  
                  {/* Gallery Grid */}
                  <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar grid grid-cols-2 gap-4 pb-10 min-h-0">
                    {/* Upload / Take Picture Button */}
                    <label className="relative btn-touch flex flex-col items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-dashed border-emerald-500/40 rounded-2xl h-40 cursor-pointer transition-colors group">
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePassUpload} />
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <span className="text-emerald-400 text-3xl font-light leading-none mb-1">+</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">PASS Drop</span>
                    </label>
                    
                    {/* Placeholder Historical Pins */}
                    <div className="relative rounded-2xl h-40 overflow-hidden bg-zinc-900 border border-white/10 group cursor-pointer shadow-lg">
                       <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&h=300&fit=crop" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                       <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg text-emerald-400 text-[10px] font-bold font-mono border border-emerald-500/30">92.5 pts</div>
                    </div>
                    <div className="relative rounded-2xl h-40 overflow-hidden bg-zinc-900 border border-white/10 group cursor-pointer shadow-lg">
                       <img src="https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=300&h=300&fit=crop" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                       <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg text-emerald-400 text-[10px] font-bold font-mono border border-emerald-500/30">78.0 pts</div>
                    </div>
                  </div>
                </div>

              {/* Profile Overlay */}
              {showProfile && selectedProfile && (
                <div className="absolute inset-x-0 bottom-0 top-[60%] bg-black/10 backdrop-blur-sm border-t border-zinc-500/30 rounded-t-[2rem] z-[600] flex flex-col p-6 animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-full border-2 border-emerald-500 overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.5)] shrink-0">
                        <img src={selectedProfile.image || 'https://i.pravatar.cc/150'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-white tracking-wide">{selectedProfile.name}</h2>
                        <p className="text-emerald-400 text-xs font-mono">{selectedProfile.role || 'Proximity Member'}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowProfile(false)} className="btn-touch p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                  <div className="mt-8 space-y-4">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 ml-1">About</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
                        {selectedProfile.bio || 'This user prefers to keep a low profile.'}
                      </p>
                    </div>

                    {/* Bound Social Accounts */}
                    {selectedProfile.socials && selectedProfile.socials.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 ml-1">Connected Accounts</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedProfile.socials.map((social: any, idx: number) => {
                            let Icon = Github;
                            let colorClass = "text-white";
                            let bgClass = "bg-zinc-800 border-white/10";

                            if (social.platform === 'linkedin') { Icon = Linkedin; colorClass = "text-blue-400"; bgClass = "bg-[#0A66C2]/10 border-[#0A66C2]/30"; }
                            else if (social.platform === 'twitter') { Icon = Twitter; colorClass = "text-sky-400"; bgClass = "bg-sky-500/10 border-sky-500/30"; }
                            else if (social.platform === 'facebook') { Icon = Facebook; colorClass = "text-blue-500 fill-current"; bgClass = "bg-[#1877F2]/10 border-[#1877F2]/30"; }

                            return (
                              <div key={idx} className={`flex items-center gap-2.5 p-2 rounded-xl border ${bgClass} shadow-sm backdrop-blur-sm`}>
                                <Icon className={`w-4 h-4 shrink-0 ${colorClass}`} />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-bold text-white uppercase tracking-wider capitalize truncate">{social.platform}</span>
                                  <span className="text-[9px] text-zinc-400 font-mono truncate">{social.count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={() => {
                        setShowProfile(false);
                        setShowChat(true);
                        const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        // Map users don't have static IDs easily mapped to mockConnections here, so we append to a generic map connection
                        setAllMessages(prev => ({ ...prev, 'map_user': [{ sender: 'me', text: `Hi ${selectedProfile.name.split(' ')[0]}!`, time: newTime }] }));
                        setActiveChat({ id: 'map_user', name: selectedProfile.name, image: selectedProfile.image || 'https://i.pravatar.cc/150', distance: 'nearby', unread: 0 });
                      }} className="btn-touch bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 p-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold shadow-lg transition-colors">
                        <MessageSquare className="w-4 h-4" /> Message
                      </button>
                      <button className="btn-touch bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 p-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold shadow-lg transition-colors">
                        <User className="w-4 h-4" /> Connect
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Static Bottom Elements (Footprints, Persona, Status) */}
        <div className={`w-full shrink-0 flex flex-col z-10 transition-all duration-2000 overflow-hidden ${isExpanded ? 'max-h-0 opacity-0 pointer-events-none space-y-0 scale-95' : 'max-h-[500px] opacity-100 space-y-4 scale-100'}`}>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleLeaveFootprint} className="btn-touch glass-card text-sm">
              Leave Footprint
            </button>
            <button className="btn-touch glass-card text-sm">
              My Persona
            </button>
          </div>

          <div className="glass-card p-5 rounded-3xl space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Current Status</span>
              <span className="flex h-3 w-3 rounded-full animate-radar-dot mr-1" />
            </div>
            <p className="text-sm text-zinc-300">
              Scanning for organizations near you...
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium border border-[var(--glass-border)] italic">
                Hidden by default
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 glass-card !rounded-none !border-x-0 !border-b-0 flex items-center justify-around px-6 z-50">
        <div onClick={() => {
          if (!showMap) {
            setIsDiscovering(true);
            setTimeout(() => {
              setShowMap(true);
              setIsExpanded(true);
              setShowRadar(true);
              setShowConnections(false);
            }, 2100);
            return;
          }
          const nextState = !showRadar;
          setShowRadar(nextState);
          setShowConnections(false);
          if (nextState) {
            setIsExpanded(true);
            setIsDiscovering(true);
          }
        }} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${showRadar && !showConnections ? 'opacity-100 text-primary' : 'opacity-50'}`}>
          <div className={`w-6 h-6 rounded-md ${showRadar && !showConnections ? 'bg-primary/20 border border-primary/20' : 'bg-white/10'}`} />
          <span className="text-[10px] font-medium">Radar</span>
        </div>
        <div onClick={() => {
          if (!showMap) {
            setIsDiscovering(true);
            setTimeout(() => {
              setShowMap(true);
              setIsExpanded(true);
              setShowPins(true);
              setShowChat(false);
              setShowConnections(false);
            }, 2100);
            return;
          }
          const nextState = !showPins;
          setShowPins(nextState);
          if (nextState) {
            setShowChat(false);
            setIsExpanded(true);
            setIsDiscovering(true);
          }
          setShowConnections(false);
        }} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${showPins ? 'opacity-100 text-emerald-400' : 'opacity-50'}`}>
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${showPins ? 'bg-emerald-500/20 border border-emerald-500/20 text-emerald-500' : 'bg-white/10'}`}>
            <MapPinned className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium">Photo Pins</span>
        </div>
        <div onClick={() => {
          if (!showMap) {
            setIsDiscovering(true);
            setTimeout(() => {
              setShowMap(true);
              setIsExpanded(true);
              setShowChat(true);
              setShowPins(false);
              setShowConnections(false);
              if (!activeChat && connections.length > 0) setActiveChat(connections[0]);
            }, 2100);
            return;
          }
          const nextState = !showChat;
          setShowChat(nextState);
          if (nextState) {
            setShowPins(false);
            setIsExpanded(true);
            setIsDiscovering(true);
            if (!activeChat && connections.length > 0) {
              setActiveChat(connections[0]); // Select most recent chat by default
            }
          }
          setShowConnections(false);
        }} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${showChat ? 'opacity-100 text-emerald-400' : 'opacity-50'}`}>
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${showChat ? 'bg-teal-500/20 border border-teal-500/20 text-teal-400' : 'bg-white/10'}`}>
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium">Chat</span>
        </div>
        <div onClick={() => {
          if (!showMap) {
            setIsDiscovering(true);
            setTimeout(() => {
              setShowMap(true);
              setIsExpanded(true);
              setShowConnections(true);
              setShowPins(false);
              setShowChat(false);
              setShowProfile(false);
            }, 2100);
            return;
          }
          const nextState = !showConnections;
          setShowConnections(nextState);
          if (nextState) {
            setIsDiscovering(true);
            setShowMap(true);
            setIsExpanded(true);
            setShowPins(false);
            setShowChat(false);
            setShowProfile(false);
          }
        }} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${showConnections ? 'opacity-100 text-purple-400' : 'opacity-50'}`}>
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${showConnections ? 'bg-purple-500/20 border border-purple-500/20 text-purple-400' : 'bg-white/10'}`}>
            <Share2 className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium">Connections</span>
        </div>
      </nav>
    </div>
  );
}
