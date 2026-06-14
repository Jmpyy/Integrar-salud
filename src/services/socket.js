import { io } from 'socket.io-client';

// URL base para el websocket
// En producción usa el mismo dominio de la web (Nginx lo redirige) si no hay variable de entorno.
const SOCKET_URL = import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');

// Opción autoConnect: false permite conectar solo cuando sea necesario
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: true,
});
