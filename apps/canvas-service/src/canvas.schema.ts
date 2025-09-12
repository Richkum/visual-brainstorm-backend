// canvas.schema.ts
import { HydratedDocument, Schema, Types } from 'mongoose';

// DrawData schema for individual strokes/shapes
const DrawDataSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    type: {
      type: String,
      required: true,
      enum: ['line', 'rectangle', 'circle', 'text'],
    },
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    color: { type: String, required: true, default: '#000000' },
    points: { type: [Number], default: [] },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    text: { type: String, default: '' },
  },
  { _id: false }, // No separate _id for embedded documents
);

// Canvas schema for room-based canvas data
export const CanvasSchema = new Schema(
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
    strokes: { type: [DrawDataSchema], default: [] },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// TypeScript interfaces for type safety
export interface DrawData {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  color: string;
  points: number[];
  width: number;
  height: number;
  text: string;
}

export interface Canvas {
  roomId: string;
  name: string;
  creator: string;
  strokes: DrawData[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CanvasDocument = HydratedDocument<Canvas>;
export type DrawDataDocument = DrawData;