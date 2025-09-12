// chat.schema.ts
import { HydratedDocument, Schema, Types } from 'mongoose';

// ChatMessage schema for individual messages
const ChatMessageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    roomId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['message', 'system', 'join', 'leave'],
      default: 'message'
    },
  },
  { _id: false }, // No separate _id for embedded documents
);

// ChatRoom schema for room-based chat data
export const ChatSchema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    creator: {
      type: String,
      required: true,
      trim: true,
    },
    messages: { type: [ChatMessageSchema], default: [] },
    lastActivity: { type: Date, default: Date.now },
    participantCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// TypeScript interfaces for type safety
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'join' | 'leave';
}

export interface ChatRoom {
  roomId: string;
  name: string;
  creator: string;
  messages: ChatMessage[];
  lastActivity: Date;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatDocument = HydratedDocument<ChatRoom>;
export type ChatMessageDocument = ChatMessage;
