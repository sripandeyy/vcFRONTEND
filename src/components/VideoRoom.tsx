"use client";

if (typeof window !== 'undefined') {
    (window as any).global = window;
    if (!(window as any).process) {
        (window as any).process = {
            nextTick: (fn: any) => setTimeout(fn, 0),
            browser: true,
            env: {}
        };
    }
}
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '@/lib/socket';
import Peer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, Maximize2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import ControlBar from './room/ControlBar';
import ChatPanel from './room/ChatPanel';
import Whiteboard from './room/Whiteboard';
import WatchTogether from './room/WatchTogether';
import SettingsModal from './room/SettingsModal';

interface VideoRoomProps {
    roomId: string;
    userName: string;
    onLeave: () => void;
}

interface PeerState {
    socketId: string;
    userName: string;
    stream: MediaStream | null;
}

import { useSession } from 'next-auth/react';

export default function VideoRoom({ roomId, userName, onLeave }: VideoRoomProps) {
    const { data: session } = useSession();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<PeerState[]>([]);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [showWatchTogether, setShowWatchTogether] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
    const [globalVideoId, setGlobalVideoId] = useState<string | null>(null);

    const userVideo = useRef<HTMLVideoElement>(null);
    const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const mountedRef = useRef(true);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [unreadMessages, setUnreadMessages] = useState(0);
    const showChatRef = useRef(showChat);

    const resetControlTimer = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 5000);
    };

    useEffect(() => {
        resetControlTimer();
        window.addEventListener('mousemove', resetControlTimer);
        window.addEventListener('click', resetControlTimer);
        window.addEventListener('keydown', resetControlTimer);
        window.addEventListener('touchstart', resetControlTimer);

        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            window.removeEventListener('mousemove', resetControlTimer);
            window.removeEventListener('click', resetControlTimer);
            window.removeEventListener('keydown', resetControlTimer);
            window.removeEventListener('touchstart', resetControlTimer);
        };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        let isCancelled = false;

        const cleanup = () => {
            console.log('Cleaning up VideoRoom...');
            socket.off('all-users');
            socket.off('user-joined');
            socket.off('signal');
            socket.off('user-left');
            socket.off('connect');
            socket.off('video-action');

            // Destroy peers first (before stopping tracks) to avoid ICE OperationError
            Object.keys(peersRef.current).forEach(id => {
                try {
                    if (peersRef.current[id] && !peersRef.current[id].destroyed) {
                        peersRef.current[id].destroy();
                    }
                } catch (_) { /* suppress cleanup errors */ }
                delete peersRef.current[id];
            });
            setPeers([]);

            // Stop local media tracks after peers are gone
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }

            socket.disconnect();
        };

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (isCancelled) {
                    console.log('Init cancelled after getUserMedia, stopping tracks');
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                setLocalStream(stream);
                localStreamRef.current = stream;
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                }

                socket.connect();

                const handleConnect = () => {
                    console.log("Socket connected, joining room...");
                    socket.emit('join-room', {
                        roomId: roomId.trim().toLowerCase(),
                        userId: session?.user?.email || socket.id || `user-${Math.random().toString(36).substr(2, 9)}`,
                        userName
                    });
                };

                if (socket.connected) {
                    handleConnect();
                } else {
                    socket.on('connect', handleConnect);
                }

                socket.on('all-users', (usersArray: Array<{ socketId: string, userName: string }>) => {
                    if (isCancelled) return;
                    console.log('Server reported existing users:', usersArray);
                    usersArray.forEach((user) => {
                        initializePeer(user.socketId, true, stream, user.userName);
                    });
                });

                socket.on('user-joined', (payload: { socketId: string; userName: string }) => {
                    if (isCancelled) return;
                    console.log('New user joined room:', payload.socketId);
                    initializePeer(payload.socketId, false, stream, payload.userName);
                });

                socket.on('signal', (payload: { signal: any; from: string }) => {
                    if (isCancelled) return;

                    const peer = peersRef.current[payload.from];

                    if (peer) {
                        try {
                            if (peer.destroyed) return;
                            if (payload.signal.type === 'offer' && (peer as any).connected) return;
                            peer.signal(payload.signal);
                        } catch (err) {
                            console.warn('Signal error:', err);
                        }
                    } else if (payload.signal.type === 'offer') {
                        console.log('Signal (OFFER) from unknown peer, initializing as non-initiator:', payload.from);
                        const newPeer = initializePeer(payload.from, false, localStreamRef.current!);
                        newPeer.signal(payload.signal);
                    }
                });

                socket.on('user-left', (payload: { socketId: string }) => {
                    if (isCancelled) return;
                    console.log('User left, destroying peer:', payload.socketId);
                    if (peersRef.current[payload.socketId]) {
                        peersRef.current[payload.socketId].destroy();
                        delete peersRef.current[payload.socketId];
                    }
                    setPeers(prev => prev.filter(p => p.socketId !== payload.socketId));
                });

                socket.on('video-action', (payload: any) => {
                    if (isCancelled) return;
                    console.log('Video action received globally:', payload);
                    const { action, data } = payload;
                    if (action === 'load') {
                        setShowWatchTogether(true);
                        const remoteId = data?.videoId || payload?.videoId || payload?.data;
                        if (remoteId && typeof remoteId === 'string') {
                            setGlobalVideoId(remoteId);
                        }
                    }
                });

                socket.on('receive-message', () => {
                    if (!showChatRef.current) {
                        setUnreadMessages(prev => prev + 1);
                    }
                });

                setupAudioAnalysis(stream);

            } catch (err) {
                console.error("Initialization error:", err);
            }
        };

        init();

        return () => {
            isCancelled = true;
            mountedRef.current = false;
            cleanup();
        };
    }, [roomId, userName]);

    useEffect(() => {
        showChatRef.current = showChat;
        if (showChat) {
            setUnreadMessages(0);
        }
    }, [showChat]);

    function initializePeer(remoteSocketId: string, initiator: boolean, stream: MediaStream, remoteName?: string) {
        if (peersRef.current[remoteSocketId]) return peersRef.current[remoteSocketId];

        console.log(`Initializing peer [${initiator ? 'INITIATOR' : 'RECEIVER'}] for:`, remoteSocketId);

        const peer = new Peer({
            initiator,
            trickle: true,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        peersRef.current[remoteSocketId] = peer;

        setPeers(prev => {
            if (prev.find(p => p.socketId === remoteSocketId)) return prev;
            return [...prev, { socketId: remoteSocketId, userName: remoteName || 'Remote User', stream: null }];
        });

        peer.on('signal', (signal) => {
            socket.emit('signal', { signal, to: remoteSocketId });
        });

        peer.on('stream', (remoteStream) => {
            console.log('Stream received from:', remoteSocketId);
            setPeers(prev => prev.map(p =>
                p.socketId === remoteSocketId ? { ...p, stream: remoteStream } : p
            ));
        });

        peer.on('error', (err) => {
            // Suppress the common non-fatal WebRTC close abort that fires on peer.destroy()
            if (err?.message?.includes('User-Initiated Abort') || err?.message?.includes('Close called')) {
                return;
            }
            console.warn('Peer connection error:', err.message);
        });

        peer.on('close', () => {
            // Clean up state when a peer connection closes
            setPeers(prev => prev.filter(p => p.socketId !== remoteSocketId));
            delete peersRef.current[remoteSocketId];
        });

        return peer;
    }

    const toggleCamera = async () => {
        if (!localStream) return;

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

        try {
            const videoTrack = localStream.getVideoTracks()[0];
            videoTrack.stop();

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: newFacingMode },
                audio: true
            });

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Re-assign audio track from old stream to keep same audio if needed 
            // (getUserMedia returns new audio track too so we can just use newStream's audio if we want, 
            // but usually we might want to keep the same audio track. Here we will use newStream entirely for simplicity or just replace video track)

            // Replace track in peer connections
            Object.keys(peersRef.current).forEach(peerId => {
                const peer = peersRef.current[peerId];
                const pc = (peer as any)._pc;
                if (pc) {
                    const sender = pc.getSenders().find((s: any) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(newVideoTrack).catch((err: any) => console.error("Track replacement failed", err));
                    }
                }
            });

            // Update local stream state - we keep old audio tracks or use new stream
            // Ideally we should compose a new stream with new video track + old audio track to avoid audio glitches
            const oldAudioTrack = localStream.getAudioTracks()[0];
            const composedStream = new MediaStream([newVideoTrack, oldAudioTrack]);

            setLocalStream(composedStream);
            localStreamRef.current = composedStream;

            if (userVideo.current) {
                userVideo.current.srcObject = composedStream;
            }

            setFacingMode(newFacingMode);
            setIsVideoOff(false);

        } catch (err) {
            console.error("Failed to toggle camera:", err);
        }
    };

    const setupAudioAnalysis = (stream: MediaStream) => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = context.createAnalyser();
            const source = context.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 512;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const update = () => {
                if (!mountedRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / bufferLength;
                setActiveSpeaker(avg > 35 ? 'self' : null);
                requestAnimationFrame(update);
            };
            update();
        } catch (e) { }
    };

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
            setIsMuted(!localStream.getAudioTracks()[0].enabled);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);

                // If we are turning video BACK ON, ensure the element is playing and source is correct
                if (videoTrack.enabled && userVideo.current) {
                    // Sometimes re-enabling a track needs a nudge
                    if (userVideo.current.srcObject !== localStream) {
                        userVideo.current.srcObject = localStream;
                    }
                    userVideo.current.play().catch(e => console.warn("Video play interrupted:", e));
                }
            }
        }
    };

    const toggleScreenShare = () => {
        if (!isSharing) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(screenStream => {
                    const screenTrack = screenStream.getVideoTracks()[0];

                    Object.keys(peersRef.current).forEach(peerId => {
                        const peer = peersRef.current[peerId];
                        const pc = (peer as any)._pc;
                        if (pc) {
                            const sender = pc.getSenders().find((s: any) => s.track?.kind === 'video');
                            if (sender) {
                                sender.replaceTrack(screenTrack).catch((err: any) => console.error("Track replacement failed", err));
                            }
                        }
                    });

                    if (userVideo.current) {
                        userVideo.current.srcObject = screenStream;
                    }

                    screenTrack.onended = () => {
                        stopScreenSharing();
                    };

                    setIsSharing(true);
                })
                .catch(err => {
                    console.error("Failed to share screen:", err);
                });
        } else {
            stopScreenSharing();
        }
    };

    const stopScreenSharing = () => {
        if (!localStreamRef.current) return;
        const videoTrack = localStreamRef.current.getVideoTracks()[0];

        Object.keys(peersRef.current).forEach(peerId => {
            const peer = peersRef.current[peerId];
            const pc = (peer as any)._pc;
            if (pc) {
                const sender = pc.getSenders().find((s: any) => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack).catch((err: any) => console.error("Track replacement failed", err));
                }
            }
        });

        if (userVideo.current) {
            userVideo.current.srcObject = localStreamRef.current;
        }

        setIsSharing(false);
    };

    const [focusedUser, setFocusedUser] = useState<string | null>(null);

    const toggleFocus = (id: string) => {
        if (focusedUser === id) {
            setFocusedUser(null);
        } else {
            setFocusedUser(id);
        }
    };

    // List of users that should be in the "floating" sidebar
    const sidebarIds = [
        'local',
        ...peers.map(p => p.socketId)
    ].filter(id => showWatchTogether ? true : id !== focusedUser); // In watch mode, everyone is in sidebar

    // New Helper for "WhatsApp-style" stacking
    // Fills RIGHT side first (up to 4), then LEFT side
    const getFloatingStyle = (index: number) => {
        // If not in focused mode AND not in watch mode, no floating style needed
        if (!focusedUser && !showWatchTogether) return {};

        const STACK_CAPACITY = 4;
        const isRightStack = index < STACK_CAPACITY;
        const stackIndex = index % STACK_CAPACITY;

        // Compact spacing: 
        // md:w-64 is approx 256px wide -> 144px height.
        // We use 154px step for a tight 10px gap.
        const topOffset = 24 + (stackIndex * 154);

        return {
            top: `${topOffset}px`,
            right: isRightStack ? '24px' : 'auto',
            left: isRightStack ? 'auto' : '296px', // 24px + 256px (width) + 16px (gap)
            zIndex: 50 + index,
        };
    };

    // Calculate layout positioning
    const getLayoutClasses = (id: string, index: number, isLocal: boolean) => {
        // Common base for sharpness
        const sharpTransition = "transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"; // "Ease Out Quint" feel

        // If WatchTogether is active, EVERYONE is floating
        if (showWatchTogether) {
            // Reduced width to md:w-64 to fit 4 in a stack comfortably
            const baseClasses = `absolute w-40 md:w-64 aspect-video rounded-xl shadow-2xl border border-white/10 ring-1 ring-black/20 video-container group bg-zinc-900 overflow-hidden ${sharpTransition} hover:scale-[1.02] hover:ring-purple-500/50 hover:shadow-purple-500/20`;
            return id === 'local' ? baseClasses : `cursor-pointer ${baseClasses}`;
        }

        if (!focusedUser) {
            // Grid Mode (Default)
            return cn(
                `video-container w-full h-full group ${sharpTransition} border border-white/5 relative bg-zinc-900 rounded-2xl overflow-hidden ring-1 ring-inset ring-white/5`,
                activeSpeaker === 'self' && isLocal && "ring-2 ring-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.15)]",
            );
        }

        if (focusedUser === id) {
            // Focused Mode (Full Screen)
            return `absolute inset-0 w-full h-full z-10 rounded-none border-0 video-container group bg-black ${sharpTransition} flex items-center justify-center`;
        }

        // Floating / Sidebar Mode (Default for focusedUser case)
        const baseClasses = `absolute w-40 md:w-64 aspect-video rounded-xl shadow-2xl border border-white/10 ring-1 ring-black/20 video-container group bg-zinc-900 overflow-hidden ${sharpTransition} hover:scale-[1.02] hover:ring-purple-500/50 hover:shadow-purple-500/20`;
        return id === 'local' ? baseClasses : `cursor-pointer ${baseClasses}`;
    };


    return (
        <div
            className="h-screen w-full bg-[#050505] flex flex-col overflow-hidden text-white font-sans selection:bg-purple-500/30"
            onClick={resetControlTimer}
            onMouseMove={resetControlTimer}
            onTouchStart={resetControlTimer}
        >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505] to-[#050505] pointer-events-none" />

            {/* Header/Nav for Room ID (Optional) */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-start pointer-events-none"
                    >
                        <div className="flex gap-4 pointer-events-auto">
                            <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg">
                                <span className={cn("w-2 h-2 rounded-full animate-pulse", socket.connected ? "bg-emerald-500" : "bg-yellow-500")} />
                                <span className="text-xs font-bold font-mono tracking-wider text-zinc-300">{roomId}</span>
                            </div>
                        </div>

                        {peers.length > 0 && (
                            <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg">
                                <Activity className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-xs font-bold text-zinc-300">{peers.length + 1} LIVE</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Watch Together Mode - YouTube Player takes center stage */}
            {showWatchTogether && (
                <div className="absolute inset-0 z-0 bg-black flex items-center justify-center p-4 md:p-12">
                    <WatchTogether socket={socket} roomId={roomId} isVisible={true} onClose={() => setShowWatchTogether(false)} syncedVideoId={globalVideoId} isEmbedded={true} />
                </div>
            )}

            <main className="flex-1 flex flex-col items-center justify-center p-0 md:p-0 relative overflow-hidden pointer-events-none">
                {/* Main content layer - Pointer events enabled ONLY for interactive children (videos) */}
                <div className={cn(
                    "w-full h-full relative transition-all duration-500 ease-out box-border",
                    !focusedUser && !showWatchTogether ? (
                        peers.length === 0 ? "p-4 md:p-8 grid grid-cols-1 md:max-w-4xl max-h-[80vh]" :
                            peers.length === 1 ? "p-4 md:p-8 flex flex-col md:grid md:grid-cols-2 gap-4 md:max-w-7xl max-h-[90vh]" :
                                "p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-4 md:max-w-7xl"
                    ) : "block" // In focused or WatchTogether mode, absolute positioning rules
                )}>
                    {/* Local Video */}
                    <motion.div
                        layout
                        style={(focusedUser || showWatchTogether)
                            ? getFloatingStyle(sidebarIds.indexOf('local'))
                            : {}
                        }
                        className={cn(getLayoutClasses('local', 0, true), "pointer-events-auto")} // Ensure clickable
                    >
                        {isVideoOff ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-md z-10">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center border border-white/10 shadow-inner mb-3"
                                >
                                    <span className="text-2xl font-bold text-zinc-400">{userName[0]}</span>
                                </motion.div>
                                <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase opacity-60">Camera Off</span>
                            </div>
                        ) : (
                            <video
                                playsInline
                                muted
                                ref={userVideo}
                                autoPlay
                                className={cn(
                                    "w-full h-full mirror",
                                    (focusedUser === 'local' && !showWatchTogether) ? "object-contain" : "object-cover"
                                )}
                            />
                        )}
                        <div className={cn(
                            "absolute z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/5 transition-all",
                            (focusedUser === 'local' && !showWatchTogether) ? "bottom-6 left-6" : "bottom-2 left-2"
                        )}>
                            <span className="text-[10px] font-bold text-white tracking-wide uppercase truncate max-w-[80px]">
                                {userName}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400 bg-white/10 px-1 rounded">YOU</span>
                            {isMuted && <MicOff className="w-3 h-3 text-red-500 ml-1" />}
                        </div>
                    </motion.div>

                    {/* Remote Videos */}
                    <AnimatePresence mode="popLayout">
                        {peers.map((p, idx) => {
                            // Calculate position in sidebar list
                            let positionIndex = -1;

                            // If watching together, EVERYONE is in the sidebar list (except maybe focused if we allow focus + watch? No, watch overrides)
                            // If focusedUser is set, that user is NOT in sidebar.
                            // If showWatchTogether is true, we want EVERYONE in sidebar.

                            if (showWatchTogether) {
                                // In watch mode, sidebarIds includes everyone.
                                positionIndex = sidebarIds.indexOf(p.socketId);
                            } else if (focusedUser && focusedUser !== p.socketId) {
                                positionIndex = sidebarIds.indexOf(p.socketId);
                            }

                            const style = positionIndex >= 0 ? getFloatingStyle(positionIndex) : {};

                            return (
                                <RemoteVideo
                                    p={p}
                                    key={p.socketId}
                                    index={idx}
                                    focusedUser={focusedUser}
                                    // In watch mode, clicking video toggles focus (which might hide watch together? or just overlay it?)
                                    // For now, let's say maximizing a user exits watch mode view temporarily or just overlays it.
                                    onToggleFocus={() => toggleFocus(p.socketId)}
                                    sidebarStyle={style}
                                    forceSidebar={showWatchTogether}
                                />
                            );
                        })}
                    </AnimatePresence>
                </div>
            </main>

            {/* Standard Control Panels */}
            <ControlBar
                isVisible={showControls}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                isSharing={isSharing}
                showChat={showChat}
                showWhiteboard={showWhiteboard}
                showWatchTogether={showWatchTogether}
                unreadCount={unreadMessages}
                onToggleMic={toggleMic}
                onToggleVideo={toggleVideo}
                onToggleFlip={toggleCamera}
                onToggleShare={toggleScreenShare}
                onToggleChat={() => setShowChat(!showChat)}
                onToggleWhiteboard={() => setShowWhiteboard(!showWhiteboard)}
                onToggleWatchTogether={() => setShowWatchTogether(!showWatchTogether)}
                onToggleSettings={() => setShowSettings(true)}
                onLeave={onLeave}
            />

            {/* Hidden elements container if needed in future */}

            <SettingsModal isVisible={showSettings} onClose={() => setShowSettings(false)} />
            <ChatPanel socket={socket} roomId={roomId} userName={userName} isVisible={showChat} onClose={() => setShowChat(false)} />
            <Whiteboard socket={socket} roomId={roomId} isVisible={showWhiteboard} onClose={() => setShowWhiteboard(false)} />
            {/* WatchTogether rendered in main layout above if active */}
        </div >
    );
}

function RemoteVideo({ p, index, focusedUser, onToggleFocus, sidebarStyle, forceSidebar }: {
    p: PeerState,
    index: number,
    focusedUser: string | null,
    onToggleFocus: () => void,
    sidebarStyle: any,
    forceSidebar?: boolean
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (videoRef.current && p.stream) {
            videoRef.current.srcObject = p.stream;
            videoRef.current.play().catch(e => console.error("Remote play error:", e));
        }
    }, [p.stream]);

    const isFocused = focusedUser === p.socketId;

    return (
        <motion.div
            layout
            style={(!isFocused && (focusedUser || forceSidebar)) ? sidebarStyle : {}}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
            className={cn(
                "video-container group overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] bg-zinc-900 pointer-events-auto ring-1 ring-inset ring-white/5",
                (!focusedUser && !forceSidebar)
                    ? "w-full h-full border border-white/5 relative rounded-2xl"
                    : isFocused
                        ? "absolute inset-0 w-full h-full z-10 rounded-none border-0"
                        : "absolute cursor-pointer w-40 md:w-64 aspect-video rounded-xl shadow-2xl border border-white/10 ring-1 ring-black/20 hover:ring-purple-500/50 hover:shadow-purple-500/20 hover:scale-[1.02]"
            )}
            onClick={() => onToggleFocus()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {!p.stream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md z-10">
                    <div className="relative flex items-center justify-center">
                        <div className="w-20 h-20 border-2 border-purple-500/10 rounded-full" />
                        <div className="absolute w-20 h-20 border-2 border-transparent border-t-purple-500 rounded-full animate-spin" />
                        <Activity className="absolute w-6 h-6 text-purple-500/40 animate-pulse" />
                    </div>
                    <p className="mt-8 text-[9px] font-black text-zinc-500 tracking-[0.4em] uppercase animate-pulse">Initializing Link</p>
                </div>
            ) : (
                <video
                    playsInline
                    ref={videoRef}
                    autoPlay
                    className={cn(
                        "w-full h-full",
                        (isFocused && !forceSidebar) ? "object-contain" : "object-cover"
                    )}
                />
            )}
            <div className={cn(
                "absolute z-20 flex items-center gap-3 glass-dark px-4 py-2 rounded-2xl border border-white/10 shadow-xl transition-all",
                isFocused ? "bottom-8 left-8" : "bottom-5 left-5",
                !isFocused && focusedUser && "scale-75 origin-bottom-left bottom-2 left-2 px-2 py-1"
            )}>
                <span className="text-[11px] font-black text-white/90 tracking-wide uppercase">
                    {p.userName === 'Remote User' ? `Partner ${index + 1}` : p.userName}
                </span>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFocus(); }}
                className="absolute top-3 right-3 z-30 p-2 glass rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:scale-110 active:scale-95"
            >
                <Maximize2 className="w-4 h-4 text-white" />
            </button>
        </motion.div>
    );
}

