export interface RoomState {
  id: string;
  video: string | null;
  time: number;
  isPlaying: boolean;
  users: User[];
  chat: ChatMessage[];
}

export interface User {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}
