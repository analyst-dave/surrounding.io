"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Github, Twitter, Chrome, Linkedin, UserCircle2, Facebook, MapPinned, Send, MessageSquare, User, X } from "lucide-react";

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
};

export default function Home() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Pin state
  const [pins, setPins] = useState<Pin[]>([]);
  const [showPins, setShowPins] = useState(true);
  const [isDroppingPinMode, setIsDroppingPinMode] = useState(false);

  const [showRadar, setShowRadar] = useState(true);

  // Auth simulation state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState<{ name: string, image: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const mockConnections = [
    { id: '1', name: 'Sarah J.', image: 'https://i.pravatar.cc/150?u=sarah', distance: '12m', unread: 0 },
    { id: '2', name: 'Mike T.', image: 'https://i.pravatar.cc/150?u=mike', distance: '45m', unread: 2 },
    { id: '3', name: 'Elena R.', image: 'https://i.pravatar.cc/150?u=elena', distance: '80m', unread: 1 },
    { id: '4', name: 'Alex K.', image: 'https://i.pravatar.cc/150?u=alex', distance: '120m', unread: 0 },
    { id: '5', name: 'Tom H.', image: 'https://i.pravatar.cc/150?u=tom', distance: '200m', unread: 0 },
    { id: '6', name: 'Aisha M.', image: 'https://i.pravatar.cc/150?u=aisha', distance: '250m', unread: 5 },
    { id: '7', name: 'Jordan P.', image: 'https://i.pravatar.cc/150?u=jordan', distance: '300m', unread: 0 },
    { id: '8', name: 'David W.', image: 'https://i.pravatar.cc/150?u=david', distance: '400m', unread: 1 },
    { id: '9', name: 'Chris L.', image: 'https://i.pravatar.cc/150?u=chris', distance: '450m', unread: 0 },
    { id: '10', name: 'Kelly B.', image: 'https://i.pravatar.cc/150?u=kelly', distance: '500m', unread: 0 },
    { id: '11', name: 'James C.', image: 'https://i.pravatar.cc/150?u=james', distance: '600m', unread: 0 },
    { id: '12', name: 'Sam D.', image: 'https://i.pravatar.cc/150?u=sam', distance: '800m', unread: 0 },
    { id: '13', name: 'Erica F.', image: 'https://i.pravatar.cc/150?u=erica', distance: '900m', unread: 0 },
    { id: '14', name: 'Greg G.', image: 'https://i.pravatar.cc/150?u=greg', distance: '1.2km', unread: 0 },
    { id: '15', name: 'Hannah I.', image: 'https://i.pravatar.cc/150?u=hannah', distance: '1.5km', unread: 0 },
  ];

  type Message = { sender: 'me' | 'them', text: string, time: string };

  const initialMessages: Record<string, Message[]> = {
    '1': [
      { sender: 'them', text: 'Hey! I see your signal on the radar.', time: '10:41 AM' },
      { sender: 'me', text: 'Yeah just linking up here. Are you at the cafe?', time: '10:42 AM' },
      { sender: 'them', text: 'Yes, just sitting by the window.', time: '10:43 AM' },
      { sender: 'them', text: 'It is pretty packed today.', time: '10:44 AM' },
      { sender: 'me', text: 'I see you! Be right over.', time: '10:45 AM' },
      { sender: 'them', text: 'Awesome.', time: '10:46 AM' },
      { sender: 'me', text: 'Actually wait, I just saw a friend.', time: '10:50 AM' },
      { sender: 'them', text: 'Oh no worries! Take your time.', time: '10:51 AM' },
      { sender: 'me', text: 'Thanks. You still have that codebase open?', time: '10:55 AM' },
      { sender: 'them', text: 'Yeah I am reviewing the PR now.', time: '10:56 AM' },
      { sender: 'me', text: 'Cool, let me know what you think of the new UI overlay.', time: '11:00 AM' },
      { sender: 'them', text: 'Will do. I think making the header a single row is a good call.', time: '11:02 AM' },
      { sender: 'me', text: 'Agreed, it saves a ton of vertical space.', time: '11:05 AM' }
    ],
    '2': [
      { sender: 'them', text: 'Are you going to the tech meetup later?', time: '09:15 AM' },
      { sender: 'them', text: 'Trying to find someone to walk with.', time: '09:16 AM' }
    ],
    '3': [
      { sender: 'them', text: 'Nice profile, what framework do you mostly use?', time: 'Yesterday' }
    ],
    '4': [
      { sender: 'me', text: 'Thanks for connecting!', time: 'Yesterday' },
      { sender: 'them', text: 'Likewise! Catch you around the block.', time: 'Yesterday' }
    ],
    '6': [
      { sender: 'them', text: 'Hey there! Checking out the new app build.', time: '10:00 AM' },
      { sender: 'them', text: 'Looks like radar works smoothly.', time: '10:05 AM' },
    ]
  };

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [activeChat, setActiveChat] = useState(mockConnections[0]);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Profile Overlay State
  const [showProfile, setShowProfile] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null); // Passed from the map

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

  const handleDiscoverClick = () => {
    setIsDiscovering(true);
    // Wait for the upward expansion animation to complete before rendering the map payload
    setTimeout(() => {
      setShowMap(true);
    }, 400);
  };

  const handleBackClick = () => {
    setShowMap(false);
    setIsDiscovering(false);
    setIsExpanded(false);
    setIsDroppingPinMode(false);
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

  const handleMockLogin = (provider: string) => {
    setIsLoggingIn(true);
    // Simulate network delay
    setTimeout(() => {
      setUser({
        name: "Dave",
        image: "https://github.com/shadcn.png" // Using a reliable placeholder avatar
      });
      setIsLoggingIn(false);
      setIsLoginOpen(false);
    }, 1500);
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
              <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
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
                <>
                  <button onClick={() => handleMockLogin('google')} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black p-2.5 rounded-xl transition-colors text-sm font-medium shadow-sm">
                    <Chrome className="w-4 h-4 text-blue-500" /> Continue with Google
                  </button>
                  <button onClick={() => handleMockLogin('facebook')} className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white p-2.5 rounded-xl transition-colors text-sm font-medium">
                    <Facebook className="w-4 h-4 fill-current" /> Continue with Facebook
                  </button>
                  <button onClick={() => handleMockLogin('linkedin')} className="w-full flex items-center justify-center gap-3 bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white p-2.5 rounded-xl transition-colors text-sm font-medium">
                    <Linkedin className="w-4 h-4 fill-current" /> Continue with LinkedIn
                  </button>
                  <button onClick={() => handleMockLogin('github')} className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white p-2.5 rounded-xl transition-colors text-sm font-medium border border-white/5">
                    {isLoggingIn ? <span className="animate-spin w-4 h-4 rounded-full border-2 border-white/20 border-t-white"></span> : <><Github className="w-4 h-4" /> Continue with Github</>}
                  </button>
                  <button onClick={() => handleMockLogin('twitter')} className="w-full flex items-center justify-center gap-3 bg-black hover:bg-zinc-900 text-white p-2.5 rounded-xl transition-colors text-sm font-medium border border-white/10">
                    <Twitter className="w-4 h-4 fill-current" /> Continue with Twitter
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setUser(null); setIsLoginOpen(false); }}
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
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground flex items-center drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          surr<BeaconO />unding.i<BeaconO />
        </h1>
        <p className={`text-zinc-400 text-lg max-w-sm mx-auto transition-all duration-1000 overflow-hidden ${isDiscovering ? 'h-0 opacity-0 mt-0' : 'h-[60px] opacity-100 mt-4'}`}>
          Connections within your immediate reach.
        </p>
      </header>

      {/* Main Container */}
      <div className={`w-full flex flex-col items-center justify-center relative transition-all duration-2000 shrink-0 ${isExpanded ? 'max-w-[100vw] px-4' : 'max-w-[24rem] px-0'} ${isDiscovering ? 'mt-0 mb-0 flex-grow-0' : ''}`}>

        {/* Expanding Map Area */}
        <div className={`w-full flex justify-center items-center transition-all duration-2000 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-20 ${isDiscovering ? (isExpanded ? 'h-[calc(100dvh-150px)] mb-0' : 'h-[50dvh] min-h-[400px] mb-6') : 'h-[56px] min-h-[56px] mb-6'}`}>
          {!showMap ? (
            <button
              onClick={handleDiscoverClick}
              className={`btn-touch w-full flex items-center justify-center bg-emerald-500 text-background font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-2000
              ${isDiscovering ? 'h-full rounded-[2rem] bg-zinc-900 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]' : 'h-[56px] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95'}`}
            >
              <span className={`transition-all duration-1000 ${isDiscovering ? 'opacity-0 scale-90 tracking-widest translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                Discover
              </span>
            </button>
          ) : (
            <div className="absolute inset-0 w-full h-full border border-white/10 rounded-[2rem] overflow-hidden bg-zinc-900 shadow-2xl animate-in fade-in zoom-in-95 duration-1000">
              {/* Click Interceptor for Collapsed Map */}
              {!isExpanded && (
                <div
                  className="absolute inset-0 z-[1000] cursor-pointer"
                  onClick={handleExpandClick}
                />
              )}
              <MapView
                user={user}
                isExpanded={isExpanded}
                onBackClick={handleBackClick}
                onExpandClick={handleExpandClick}
                isDroppingPinMode={isDroppingPinMode}
                setIsDroppingPinMode={setIsDroppingPinMode}
                pins={pins}
                setPins={setPins}
                showPins={showPins}
                showRadar={showRadar}
                onProfileSelect={(p: any) => { setSelectedProfile(p); setShowProfile(true); }}
              />

              {/* Chat Overlay */}
              {showChat && (
                <div className="absolute inset-x-0 bottom-0 top-[20%] bg-black/10 backdrop-blur-sm border-t border-zinc-500/30 rounded-t-[2rem] z-[600] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                  {/* Transparent Glass Header - Single Row Layout */}
                  <div className="flex flex-row items-center bg-black/40 backdrop-blur-md px-3 py-3 shadow-lg z-10 shrink-0 border-b border-white/10 gap-3">

                    {/* Active Chat Information (Fixed Left) */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="relative w-10 h-10 rounded-full border-2 border-emerald-500 overflow-hidden shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0">
                        <img src={activeChat.image} className="w-full h-full object-cover" />
                        {activeChat.unread > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border border-zinc-900 rounded-full"></span>}
                      </div>
                      <div className="flex flex-col max-w-[90px] overflow-hidden">
                        <h3 className="font-bold text-white text-xs leading-tight truncate">{activeChat.name}</h3>
                        <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1 mt-0.5 truncate">
                          <MapPinned className="w-2.5 h-2.5 text-emerald-500 shrink-0" /> {activeChat.distance}
                        </span>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="w-px h-8 bg-zinc-800 shrink-0 mx-1"></div>

                    {/* Scrolling Inactive Connections */}
                    <div className="flex flex-1 gap-2.5 overflow-x-auto no-scrollbar items-center mask-image-[linear-gradient(to_right,white_90%,transparent)] pr-4">
                      {mockConnections.filter(c => c.id !== activeChat.id).map(c => (
                        <div key={c.id} onClick={() => setActiveChat(c)} className="relative w-8 h-8 rounded-full border border-zinc-700 opacity-60 overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:opacity-100 shrink-0">
                          <img src={c.image} className="w-full h-full object-cover" />
                          {c.unread > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border border-zinc-900 rounded-full"></span>}
                        </div>
                      ))}
                    </div>

                    {/* Close Button */}
                    <button onClick={() => setShowChat(false)} className="btn-touch p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors shrink-0">
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
                    {/* Chat Messages */}
                    {(allMessages[activeChat.id] || []).map((msg, i) => (
                      <div key={i} className={`flex w-full flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-md ${msg.sender === 'me' ? 'bg-emerald-500 text-black font-medium rounded-tr-sm' : 'bg-white/10 text-zinc-200 border border-white/5 rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        <span className={`text-[9px] mt-1 text-zinc-500 font-medium tracking-wide ${msg.sender === 'me' ? 'pr-1' : 'pl-1'}`}>{msg.time}</span>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex w-full justify-start animate-in fade-in">
                        <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/5 text-zinc-400 text-xs italic border border-white/5 rounded-tl-sm flex items-center gap-1.5 h-[44px]">
                          <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/40 flex gap-2 shrink-0">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-500 shadow-inner" />
                    <button type="submit" disabled={!chatInput.trim()} className="btn-touch bg-emerald-500 text-black p-3 rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-500 shadow-lg">
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                </div>
              )}

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
        <div onClick={() => setShowRadar(!showRadar)} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${showRadar ? 'opacity-100 text-primary' : 'opacity-50'}`}>
          <div className={`w-6 h-6 rounded-md ${showRadar ? 'bg-primary/20 border border-primary/20' : 'bg-white/10'}`} />
          <span className="text-[10px] font-medium">Radar</span>
        </div>
        <div onClick={() => setShowPins(!showPins)} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${showPins ? 'opacity-100 text-emerald-500' : 'opacity-50'}`}>
          <div className={`w-6 h-6 rounded-md ${showPins ? 'bg-emerald-500/20 border border-emerald-500/20' : 'bg-white/10'}`} />
          <span className="text-[10px] font-medium">Pins</span>
        </div>
        <div onClick={() => setShowChat(!showChat)} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${showChat ? 'opacity-100 text-teal-400' : 'opacity-50'}`}>
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${showChat ? 'bg-teal-500/20 border border-teal-500/20 text-teal-400' : 'bg-white/10'}`}>
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium">Chat</span>
        </div>
        <div onClick={() => {
          if (!showProfile) {
            // Default to My Persona if opening without a selection
            setSelectedProfile(user ? { ...user, role: 'Software Engineer', bio: 'Building the future of proximity networking.' } : { name: 'Guest User', role: 'Observer', bio: 'Just looking around.' });
          }
          setShowProfile(!showProfile);
        }} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${showProfile ? 'opacity-100 text-purple-400' : 'opacity-50'}`}>
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${showProfile ? 'bg-purple-500/20 border border-purple-500/20 text-purple-400' : 'bg-white/10'}`}>
            <User className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium">Profile</span>
        </div>
      </nav>
    </div>
  );
}
