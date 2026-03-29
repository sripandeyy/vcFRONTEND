import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Shield, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Admin panel overlay
export default function AdminPanel({ onClose }: { onClose: () => void }) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}api/admin/users`);
                const data = await res.json();
                if (data.success) {
                    setUsers(data.users);
                }
            } catch (err) {
                console.error("Failed to load users", err);
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl">
                            <Shield className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
                            <p className="text-xs text-zinc-400">Manage registered users & their statuses.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                    {loading ? (
                        <p className="text-zinc-500 text-center py-8 text-sm">Loading database records...</p>
                    ) : (
                        <div className="space-y-4">
                            {users.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8 text-sm">No users found.</p>
                            ) : (
                                <div className="divide-y divide-zinc-800/50">
                                    {users.map(u => (
                                        <div key={u._id} className="py-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                                    <Users className="w-4 h-4 text-zinc-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-zinc-200">{u.name || 'Anonymous User'}</p>
                                                    <p className="text-xs font-mono text-zinc-500">{u.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 justify-end">
                                                    <Clock className="w-3 h-3" />
                                                    Joined: {new Date(u.createdAt).toLocaleDateString()}
                                                </div>
                                                <span className={cn(
                                                    "inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase rounded tracking-wider",
                                                    u.isEmailVerified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-500"
                                                )}>
                                                    {u.isEmailVerified ? 'Verified' : 'Unverified'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
