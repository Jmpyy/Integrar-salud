import { io } from 'socket.io-client';

// En producción esto debería apuntar a tu dominio, ej: 'https://socket.integrarsalud.me'
// Por ahora usa el puerto 3001 asumiendo que el server.js corre en la misma máquina
const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

// Opción autoConnect: false permite conectar solo cuando sea necesario
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
