
export type CanvasElementType =
  | 'shape'
  | 'text'
  | 'image'
  | 'comment'
  | 'connector';

export interface CanvasElement {
  id: string; // unique ID in board
  type: CanvasElementType;

  // Position + size
  x: number;
  y: number;
  width?: number;
  height?: number;

  // Content (depends on type)
  text?: string;
  src?: string; // for image
  style?: Record<string, string>; // e.g., colors, font

  createdBy: { type: String, required: true };
  createdAt: Date;
  updatedAt: Date;
}