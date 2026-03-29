"use client";

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pencil, Eraser, Trash2, Undo,
    Square, Circle, Minus, Type,
    X, Maximize2, Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhiteboardProps {
    socket: any;
    roomId: string;
    isVisible: boolean;
    onClose: () => void;
}

export default function Whiteboard({ socket, roomId, isVisible, onClose }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#8b5cf6');
    const [pencilSize, setPencilSize] = useState(3);
    const [eraserSize, setEraserSize] = useState(20);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');

    const size = tool === 'pencil' ? pencilSize : eraserSize;

    const setSize = (newSize: number) => {
        if (tool === 'pencil') setPencilSize(newSize);
        else setEraserSize(newSize);
    };

    useEffect(() => {
        if (!isVisible || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                // Keep drawing data
                const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                ctx.putImageData(temp, 0, 0);
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const handleRemoteDraw = (data: any) => {
            if (!ctx) return;
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.size;
            ctx.globalCompositeOperation = data.tool === 'eraser' ? 'destination-out' : 'source-over';

            ctx.beginPath();
            ctx.moveTo(data.prevPos.x, data.prevPos.y);
            ctx.lineTo(data.currentPos.x, data.currentPos.y);
            ctx.stroke();
        };

        socket.on('whiteboard-draw', handleRemoteDraw);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            socket.off('whiteboard-draw', handleRemoteDraw);
        };
    }, [isVisible, socket]);

    const [prevPos, setPrevPos] = useState({ x: 0, y: 0 });

    const onMouseDown = (e: React.MouseEvent) => {
        const { offsetX, offsetY } = e.nativeEvent;
        setIsDrawing(true);
        setPrevPos({ x: offsetX, y: offsetY });
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !canvasRef.current) return;

        const { offsetX, offsetY } = e.nativeEvent;
        const currentPos = { x: offsetX, y: offsetY };
        const ctx = canvasRef.current.getContext('2d');

        if (ctx) {
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

            ctx.beginPath();
            ctx.moveTo(prevPos.x, prevPos.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();

            // Emit to others
            socket.emit('whiteboard-draw', {
                roomId,
                data: {
                    prevPos,
                    currentPos,
                    color,
                    size,
                    tool,
                }
            });

            setPrevPos(currentPos);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            // Optional: emit clear action
        }
    };

    const colors = ['#ffffff', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-12 pointer-events-none"
                >
                    <div className="w-full h-full glass rounded-[2.5rem] relative flex flex-col pointer-events-auto border-2 border-purple-500/20 shadow-3xl">
                        {/* Toolbar Top */}
                        <div className="p-6 flex items-center justify-between border-b border-zinc-700/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-600/10 rounded-2xl">
                                    <Edit3 className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Collaborative Whiteboard</h3>
                                    <p className="text-xs text-zinc-500">Draw together in real-time</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-rose-600 text-white rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Canvas Area */}
                        <div className="flex-1 relative bg-zinc-950/20 backdrop-blur-sm cursor-crosshair overflow-hidden">
                            <canvas
                                ref={canvasRef}
                                onMouseDown={onMouseDown}
                                onMouseMove={onMouseMove}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                className="w-full h-full block"
                            />
                        </div>

                        {/* Floating Pallete */}
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 p-4 glass rounded-3xl border border-zinc-700/50">
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setTool('pencil')}
                                    className={cn(
                                        "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                                        tool === 'pencil' ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                                    )}
                                    title="Pencil"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setTool('eraser')}
                                    className={cn(
                                        "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                                        tool === 'eraser' ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                                    )}
                                    title="Eraser"
                                >
                                    <Eraser className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="h-px w-6 bg-zinc-700/50" />

                            {/* Size Slider */}
                            <div className="h-24 w-6 flex items-center justify-center my-1 relative group">
                                <input
                                    type="range"
                                    min="2"
                                    max={tool === 'eraser' ? 100 : 30}
                                    value={size}
                                    onChange={(e) => setSize(Number(e.target.value))}
                                    className="w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer -rotate-90 hover:bg-zinc-600 transition-colors accent-purple-500"
                                />
                                {/* Tooltip for Size */}
                                <div className="absolute left-10 top-1/2 -translate-y-1/2 bg-black/80 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    Size: {size}px
                                </div>
                            </div>

                            <div className="h-px w-6 bg-zinc-700/50" />

                            <div className="flex flex-col gap-2">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => { setColor(c); setTool('pencil'); }}
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                            color === c && tool === 'pencil' ? "border-white" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>

                            <div className="h-px w-6 bg-zinc-700/50" />

                            <button
                                onClick={clearCanvas}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-800/50 hover:bg-rose-600/20 text-rose-500 rounded-xl transition-all"
                                title="Clear Canvas"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Edit3(props: any) {
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
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    );
}
