"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Video, User, Phone, Clock, ArrowLeft, LogOut, CheckCircle2, Edit2, Save, X, MapPin, Info, Hash, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';


interface CallLogEntry {
    roomId: string;
    joinedAt: string;
}

interface UserProfile {
    _id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    phone?: string;
    bio?: string;
    location?: string;
    isEmailVerified: boolean;
    authProvider: string;
    callHistory: CallLogEntry[];
    createdAt: string;
    lastSeenAt: string;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', bio: '', location: '' });

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
                    setEditForm({
                        name: data.user.name || '',
                        phone: data.user.phone || '',
                        bio: data.user.bio || '',
                        location: data.user.location || '',
                    });
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [session?.user?.email]);

    const handleSaveProfile = async () => {
        const email = session?.user?.email;
        if (!email) return;
        setSaving(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}auth/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, ...editForm }),
            });
            const data = await res.json();
            if (data.success) {
                setProfile(data.user);
                setEditMode(false);
            }
        } catch (err) {
            console.error("Failed to save profile", err);
        }
        setSaving(false);
    };

    if (status === 'loading' || !session) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    const sortedHistory = [...(profile?.callHistory ?? [])].sort(
        (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    );

    return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-purple-500/30">
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/8 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto p-6 md:p-10 relative z-10">
                {/* Header */}
                <header className="flex items-center justify-between mb-10">
                    <motion.button
                        whileHover={{ x: -3 }}
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium text-sm">Back to Home</span>
                    </motion.button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"
                        >
                            <Video className="w-4 h-4" /> New Meeting
                        </button>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors text-sm font-medium border border-zinc-800"
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                        <div className="w-10 h-10 border-2 border-zinc-700 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-zinc-500 animate-pulse text-sm">Loading your profile from database…</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* === LEFT: Profile Card === */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="lg:col-span-4 space-y-6"
                        >
                            {/* Profile Main Card */}
                            <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="relative">
                                        {profile?.avatarUrl || session.user?.image ? (
                                            <img
                                                src={profile?.avatarUrl || session.user?.image || ''}
                                                alt="Profile"
                                                className="w-20 h-20 rounded-2xl border-2 border-zinc-700 shadow-xl object-cover"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/30 to-purple-600/10 flex items-center justify-center border-2 border-zinc-700">
                                                <User className="w-8 h-8 text-purple-400" />
                                            </div>
                                        )}
                                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#09090b] flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setEditMode(!editMode)}
                                        className="p-2.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-xl transition-colors border border-zinc-700/50"
                                    >
                                        {editMode ? <X className="w-4 h-4 text-zinc-300" /> : <Edit2 className="w-4 h-4 text-zinc-300" />}
                                    </button>
                                </div>

                                <AnimatePresence mode="wait">
                                    {editMode ? (
                                        <motion.div
                                            key="edit"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-3"
                                        >
                                            {[
                                                { label: 'Display Name', key: 'name', placeholder: 'Your name', icon: User },
                                                { label: 'Phone', key: 'phone', placeholder: '+91 XXXXX XXXXX', icon: Phone },
                                                { label: 'Location', key: 'location', placeholder: 'City, Country', icon: MapPin },
                                                { label: 'Bio', key: 'bio', placeholder: 'About you…', icon: Info },
                                            ].map(({ label, key, placeholder, icon: Icon }) => (
                                                <div key={key}>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                                                        <Icon className="w-3 h-3" /> {label}
                                                    </label>
                                                    <input
                                                        value={editForm[key as keyof typeof editForm]}
                                                        onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                                                        placeholder={placeholder}
                                                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-zinc-600"
                                                    />
                                                </div>
                                            ))}
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleSaveProfile}
                                                disabled={saving}
                                                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                                            >
                                                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                                            </motion.button>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <h2 className="text-xl font-bold text-white">{profile?.name || session.user?.name || 'Anonymous'}</h2>
                                            <p className="text-sm text-zinc-400 font-mono mt-1">{profile?.email}</p>

                                            {profile?.bio && (
                                                <p className="text-sm text-zinc-300 mt-3 leading-relaxed">{profile.bio}</p>
                                            )}

                                            <div className="mt-4 space-y-2">
                                                {profile?.phone && (
                                                    <p className="flex items-center gap-2 text-xs text-zinc-400">
                                                        <Phone className="w-3.5 h-3.5 text-zinc-500" /> {profile.phone}
                                                    </p>
                                                )}
                                                {profile?.location && (
                                                    <p className="flex items-center gap-2 text-xs text-zinc-400">
                                                        <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {profile.location}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-zinc-800/50">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-purple-400">{profile?.callHistory?.length ?? 0}</p>
                                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">Calls</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-emerald-400">{profile?.isEmailVerified ? '✓' : '✗'}</p>
                                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">Verified</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-blue-400 capitalize">{profile?.authProvider ?? 'email'}</p>
                                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">Auth</p>
                                    </div>
                                </div>
                            </div>

                            {/* Account Info Card */}
                            <div className="glass p-6 rounded-[1.5rem] border border-white/5 shadow-xl space-y-3">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" /> Account Info
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                                        <span className="text-zinc-500 text-xs">Member Since</span>
                                        <span className="text-zinc-300 text-xs font-medium">
                                            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString([], { dateStyle: 'medium' }) : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                                        <span className="text-zinc-500 text-xs">Last Active</span>
                                        <span className="text-zinc-300 text-xs font-medium">
                                            {profile?.lastSeenAt ? new Date(profile.lastSeenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-zinc-500 text-xs">Auth Method</span>
                                        <span className="text-zinc-300 text-xs font-medium capitalize">{profile?.authProvider ?? '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* === RIGHT: Call History === */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="lg:col-span-8 glass p-8 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col"
                            style={{ minHeight: '600px' }}
                        >
                            <div className="flex items-center justify-between mb-6 pb-5 border-b border-zinc-800/50">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-purple-400" /> Call History
                                    </h3>
                                    <p className="text-zinc-500 text-sm mt-1">{sortedHistory.length} session{sortedHistory.length !== 1 ? 's' : ''} stored in your account</p>
                                </div>
                                <button
                                    onClick={() => router.push('/')}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                                >
                                    <Video className="w-4 h-4" /> New Call
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                                {sortedHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-16">
                                        <div className="p-5 bg-zinc-800/30 rounded-2xl mb-4">
                                            <Phone className="w-10 h-10 opacity-40" />
                                        </div>
                                        <p className="font-semibold text-zinc-400 text-lg">No calls yet</p>
                                        <p className="text-sm mt-2 text-center max-w-xs">
                                            Your call history will appear here after you join your first meeting room.
                                        </p>
                                        <button
                                            onClick={() => router.push('/')}
                                            className="mt-6 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors text-sm font-bold"
                                        >
                                            Start Your First Meeting
                                        </button>
                                    </div>
                                ) : (
                                    sortedHistory.map((log, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="flex items-center justify-between p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                                    <Video className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-zinc-200 flex items-center gap-2">
                                                        <Hash className="w-3.5 h-3.5 text-zinc-500" />
                                                        {log.roomId}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(log.joinedAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/?room=${log.roomId}`)}
                                                className="px-4 py-2 bg-zinc-800 hover:bg-purple-600 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-zinc-700 hover:border-purple-500"
                                            >
                                                Rejoin
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                    </div>
                )}
            </div>
        </div>
    );
}
