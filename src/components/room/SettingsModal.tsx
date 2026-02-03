"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Video, Speaker, Monitor } from 'lucide-react';

interface SettingsModalProps {
    isVisible: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isVisible, onClose }: SettingsModalProps) {
    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="w-1 h-6 bg-purple-500 rounded-full" />
                            Settings
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Audio Input */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Mic className="w-4 h-4" /> Microphone
                            </label>
                            <select className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all">
                                <option>Default - MacBook Pro Microphone</option>
                                <option>External Microphone (USB)</option>
                            </select>
                        </div>

                        {/* Video Input */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Video className="w-4 h-4" /> Camera
                            </label>
                            <select className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all">
                                <option>FaceTime HD Camera</option>
                                <option>OBS Virtual Camera</option>
                            </select>
                        </div>

                        {/* Audio Output */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Speaker className="w-4 h-4" /> Speaker
                            </label>
                            <select className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all">
                                <option>Default - MacBook Pro Speakers</option>
                                <option>Headphones</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
