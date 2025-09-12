import io, { Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {

      this.socket = io('http://localhost:3005');
      this.socket.on('connect', () => {
        console.log('Connected to socket service');
      });
      this.socket.on('disconnect', () => {
        console.log('Disconnected from socket service');
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinBoard(boardId: string, userId: string) {
    if (this.socket) {
      this.socket.emit('joinRoom', { roomId: boardId, userId });
    }
  }

  leaveBoard(boardId: string, userId: string) {
    if (this.socket) {
      this.socket.emit('leaveRoom', { roomId: boardId, userId });
    }
  }

  createBoard(roomId: string, name: string, creator: string) {
    if (this.socket) {
      this.socket.emit('createBoard', { roomId, name, creator });
    }
  }

  onBoardCreated(callback: (data: { roomId: string; name: string; creator: string }) => void) {
    if (this.socket) {
      this.socket.on('boardCreated', callback);
    }
  }

  offBoardCreated() {
    if (this.socket) {
      this.socket.off('boardCreated');
    }
  }

  sendDraw(boardId: string, drawData: any, userId: string) {
    if (this.socket) {
      this.socket.emit('draw', { roomId: boardId, drawData, userId });
    }
  }

  onDraw(callback: (data: { drawData: any; userId: string }) => void) {
    if (this.socket) {
      this.socket.on('draw', callback);
    }
  }

  offDraw() {
    if (this.socket) {
      this.socket.off('draw');
    }
  }

  sendElementAdd(boardId: string, element: any) {
    if (this.socket) {
      this.socket.emit('element:add', { boardId, element });
    }
  }

  sendElementUpdate(boardId: string, element: any) {
    if (this.socket) {
      this.socket.emit('element:update', { boardId, element });
    }
  }

  get socketInstance() {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;
