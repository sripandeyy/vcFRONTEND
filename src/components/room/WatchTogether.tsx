"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, X, Link as LinkIcon, Play, Pause, FastForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import YouTube, { YouTubeProps } from 'react-youtube';

interface WatchTogetherProps {
    socket: any;
    roomId: string;
    isVisible: boolean;
    onClose: () => void;
    syncedVideoId?: string | null;
    isEmbedded?: boolean;
}

export default function WatchTogether({ socket, roomId, isVisible, onClose, syncedVideoId, isEmbedded = false }: WatchTogetherProps) {
    const [videoUrl, setVideoUrl] = useState('');
    const [videoId, setVideoId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Player refs for Sync
    const playerRef = useRef<any>(null);
    const isRemoteUpdate = useRef(false);

    useEffect(() => {
        if (syncedVideoId) {
            setVideoId(syncedVideoId);
        }
    }, [syncedVideoId]);

    // Socket Event Listeners for Sync
    useEffect(() => {
        if (!socket) return;

        console.log('WatchTogether: Registering sync listeners');

        const handleVideoAction = (payload: any) => {
            const { action, data } = payload;
            console.log('Sync Action Received:', action, data);

            if (action === 'load') {
                setVideoId(data.videoId);
                setVideoUrl(''); // Clear input
            }

            // Player Actions
            if (playerRef.current) {
                if (action === 'play') {
                    isRemoteUpdate.current = true;
                    // Seek if needed (if time difference is large)
                    const currentTime = playerRef.current.getCurrentTime();
                    if (data?.time && Math.abs(currentTime - data.time) > 1) {
                        playerRef.current.seekTo(data.time, true);
                    }
                    playerRef.current.playVideo();
                    setIsPlaying(true);
                    setTimeout(() => isRemoteUpdate.current = false, 1000);
                }

                if (action === 'pause') {
                    isRemoteUpdate.current = true;
                    playerRef.current.pauseVideo();
                    setIsPlaying(false);
                    setTimeout(() => isRemoteUpdate.current = false, 1000);
                }
            }
        };

        socket.on('video-action', handleVideoAction);

        return () => {
            socket.off('video-action', handleVideoAction);
        };
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
            // Broadcast LOAD to everyone
            socket.emit('video-action', { roomId, action: 'load', data: { videoId: id } });
        } else {
            alert("Invalid YouTube URL!");
        }
    };

    // Player Event Handlers (Local -> Broadcast)
    const onPlayerReady = (event: any) => {
        playerRef.current = event.target;
    };

    const onPlayerStateChange = (event: any) => {
        // 1 = Playing, 2 = Paused
        if (isRemoteUpdate.current) return;

        const playerState = event.data;
        const currentTime = event.target.getCurrentTime();

        if (playerState === 1) { // Playing
            console.log("Broadcasting PLAY");
            socket.emit('video-action', { roomId, action: 'play', data: { time: currentTime } });
            setIsPlaying(true);
        } else if (playerState === 2) { // Paused
            console.log("Broadcasting PAUSE");
            socket.emit('video-action', { roomId, action: 'pause', data: { time: currentTime } });
            setIsPlaying(false);
        }
    };

    const playerOptions: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1, // Auto-play on load
            controls: 1,
            modestbranding: 1,
            rel: 0,
        },
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                        isEmbedded ? "absolute inset-0 flex items-center justify-center p-4 z-0 pointer-events-auto" : "fixed inset-0 z-[60] flex items-center justify-center p-20 pointer-events-none"
                    )}
                >
                    {/* Always use Modal Card layout, never full screen background */}
                    <div className={cn(
                        "w-full max-w-5xl glass rounded-[2.5rem] relative flex flex-col pointer-events-auto border-2 border-primary/20 shadow-4xl overflow-hidden bg-zinc-900/90 transition-all duration-500 ease-in-out"
                    )}>

                        {/* Header - Always Visible */}
                        <div className="p-6 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                                    <Youtube className="w-5 h-5 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">Watch Together</h3>
                                    <p className="text-xs text-zinc-500 font-medium">Sync YouTube videos with everyone</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-all border border-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className={cn("flex flex-col items-center w-full transition-all duration-500", videoId ? "p-0" : "p-8 space-y-8")}>
                            {!videoId ? (
                                <div className="w-full flex flex-col justify-center gap-8 py-4 px-8">
                                    <div className="text-center space-y-2">
                                        <h4 className="text-2xl font-bold text-white tracking-tight">Find a Video</h4>
                                        <p className="text-sm text-zinc-400">Enter a YouTube link below to start watching</p>
                                    </div>
                                    <form onSubmit={handleLoadVideo} className="relative group w-full max-w-2xl mx-auto">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <LinkIcon className="w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                                        </div>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                value={videoUrl}
                                                onChange={(e) => setVideoUrl(e.target.value)}
                                                className="flex-1 bg-zinc-950/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-sm font-medium"
                                            />
                                            <button
                                                type="submit"
                                                className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                                            >
                                                Load
                                            </button>
                                        </div>
                                    </form>

                                    {/* Debug/Info optional */}
                                    {syncedVideoId && (
                                        <p className="text-xs text-emerald-500/70 text-center font-mono">
                                            Room is currently watching a video
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full relative group aspect-video bg-black">
                                    <YouTube
                                        videoId={videoId}
                                        opts={playerOptions}
                                        onReady={onPlayerReady}
                                        onStateChange={onPlayerStateChange}
                                        className="w-full h-full"
                                        iframeClassName="w-full h-full"
                                    />

                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <button
                                            onClick={() => setVideoId(null)}
                                            className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white border border-white/10 hover:bg-rose-600 transition-all"
                                        >
                                            CHANGE VIDEO
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
