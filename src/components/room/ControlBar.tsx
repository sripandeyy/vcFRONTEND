"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    MessageSquare, Edit3, Youtube, PhoneOff, Settings,
    ChevronUp, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlBarProps {
    isVisible?: boolean;
    isMuted: boolean;
    isVideoOff: boolean;
    isSharing: boolean;
    showChat: boolean;
    showWhiteboard: boolean;
    showWatchTogether: boolean;
    unreadCount?: number;
    onToggleMic: () => void;
    onToggleVideo: () => void;
    onToggleFlip: () => void;
    onToggleShare: () => void;
    onToggleChat: () => void;
    onToggleWhiteboard: () => void;
    onToggleWatchTogether: () => void;
    onToggleSettings: () => void;
    onLeave: () => void;
}

export default function ControlBar({
    isVisible = true,
    isMuted, isVideoOff, isSharing, showChat,
    showWhiteboard, showWatchTogether, unreadCount = 0,
    onToggleMic, onToggleVideo, onToggleShare, onToggleChat,
    onToggleWhiteboard, onToggleWatchTogether, onToggleSettings, onLeave, onToggleFlip
}: ControlBarProps) {

    const ControlButton = ({
        icon: Icon, active, onClick, danger, label, badge
    }: {
        icon: any, active?: boolean, onClick: () => void, danger?: boolean, label: string, badge?: number
    }) => (
        <div className="relative group flex flex-col items-center">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                    active ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white",
                    danger && "bg-rose-600/90 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20"
                )}
            >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                {badge && badge > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-900 animate-pulse">
                        {badge > 9 ? '9+' : badge}
                    </div>
                )}
            </motion.button>
            <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 pointer-events-none hidden md:block">
                <div className="bg-zinc-800 text-white text-xs py-1 px-3 rounded-lg shadow-xl border border-zinc-700 whitespace-nowrap">
                    {label}
                </div>
                <div className="w-2 h-2 bg-zinc-800 border-r border-b border-zinc-700 rotate-45 mx-auto -mt-1" />
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-md rounded-3xl p-2 md:p-3 shadow-2xl border border-zinc-700 flex items-center justify-center space-x-2 md:space-x-4 z-50"
                >
                    <div className="flex items-center gap-2 md:gap-3 pr-2 md:pr-6 border-r border-zinc-700/50">
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
                            label={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                        />
                        {/* Mobile only or always visible depending on preference - usually mobile only for flip */}
                        <div className="md:hidden">
                            <ControlButton
                                icon={RefreshCw}
                                onClick={onToggleFlip}
                                label="Flip Camera"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 px-2 md:px-6 border-r border-zinc-700/50">
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
                            badge={!showChat ? unreadCount : 0}
                        />
                    </div>


                    <div className="pl-2 md:pl-6 flex items-center gap-2 md:gap-3">
                        <ControlButton
                            icon={Settings}
                            onClick={onToggleSettings}
                            label="Settings"
                        />
                        <ControlButton
                            icon={PhoneOff}
                            danger
                            onClick={onLeave}
                            label="Leave"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
