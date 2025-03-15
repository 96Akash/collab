import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
    };
    
    const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', options);
    
    return new Promise((resolve) => {
        socket.on('connect', () => {
            resolve(socket);
        });
    });
};