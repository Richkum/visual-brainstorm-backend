// Frontend Socket Connection for Next.js
// Install socket.io-client: npm install socket.io-client

import { io } from 'socket.io-client';

// Socket connection utility
class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3005', {
      transports: ['websocket', 'polling'],
      upgrade: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    // Listen for brainstorm events
    this.socket.on('userJoined', (data) => {
      console.log('User joined:', data.userId);
    });

    this.socket.on('userLeft', (data) => {
      console.log('User left:', data.userId);
    });

    this.socket.on('message', (data) => {
      console.log('New message:', data);
    });

    this.socket.on('draw', (data) => {
      console.log('Draw event:', data);
    });

    this.socket.on('brainstormUpdated', (data) => {
      console.log('Brainstorm updated:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Room management
  joinRoom(roomId, userId) {
    if (this.socket) {
      this.socket.emit('joinRoom', { roomId, userId });
    }
  }

  leaveRoom(roomId, userId) {
    if (this.socket) {
      this.socket.emit('leaveRoom', { roomId, userId });
    }
  }

  // Chat functionality
  sendMessage(roomId, message, userId) {
    if (this.socket) {
      this.socket.emit('sendMessage', { roomId, message, userId });
    }
  }

  // Drawing functionality
  sendDrawData(roomId, drawData, userId) {
    if (this.socket) {
      this.socket.emit('draw', { roomId, drawData, userId });
    }
  }

  // Brainstorm updates
  updateBrainstorm(roomId, brainstormData, userId) {
    if (this.socket) {
      this.socket.emit('updateBrainstorm', { roomId, brainstormData, userId });
    }
  }

  // General message
  sendMessage(data) {
    if (this.socket) {
      this.socket.emit('message', data);
    }
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;

// Usage example in Next.js component:
/*
import { useEffect } from 'react';
import socketService from './path/to/frontend-socket-connection';

export default function MyComponent() {
  useEffect(() => {
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleJoinRoom = () => {
    socketService.joinRoom('room-123', 'user-456');
  };

  const handleSendMessage = () => {
    socketService.sendMessage('room-123', 'Hello everyone!', 'user-456');
  };

  return (
    <div>
      <button onClick={handleJoinRoom}>Join Room</button>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
}
*/
