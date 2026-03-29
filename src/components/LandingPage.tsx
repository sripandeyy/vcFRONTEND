"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, User, Hash, ArrowRight, LogOut, Mail, KeyRound, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signIn, signOut, useSession } from 'next-auth/react';
import AdminPanel from './AdminPanel';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface LandingPageProps {
    onJoin: (data: { userName: string; roomId: string }) => void;
}

export default function LandingPage({ onJoin }: LandingPageProps) {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const [userName, setUserName] = useState('');
    const [roomId, setRoomId] = useState(searchParams?.get('room') || '');

    const [authMode, setAuthMode] = useState<'options' | 'email' | 'otp'>('options');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    // Update userName once session loads
    React.useEffect(() => {
        if (session?.user?.name && !userName) {
            setUserName(session.user.name);
        }
    }, [session, userName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = session?.user?.name || userName;
        if (finalName && roomId) {
            onJoin({ userName: finalName, roomId });
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSendingOtp(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.success) {
                setAuthMode('otp');
            } else {
                setErrorMsg(data.message || 'Failed to send OTP.');
            }
        } catch (err) {
            setErrorMsg('Network error. Is the backend running?');
        }
        setIsSendingOtp(false);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsVerifyingOtp(true);
        try {
            const result = await signIn('credentials', {
                email,
                otp,
                redirect: false
            });
            if (result?.error) {
                setErrorMsg('Invalid or expired OTP.');
            }
        } catch (err) {
            setErrorMsg('Error verifying OTP.');
        }
        setIsVerifyingOtp(false);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="z-10 w-full max-w-[440px] px-6"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="inline-flex p-3 bg-purple-600/10 rounded-2xl mb-4 border border-purple-500/20"
                    >
                        <Video className="w-8 h-8 text-purple-500" />
                    </motion.div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
                        ChatRoom
                    </h1>
                    <p className="text-zinc-400 text-base md:text-lg">
                        Connect instantly with high-quality video calls.
                    </p>
                </div>

                <div className="glass p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl">
                    {!session ? (
                        <div className="space-y-6 text-center">
                            <p className="text-zinc-300">Please sign in to join a meeting.</p>
                            
                            {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

                            {authMode === 'options' && (
                                <div className="space-y-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => signIn('google')}
                                        className="w-full py-3.5 md:py-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3"
                                    >
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google logo" />
                                        Sign in with Google
                                    </motion.button>
                                    
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#09090b] px-2 text-zinc-500">Or continue with</span></div>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setAuthMode('email')}
                                        className="w-full py-3.5 md:py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 border border-zinc-700"
                                    >
                                        <Mail className="w-5 h-5 text-zinc-400" />
                                        Sign in with Email
                                    </motion.button>
                                </div>
                            )}

                            {authMode === 'email' && (
                                <form onSubmit={handleSendOtp} className="space-y-4">
                                    <div className="space-y-2 text-left">
                                        <label className="text-sm font-medium text-zinc-300 ml-1">Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="hello@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-zinc-600"
                                        />
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={isSendingOtp}
                                        className="w-full py-3.5 md:py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-bold rounded-2xl shadow-lg transition-all"
                                    >
                                        {isSendingOtp ? 'Sending...' : 'Send OTP Code'}
                                    </motion.button>
                                    <button type="button" onClick={() => setAuthMode('options')} className="text-sm text-zinc-500 hover:text-white transition-colors">Back</button>
                                </form>
                            )}

                            {authMode === 'otp' && (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <p className="text-sm text-zinc-400 text-left mb-2">Code sent to <b>{email}</b></p>
                                    <div className="space-y-2 text-left">
                                        <label className="text-sm font-medium text-zinc-300 ml-1 flex items-center gap-2"><KeyRound className="w-4 h-4"/> 6-Digit OTP</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="123456"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="w-full text-center tracking-[0.5em] font-mono text-xl bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                        />
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={isVerifyingOtp}
                                        className="w-full py-3.5 md:py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-bold rounded-2xl shadow-lg transition-all"
                                    >
                                        {isVerifyingOtp ? 'Verifying...' : 'Login'}
                                    </motion.button>
                                    <button type="button" onClick={() => setAuthMode('email')} className="text-sm text-zinc-500 hover:text-white transition-colors">Change Email</button>
                                </form>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                            <div className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800">
                                <div className="flex items-center gap-3">
                                    {session.user?.image ? (
                                        <img src={session.user.image} alt="Profile" className="w-10 h-10 rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                            <User className="w-5 h-5 text-purple-400" />
                                        </div>
                                    )}
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-white">{session.user?.name}</p>
                                        <p className="text-xs text-zinc-400">{session.user?.email}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => signOut()} className="p-2 text-zinc-400 hover:text-white transition-colors" title="Sign out">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 ml-1 flex items-center gap-2">
                                    <Hash className="w-4 h-4" /> Room ID
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter room ID"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="flex gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    className="flex-1 py-3.5 md:py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    Join Meeting <ArrowRight className="w-5 h-5" />
                                </motion.button>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex-1"
                                >
                                    <Link href="/dashboard" className="block w-full py-3.5 md:py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-center border border-zinc-700">
                                        <User className="w-5 h-5" /> Dashboard
                                    </Link>
                                </motion.div>
                            </div>
                            {session.user?.email === 'srijanpandey2969@gmail.com' && (
                                <button
                                    type="button"
                                    onClick={() => setShowAdminPanel(true)}
                                    className="w-full mt-4 py-3 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-2xl border border-red-500/20 transition-all shadow-lg text-sm"
                                >
                                    <ShieldAlert className="w-4 h-4" /> Go to Admin Dashboard
                                </button>
                            )}
                        </form>
                    )}
                </div>

                {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}

                <p className="mt-8 text-center text-zinc-500 text-xs md:text-sm px-4">
                    By joining, you agree to our Terms and Privacy Policy.
                </p>

            </motion.div>
        </div>
    );
}
