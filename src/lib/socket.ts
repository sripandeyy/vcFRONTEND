import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001').replace(/\/$/, '');

console.log('Connecting socket to:', SOCKET_URL);
export const socket: Socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
});
