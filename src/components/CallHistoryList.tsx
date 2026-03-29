import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Clock, Hash, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface CallLog {
    _id: string;
    roomId: string;
    joinedAt: string;
}

export default function CallHistoryList({ onJoinRoom }: { onJoinRoom: (roomId: string) => void }) {
    const { data: session } = useSession();
    const [history, setHistory] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const email = session?.user?.email;
        if (!email) return;

        const fetchHistory = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}api/history?email=${email}`);
                const data = await res.json();
                if (data.success) {
                    setHistory(data.history);
                }
            } catch (err) {
                console.error("Failed to load history", err);
            }
            setLoading(false);
        };
        fetchHistory();
    }, [session?.user?.email]);

    if (!session) return null;

    if (loading) {
        return (
            <div className="mt-8 pt-6 border-t border-zinc-800">
                <p className="text-sm text-zinc-500 text-center animate-pulse">Loading previous calls...</p>
            </div>
        );
    }

    if (history.length === 0) return null;

    return (
        <div className="mt-6 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Recent Calls
                </h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                {history.map((log) => (
                    <motion.div
                        key={log._id}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }}
                        onClick={() => onJoinRoom(log.roomId)}
                        className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 cursor-pointer group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500 transition-colors">
                                <Phone className="w-3 h-3 text-purple-400 group-hover:text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-200 flex items-center gap-1">
                                    <Hash className="w-3 h-3 text-zinc-500" /> {log.roomId}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                    {new Date(log.joinedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                            </div>
                        </div>
                        <div className="p-1.5 opacity-0 group-hover:opacity-100 bg-zinc-800 rounded flex items-center justify-center transition-opacity">
                            <span className="text-[10px] font-bold text-zinc-400 px-1">REJOIN</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
