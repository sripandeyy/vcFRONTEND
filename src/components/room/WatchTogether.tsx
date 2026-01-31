"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, X, Link as LinkIcon, Play, Pause, FastForward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchTogetherProps {
    socket: any;
    roomId: string;
    isVisible: boolean;
    onClose: () => void;
}

export default function WatchTogether({ socket, roomId, isVisible, onClose }: WatchTogetherProps) {
    const [videoUrl, setVideoUrl] = useState('');
    const [videoId, setVideoId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.on('video-action', (payload: any) => {
            const { action, data } = payload;
            if (action === 'load') {
                setVideoId(data.videoId);
            }
            // In a real app, we'd sync time and playback state here
        });

        return () => socket.off('video-action');
    }, [socket]);

    const extractVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleLoadVideo = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const id = extractVideoId(videoUrl);
        if (id) {
            setVideoId(id);
            socket.emit('video-action', { roomId, action: 'load', data: { videoId: id } });
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-20 pointer-events-none"
                >
                    <div className="w-full max-w-5xl glass rounded-[2.5rem] relative flex flex-col pointer-events-auto border-2 border-primary/20 shadow-4xl overflow-hidden">
                        <div className="p-6 flex items-center justify-between border-b border-zinc-700/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-600/10 rounded-2xl">
                                    <Youtube className="w-6 h-6 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Watch Together</h3>
                                    <p className="text-xs text-zinc-500">Sync YouTube videos with everyone</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-rose-600 text-white rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 h-full flex flex-col items-center">
                            {!videoId ? (
                                <div className="flex-1 w-full max-w-xl flex flex-col justify-center gap-6">
                                    <div className="text-center space-y-2">
                                        <h4 className="text-2xl font-bold text-white">Find a Video</h4>
                                        <p className="text-zinc-400">Enter a YouTube link below to start watching</p>
                                    </div>
                                    <form onSubmit={handleLoadVideo} className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <LinkIcon className="w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={videoUrl}
                                            onChange={(e) => setVideoUrl(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all shadow-inner"
                                        />
                                        <button
                                            type="submit"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-xl font-bold transition-all"
                                        >
                                            Load
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="flex-1 w-full relative">
                                    <div className="aspect-video w-full rounded-[2rem] overflow-hidden border-4 border-zinc-800 shadow-2xl bg-black">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0`}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>

                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 glass rounded-3xl border border-zinc-700/50 scale-110">
                                        <button className="p-2 text-zinc-400 hover:text-white transition-colors">
                                            <Play className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setVideoId(null)}
                                            className="text-xs font-bold text-zinc-500 hover:text-rose-500 transition-colors uppercase tracking-widest px-4"
                                        >
                                            Change Video
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
