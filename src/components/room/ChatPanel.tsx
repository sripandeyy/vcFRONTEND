"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    sender: string;
    text: string;
    socketId: string;
    timestamp: string;
}

interface ChatPanelProps {
    socket: any;
    roomId: string;
    userName: string;
    isVisible: boolean;
    onClose: () => void;
}

export default function ChatPanel({ socket, roomId, userName, isVisible, onClose }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;
        socket.on('receive-message', (message: Message) => {
            setMessages(prev => [...prev, message]);
        });
        return () => socket.off('receive-message');
    }, [socket]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const message = {
            sender: userName,
            text: inputText,
            socketId: socket.id,
        };

        socket.emit('send-message', { roomId, message });
        setInputText('');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-24 bottom-24 right-6 w-96 glass rounded-[2rem] z-40 flex flex-col overflow-hidden shadow-2xl"
                >
                    <div className="p-6 border-b border-zinc-700/50 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">In-call Messages</h3>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
                    >
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center px-4">
                                <div className="p-4 bg-zinc-800/50 rounded-full mb-4">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-medium">No messages yet</p>
                                <p className="text-xs mt-1">Messages sent during the call are visible to everyone.</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex flex-col max-w-[85%]",
                                    msg.socketId === socket.id ? "ml-auto items-end" : "items-start"
                                )}
                            >
                                <span className="text-[10px] text-zinc-500 mb-1 px-1">
                                    {msg.sender === userName ? "You" : msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className={cn(
                                    "px-4 py-3 rounded-2xl text-sm",
                                    msg.socketId === socket.id
                                        ? "bg-purple-600 text-white rounded-tr-none"
                                        : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700/50"
                                )}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-zinc-700/50">
                        <form onSubmit={sendMessage} className="relative">
                            <input
                                type="text"
                                placeholder="Send a message..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function MessageSquare(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}
