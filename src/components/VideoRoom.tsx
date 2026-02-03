"use client";

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

export default function VideoRoom({ roomId, userName, onLeave }: VideoRoomProps) {
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

    const userVideo = useRef<HTMLVideoElement>(null);
    const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

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

        const cleanup = () => {
            console.log('Cleaning up VideoRoom...');
            socket.off('all-users');
            socket.off('user-joined');
            socket.off('signal');
            socket.off('user-left');
            socket.off('connect');
            socket.disconnect();

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }

            Object.keys(peersRef.current).forEach(id => {
                peersRef.current[id].destroy();
                delete peersRef.current[id];
            });
            setPeers([]);
        };

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (!mountedRef.current) {
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
                        roomId,
                        userId: socket.id || `user-${Math.random().toString(36).substr(2, 9)}`,
                        userName
                    });
                };

                if (socket.connected) {
                    handleConnect();
                } else {
                    socket.on('connect', handleConnect);
                }

                socket.on('all-users', (usersArray: Array<{ socketId: string, userName: string }>) => {
                    if (!mountedRef.current) return;
                    console.log('Server reported existing users:', usersArray);
                    usersArray.forEach((user) => {
                        initializePeer(user.socketId, true, stream, user.userName);
                    });
                });

                socket.on('user-joined', (payload: { socketId: string; userName: string }) => {
                    if (!mountedRef.current) return;
                    console.log('New user joined room:', payload.socketId);
                    initializePeer(payload.socketId, false, stream, payload.userName);
                });

                socket.on('signal', (payload: { signal: any; from: string }) => {
                    if (!mountedRef.current) return;

                    const peer = peersRef.current[payload.from];

                    if (peer) {
                        // FIX: If we receive an OFFER but are already connected/stable, ignore it.
                        // This prevents "Failed to set local answer sdp: Called in wrong state: stable"
                        if (payload.signal.type === 'offer' && (peer as any)._pc?.signalingState === 'stable') {
                            console.log('Ignoring duplicate/redundant OFFER for stable peer:', payload.from);
                            return;
                        }

                        try {
                            if (!peer.destroyed) {
                                peer.signal(payload.signal);
                            }
                        } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            console.warn('Signal error:', message);
                        }
                    } else if (payload.signal.type === 'offer') {
                        // Only create a new peer if we receive an OFFER. 
                        // Receiving an answer/candidate for a non-existent peer is invalid.
                        console.log('Signal (OFFER) from unknown peer, initializing as non-initiator:', payload.from);
                        const newPeer = initializePeer(payload.from, false, localStreamRef.current!);
                        newPeer.signal(payload.signal);
                    } else {
                        console.warn(`Ignored orphaned signal (${payload.signal.type}) from ${payload.from}`);
                    }
                });

                socket.on('user-left', (payload: { socketId: string }) => {
                    if (!mountedRef.current) return;
                    console.log('User left, destroying peer:', payload.socketId);
                    if (peersRef.current[payload.socketId]) {
                        peersRef.current[payload.socketId].destroy();
                        delete peersRef.current[payload.socketId];
                    }
                    setPeers(prev => prev.filter(p => p.socketId !== payload.socketId));
                });

                setupAudioAnalysis(stream);

            } catch (err) {
                console.error("Initialization error:", err);
            }
        };

        init();

        return () => {
            mountedRef.current = false;
            cleanup();
        };
    }, [roomId]);

    function initializePeer(remoteSocketId: string, initiator: boolean, stream: MediaStream, remoteName?: string) {
        // Prevent double initialization
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
            console.error('Peer connection error:', err);
            if ((err as any).code === 'ERR_WEBRTC_SUPPORT') {
                console.error('WebRTC not supported');
            }
        });

        peer.on('close', () => {
            console.log('Peer connection closed:', remoteSocketId);
        });

        return peer;
    }

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
            localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
            setIsVideoOff(!localStream.getVideoTracks()[0].enabled);
        }
    };

    const toggleScreenShare = () => {
        if (!isSharing) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(screenStream => {
                    const screenTrack = screenStream.getVideoTracks()[0];

                    Object.keys(peersRef.current).forEach(peerId => {
                        const peer = peersRef.current[peerId];
                        // Replace video track in peer connection
                        // Simple Peer doesn't strictly expose replaceTrack in its types, so we use _pc (RTCPeerConnection)
                        const sender = (peer as any)._pc.getSenders().find((s: any) => s.track?.kind === 'video');
                        if (sender) {
                            sender.replaceTrack(screenTrack);
                        }
                    });

                    // Update local video view
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
            const sender = (peer as any)._pc.getSenders().find((s: any) => s.track?.kind === 'video');
            if (sender) {
                sender.replaceTrack(videoTrack);
            }
        });

        if (userVideo.current) {
            userVideo.current.srcObject = localStreamRef.current;
        }

        setIsSharing(false);
    };

    return (
        <div className="h-screen w-full bg-[#09090b] flex flex-col overflow-hidden text-white font-sans selection:bg-purple-500/30">
            {/* Room Info Overlay */}
            <div className="absolute top-8 left-8 z-30 flex items-center gap-4">
                <div className="glass px-4 py-2 rounded-2xl flex items-center gap-3 border-white/5 shadow-2xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">{roomId}</span>
                </div>
                <div className="glass px-4 py-2 rounded-2xl flex items-center gap-2 border-white/5 shadow-2xl">
                    <Activity className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs text-zinc-400 font-bold tracking-tight">{peers.length + 1} LIVE</span>
                </div>
            </div>

            <main className="flex-1 flex flex-col items-center justify-center px-8 py-24 relative overflow-hidden">
                {/* Visual Background Effects */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-purple-600/20 rounded-full blur-[180px] animate-pulse" />
                </div>

                <div className={cn(
                    "video-grid max-w-7xl h-full items-center justify-items-center relative transition-all duration-700 ease-in-out px-4",
                    peers.length === 0 ? "grid-cols-1" :
                        peers.length === 1 ? "grid-cols-2" :
                            "grid-cols-2 lg:grid-cols-3"
                )}>
                    {/* Local Video - Always first and premium */}
                    <motion.div
                        layout
                        className={cn(
                            "video-container w-full group transition-all duration-500 border-2 border-white/5",
                            activeSpeaker === 'self' && "border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.2)]"
                        )}
                    >
                        {isVideoOff ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/60 backdrop-blur-3xl z-10">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-28 h-28 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-full flex items-center justify-center border-4 border-white/10 shadow-2xl mb-6 ring-8 ring-white/5"
                                >
                                    <span className="text-5xl font-extrabold text-white uppercase tracking-tight drop-shadow-md">{userName[0]}</span>
                                </motion.div>
                                <span className="text-[10px] text-zinc-500 font-extrabold tracking-[0.4em] uppercase opacity-40">Camera Inactive</span>
                            </div>
                        ) : (
                            <video playsInline muted ref={userVideo} autoPlay className="w-full h-full object-cover mirror" />
                        )}
                        <div className="absolute bottom-5 left-5 z-20 flex items-center gap-3 glass-dark px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-white/90 tracking-wide uppercase">
                                    {userName}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-500 px-1.5 py-0.5 bg-white/5 rounded-md">YOU</span>
                            </div>
                            {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-500" />}
                        </div>
                    </motion.div>

                    {/* Remote Videos */}
                    <AnimatePresence mode="popLayout">
                        {peers.map((p, idx) => (
                            <RemoteVideo p={p} key={p.socketId} index={idx} />
                        ))}
                    </AnimatePresence>
                </div>
            </main>

            {/* Standard Control Panels */}
            <ControlBar
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                isSharing={isSharing}
                showChat={showChat}
                showWhiteboard={showWhiteboard}
                showWatchTogether={showWatchTogether}
                onToggleMic={toggleMic}
                onToggleVideo={toggleVideo}
                onToggleShare={toggleScreenShare}
                onToggleChat={() => setShowChat(!showChat)}
                onToggleWhiteboard={() => setShowWhiteboard(!showWhiteboard)}
                onToggleWatchTogether={() => setShowWatchTogether(!showWatchTogether)}
                onToggleSettings={() => setShowSettings(true)}
                onLeave={onLeave}
            />

            <div className="hidden">
                {/* Invisible trigger for settings from ControlBar until we refactor ControlBar to accept onToggleSettings directly if we must, 
                     but actually check ControlBar props. ControlBar HAS onToggleProp? 
                     Wait, ControlBar definition has onToggleMic, Video, Share, Chat, Whiteboard, WatchTogether, Leave. 
                     It DOES NOT have onToggleSettings in the Interface! I need to update ControlBar interface too.
                     OR, I can just hijacking one of the onclicks or passing it inline. 
                     Actually, ControlBar line 113 is onClick={() => { }}. 
                     I should update ControlBar first to accept onToggleSettings prop.
                  */}
            </div>

            <SettingsModal isVisible={showSettings} onClose={() => setShowSettings(false)} />
            <ChatPanel socket={socket} roomId={roomId} userName={userName} isVisible={showChat} onClose={() => setShowChat(false)} />
            <Whiteboard socket={socket} roomId={roomId} isVisible={showWhiteboard} onClose={() => setShowWhiteboard(false)} />
            <WatchTogether socket={socket} roomId={roomId} isVisible={showWatchTogether} onClose={() => setShowWatchTogether(false)} />
        </div>
    );
}

function RemoteVideo({ p, index }: { p: PeerState, index: number }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (p.stream && videoRef.current) {
            videoRef.current.srcObject = p.stream;
        }
    }, [p.stream]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 120, delay: index * 0.05 }}
            className="video-container w-full group overflow-hidden border-2 border-white/5"
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
                <video playsInline ref={videoRef} autoPlay className="w-full h-full object-cover" />
            )}
            <div className="absolute bottom-5 left-5 z-20 flex items-center gap-3 glass-dark px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
                <span className="text-[11px] font-black text-white/90 tracking-wide uppercase">
                    {p.userName === 'Remote User' ? `Partner ${index + 1}` : p.userName}
                </span>
            </div>
            <button className="absolute top-5 right-5 z-30 p-2.5 glass rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 scale-90 hover:scale-100">
                <Maximize2 className="w-4 h-4 text-white" />
            </button>
        </motion.div>
    );
}
