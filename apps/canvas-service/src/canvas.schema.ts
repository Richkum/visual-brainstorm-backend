import { HydratedDocument, Schema, model } from "mongoose";

export interface CanvasDocument {
  boardId: string;
  state: Buffer; // Stores the highly compressed binary state of the entire Y.Doc
  lastUpdate: Date;
}

export const CanvasSchema = new Schema<CanvasDocument>(
  {
    boardId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    state: {
      type: Buffer,
      required: true
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    },
  },
  { timestamps: true }
);

export type CanvasModelDocument = HydratedDocument<CanvasDocument>;
export const CanvasModel = model<CanvasDocument>("Canvas", CanvasSchema);