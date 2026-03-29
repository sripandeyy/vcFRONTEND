"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Video, User, Phone, Clock, ArrowLeft, LogOut, CheckCircle2,
    Edit2, Save, X, MapPin, Info, Hash, Shield, MessageSquare,
    ChevronRight, ArrowLeft as Back, Send
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface CallLogEntry { roomId: string; joinedAt: string; }

interface UserProfile {
    _id: string; email: string; name?: string; avatarUrl?: string;
    phone?: string; bio?: string; location?: string;
    isEmailVerified: boolean; authProvider: string;
    callHistory: CallLogEntry[]; createdAt: string; lastSeenAt: string;
}

interface ChatMessage {
    id: string; senderEmail: string; senderName: string;
    text: string; timestamp: string;
}

interface Conversation {
    roomId: string;
    participants: { email: string; name: string }[];
    messages: ChatMessage[];
    lastMessage: { text: string; senderName: string; timestamp: string };
    messageCount: number;
}

function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const AVATAR_COLORS = [
    'from-purple-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600',
    'from-sky-500 to-cyan-600',
];

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
    const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
    const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-10 h-10 text-sm';
    return (
        <div className={`${sz} rounded-xl bg-gradient-to-br ${AVATAR_COLORS[idx]} flex items-center justify-center font-bold text-white flex-shrink-0`}>
            {getInitials(name)}
        </div>
    );
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', bio: '', location: '' });

    // Tabs & Chats
    const [activeTab, setActiveTab] = useState<'calls' | 'chats'>('calls');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [chatsLoading, setChatsLoading] = useState(false);
    const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/');
    }, [status, router]);

    useEffect(() => {
        const email = session?.user?.email;
        if (!email) return;
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}api/profile?email=${email}`);
                const data = await res.json();
                if (data.success && data.user) {
                    setProfile(data.user);
                    setEditForm({ name: data.user.name || '', phone: data.user.phone || '', bio: data.user.bio || '', location: data.user.location || '' });
                }
            } catch { }
            setLoading(false);
        };
        fetchProfile();
    }, [session?.user?.email]);

    useEffect(() => {
        const email = session?.user?.email;
        if (!email || activeTab !== 'chats') return;
        setChatsLoading(true);
        fetch(`/api/chats?email=${encodeURIComponent(email)}`)
            .then(r => r.json())
            .then(d => { if (d.success) setConversations(d.conversations); })
            .catch(() => { })
            .finally(() => setChatsLoading(false));
    }, [activeTab, session?.user?.email]);

    const handleSaveProfile = async () => {
        const email = session?.user?.email;
        if (!email) return;
        setSaving(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}auth/profile`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, ...editForm }),
            });
            const data = await res.json();
            if (data.success) { setProfile(data.user); setEditMode(false); }
        } catch { }
        setSaving(false);
    };

    if (status === 'loading' || !session) {
        return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" /></div>;
    }

    const sortedHistory = [...(profile?.callHistory ?? [])].sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
    const myEmail = session.user?.email ?? '';

    return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-purple-500/30">
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/8 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto p-6 md:p-10 relative z-10">
                {/* Header */}
                <header className="flex items-center justify-between mb-10">
                    <motion.button whileHover={{ x: -3 }} onClick={() => router.push('/')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" /><span className="font-medium text-sm">Back to Home</span>
                    </motion.button>
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/')} className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg">
                            <Video className="w-4 h-4" /> New Meeting
                        </button>
                        <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors text-sm font-medium border border-zinc-800">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                        <div className="w-10 h-10 border-2 border-zinc-700 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-zinc-500 animate-pulse text-sm">Loading your profile…</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* === LEFT: Profile Card === */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-4 space-y-6">
                            <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="relative">
                                        {profile?.avatarUrl || session.user?.image ? (
                                            <img src={profile?.avatarUrl || session.user?.image || ''} alt="Profile" className="w-20 h-20 rounded-2xl border-2 border-zinc-700 shadow-xl object-cover" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/30 to-purple-600/10 flex items-center justify-center border-2 border-zinc-700">
                                                <User className="w-8 h-8 text-purple-400" />
                                            </div>
                                        )}
                                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#09090b] flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                    <button onClick={() => setEditMode(!editMode)} className="p-2.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-xl transition-colors border border-zinc-700/50">
                                        {editMode ? <X className="w-4 h-4 text-zinc-300" /> : <Edit2 className="w-4 h-4 text-zinc-300" />}
                                    </button>
                                </div>

                                <AnimatePresence mode="wait">
                                    {editMode ? (
                                        <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                            {[
                                                { label: 'Display Name', key: 'name', placeholder: 'Your name', icon: User },
                                                { label: 'Phone', key: 'phone', placeholder: '+91 XXXXX XXXXX', icon: Phone },
                                                { label: 'Location', key: 'location', placeholder: 'City, Country', icon: MapPin },
                                                { label: 'Bio', key: 'bio', placeholder: 'About you…', icon: Info },
                                            ].map(({ label, key, placeholder, icon: Icon }) => (
                                                <div key={key}>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1"><Icon className="w-3 h-3" /> {label}</label>
                                                    <input value={editForm[key as keyof typeof editForm]} onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-zinc-600" />
                                                </div>
                                            ))}
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSaveProfile} disabled={saving} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
                                                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                                            </motion.button>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <h2 className="text-xl font-bold text-white">{profile?.name || session.user?.name || 'Anonymous'}</h2>
                                            <p className="text-sm text-zinc-400 font-mono mt-1">{profile?.email}</p>
                                            {profile?.bio && <p className="text-sm text-zinc-300 mt-3 leading-relaxed">{profile.bio}</p>}
                                            <div className="mt-4 space-y-2">
                                                {profile?.phone && <p className="flex items-center gap-2 text-xs text-zinc-400"><Phone className="w-3.5 h-3.5 text-zinc-500" /> {profile.phone}</p>}
                                                {profile?.location && <p className="flex items-center gap-2 text-xs text-zinc-400"><MapPin className="w-3.5 h-3.5 text-zinc-500" /> {profile.location}</p>}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-zinc-800/50">
                                    <div className="text-center"><p className="text-xl font-bold text-purple-400">{profile?.callHistory?.length ?? 0}</p><p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">Calls</p></div>
                                    <div className="text-center"><p className="text-xl font-bold text-emerald-400">{profile?.isEmailVerified ? '✓' : '✗'}</p><p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">Verified</p></div>
                                    <div className="text-center"><p className="text-xl font-bold text-blue-400 capitalize">{profile?.authProvider ?? 'email'}</p><p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">Auth</p></div>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-[1.5rem] border border-white/5 shadow-xl space-y-3">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Account Info</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center py-2 border-b border-zinc-800/50"><span className="text-zinc-500 text-xs">Member Since</span><span className="text-zinc-300 text-xs font-medium">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString([], { dateStyle: 'medium' }) : '—'}</span></div>
                                    <div className="flex justify-between items-center py-2 border-b border-zinc-800/50"><span className="text-zinc-500 text-xs">Last Active</span><span className="text-zinc-300 text-xs font-medium">{profile?.lastSeenAt ? new Date(profile.lastSeenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span></div>
                                    <div className="flex justify-between items-center py-2"><span className="text-zinc-500 text-xs">Auth Method</span><span className="text-zinc-300 text-xs font-medium capitalize">{profile?.authProvider ?? '—'}</span></div>
                                </div>
                            </div>
                        </motion.div>

                        {/* === RIGHT: Tabs === */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-8 glass rounded-[2rem] border border-white/5 shadow-2xl flex flex-col" style={{ minHeight: '600px' }}>

                            {/* Tab Bar */}
                            <div className="flex items-center gap-1 p-2 border-b border-zinc-800/50 flex-shrink-0">
                                {[
                                    { id: 'calls', label: 'Call History', icon: Clock },
                                    { id: 'chats', label: 'Chat History', icon: MessageSquare },
                                ].map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => { setActiveTab(id as any); setSelectedConvo(null); }}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}
                                    >
                                        <Icon className="w-4 h-4" /> {label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <AnimatePresence mode="wait">

                                    {/* ── CALL HISTORY TAB ── */}
                                    {activeTab === 'calls' && (
                                        <motion.div key="calls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-8 space-y-3 scrollbar-hide">
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <h3 className="text-lg font-bold text-white flex items-center gap-3"><Clock className="w-5 h-5 text-purple-400" /> Call History</h3>
                                                    <p className="text-zinc-500 text-sm mt-1">{sortedHistory.length} session{sortedHistory.length !== 1 ? 's' : ''} stored</p>
                                                </div>
                                                <button onClick={() => router.push('/')} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
                                                    <Video className="w-4 h-4" /> New Call
                                                </button>
                                            </div>
                                            {sortedHistory.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-[400px] text-zinc-500">
                                                    <div className="p-5 bg-zinc-800/30 rounded-2xl mb-4"><Phone className="w-10 h-10 opacity-40" /></div>
                                                    <p className="font-semibold text-zinc-400 text-lg">No calls yet</p>
                                                    <p className="text-sm mt-2 text-center max-w-xs">Your call history will appear here after joining a meeting.</p>
                                                    <button onClick={() => router.push('/')} className="mt-6 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors text-sm font-bold">Start Your First Meeting</button>
                                                </div>
                                            ) : sortedHistory.map((log, idx) => (
                                                <motion.div key={idx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                                                    className="flex items-center justify-between p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                                            <Video className="w-5 h-5 text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-zinc-200 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-zinc-500" />{log.roomId}</p>
                                                            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(log.joinedAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => router.push(`/?room=${log.roomId}`)} className="px-4 py-2 bg-zinc-800 hover:bg-purple-600 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-zinc-700 hover:border-purple-500">Rejoin</button>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}

                                    {/* ── CHAT HISTORY TAB ── */}
                                    {activeTab === 'chats' && (
                                        <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col overflow-hidden">

                                            {/* Conversation List */}
                                            {!selectedConvo ? (
                                                <div className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-hide">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-white flex items-center gap-3"><MessageSquare className="w-5 h-5 text-purple-400" /> Conversations</h3>
                                                            <p className="text-zinc-500 text-sm mt-1">{chatsLoading ? 'Loading…' : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}</p>
                                                        </div>
                                                    </div>

                                                    {chatsLoading ? (
                                                        <div className="flex items-center justify-center h-[300px]">
                                                            <div className="w-8 h-8 border-2 border-zinc-700 border-t-purple-500 rounded-full animate-spin" />
                                                        </div>
                                                    ) : conversations.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center h-[350px] text-zinc-500">
                                                            <div className="p-5 bg-zinc-800/30 rounded-2xl mb-4"><MessageSquare className="w-10 h-10 opacity-40" /></div>
                                                            <p className="font-semibold text-zinc-400 text-lg">No chats yet</p>
                                                            <p className="text-sm mt-2 text-center max-w-xs">Messages sent inside meeting rooms will appear here.</p>
                                                            <button onClick={() => router.push('/')} className="mt-6 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors text-sm font-bold">Start a Meeting</button>
                                                        </div>
                                                    ) : conversations.map((convo, idx) => {
                                                        const others = convo.participants.filter(p => p.email !== myEmail);
                                                        const displayName = others.length > 0 ? others.map(p => p.name).join(', ') : 'You (solo)';
                                                        return (
                                                            <motion.button key={convo.roomId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                                                                onClick={() => setSelectedConvo(convo)}
                                                                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/50 transition-all group text-left">
                                                                <Avatar name={displayName} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="font-semibold text-zinc-200 text-sm truncate">{displayName}</p>
                                                                        <span className="text-[11px] text-zinc-500 ml-2 flex-shrink-0">{timeAgo(convo.lastMessage.timestamp)}</span>
                                                                    </div>
                                                                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                                                                        <Hash className="w-3 h-3 flex-shrink-0" />
                                                                        <span className="truncate">{convo.roomId}</span>
                                                                    </p>
                                                                    <p className="text-xs text-zinc-400 mt-1 truncate">
                                                                        <span className="text-zinc-500">{convo.lastMessage.senderName}:</span> {convo.lastMessage.text}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">{convo.messageCount}</span>
                                                                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                                                                </div>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* ── Thread View ── */
                                                <div className="flex flex-col h-full">
                                                    {/* Thread Header */}
                                                    <div className="flex items-center gap-3 p-4 border-b border-zinc-800/50 flex-shrink-0">
                                                        <button onClick={() => setSelectedConvo(null)} className="p-2 bg-zinc-800/60 hover:bg-zinc-700 rounded-xl transition-colors">
                                                            <Back className="w-4 h-4 text-zinc-300" />
                                                        </button>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar name={selectedConvo.participants.filter(p => p.email !== myEmail)[0]?.name || 'Chat'} size="sm" />
                                                            <div>
                                                                <p className="font-semibold text-zinc-200 text-sm">
                                                                    {selectedConvo.participants.filter(p => p.email !== myEmail).map(p => p.name).join(', ') || 'Solo chat'}
                                                                </p>
                                                                <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                                                                    <Hash className="w-3 h-3" />{selectedConvo.roomId} · {selectedConvo.messageCount} messages
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => router.push(`/?room=${selectedConvo.roomId}`)} className="ml-auto px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-bold rounded-xl border border-purple-500/30 transition-all flex items-center gap-1">
                                                            <Video className="w-3 h-3" /> Rejoin
                                                        </button>
                                                    </div>

                                                    {/* Participants */}
                                                    <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/30 flex-shrink-0 flex-wrap">
                                                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold">Participants:</span>
                                                        {selectedConvo.participants.map(p => (
                                                            <span key={p.email} className="text-[11px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                <User className="w-2.5 h-2.5" />{p.name}
                                                                {p.email === myEmail && <span className="text-purple-400 ml-0.5">(you)</span>}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* Messages */}
                                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                                                        {selectedConvo.messages.map((msg, idx) => {
                                                            const isMe = msg.senderEmail === myEmail;
                                                            const prevMsg = selectedConvo.messages[idx - 1];
                                                            const showSender = !prevMsg || prevMsg.senderEmail !== msg.senderEmail;
                                                            return (
                                                                <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                                                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                                    {showSender && (
                                                                        <span className={`text-[11px] text-zinc-500 mb-1 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                                                            {isMe ? 'You' : msg.senderName}
                                                                        </span>
                                                                    )}
                                                                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-purple-600 text-white rounded-tr-md' : 'bg-zinc-800 text-zinc-200 rounded-tl-md'}`}>
                                                                        {msg.text}
                                                                    </div>
                                                                    <span className="text-[10px] text-zinc-600 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString([], { timeStyle: 'short' })}</span>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Info bar */}
                                                    <div className="p-3 border-t border-zinc-800/50 flex-shrink-0">
                                                        <p className="text-center text-[11px] text-zinc-600 flex items-center justify-center gap-1.5">
                                                            <Send className="w-3 h-3" />
                                                            This is a read-only history. <button onClick={() => router.push(`/?room=${selectedConvo.roomId}`)} className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Rejoin the room</button> to send messages.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}
