"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, User, Hash, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandingPageProps {
    onJoin: (data: { userName: string; roomId: string }) => void;
}

export default function LandingPage({ onJoin }: LandingPageProps) {
    const [userName, setUserName] = useState('');
    const [roomId, setRoomId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userName && roomId) {
            onJoin({ userName, roomId });
        }
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
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                        Horizon Video
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Connect instantly with high-quality video calls.
                    </p>
                </div>

                <div className="glass p-8 rounded-[2rem] shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 ml-1 flex items-center gap-2">
                                <User className="w-4 h-4" /> Your Name
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Enter your name"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-zinc-600"
                            />
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

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            Join Meeting <ArrowRight className="w-5 h-5" />
                        </motion.button>
                    </form>
                </div>

                <p className="mt-8 text-center text-zinc-500 text-sm">
                    By joining, you agree to our Terms and Privacy Policy.
                </p>
            </motion.div>
        </div>
    );
}
