"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    MessageSquare, Edit3, Youtube, PhoneOff, Settings,
    ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlBarProps {
    isMuted: boolean;
    isVideoOff: boolean;
    isSharing: boolean;
    showChat: boolean;
    showWhiteboard: boolean;
    showWatchTogether: boolean;
    onToggleMic: () => void;
    onToggleVideo: () => void;
    onToggleShare: () => void;
    onToggleChat: () => void;
    onToggleWhiteboard: () => void;
    onToggleWatchTogether: () => void;
    onLeave: () => void;
}

export default function ControlBar({
    isMuted, isVideoOff, isSharing, showChat,
    showWhiteboard, showWatchTogether,
    onToggleMic, onToggleVideo, onToggleShare, onToggleChat,
    onToggleWhiteboard, onToggleWatchTogether, onLeave
}: ControlBarProps) {

    const ControlButton = ({
        icon: Icon, active, onClick, danger, label
    }: {
        icon: any, active?: boolean, onClick: () => void, danger?: boolean, label: string
    }) => (
        <div className="relative group flex flex-col items-center">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                    active ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white",
                    danger && "bg-rose-600/90 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20"
                )}
            >
                <Icon className="w-5 h-5" />
            </motion.button>
            <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                <div className="bg-zinc-800 text-white text-xs py-1 px-3 rounded-lg shadow-xl border border-zinc-700 whitespace-nowrap">
                    {label}
                </div>
                <div className="w-2 h-2 bg-zinc-800 border-r border-b border-zinc-700 rotate-45 mx-auto -mt-1" />
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 glass rounded-[2rem] flex items-center gap-6 shadow-2xl"
        >
            <div className="flex items-center gap-3 pr-6 border-r border-zinc-700/50">
                <ControlButton
                    icon={isMuted ? MicOff : Mic}
                    active={!isMuted}
                    onClick={onToggleMic}
                    label={isMuted ? "Unmute" : "Mute"}
                />
                <ControlButton
                    icon={isVideoOff ? VideoOff : Video}
                    active={!isVideoOff}
                    onClick={onToggleVideo}
                    label={isVideoOff ? "Start Video" : "Stop Video"}
                />
            </div>

            <div className="flex items-center gap-3 px-6 border-r border-zinc-700/50">
                <ControlButton
                    icon={ScreenShare}
                    active={isSharing}
                    onClick={onToggleShare}
                    label="Share Screen"
                />
                <ControlButton
                    icon={Edit3}
                    active={showWhiteboard}
                    onClick={onToggleWhiteboard}
                    label="Whiteboard"
                />
                <ControlButton
                    icon={Youtube}
                    active={showWatchTogether}
                    onClick={onToggleWatchTogether}
                    label="Watch Together"
                />
                <ControlButton
                    icon={MessageSquare}
                    active={showChat}
                    onClick={onToggleChat}
                    label="Chat"
                />
            </div>

            <div className="pl-6 flex items-center gap-3">
                <ControlButton
                    icon={Settings}
                    onClick={() => { }}
                    label="Settings"
                />
                <ControlButton
                    icon={PhoneOff}
                    danger
                    onClick={onLeave}
                    label="Leave Meeting"
                />
            </div>
        </motion.div>
    );
}
