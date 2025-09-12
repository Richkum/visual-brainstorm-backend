import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SocketDocument = SocketConnection & Document;

@Schema({ timestamps: true })
export class SocketConnection {
  @Prop({ required: true })
  socketId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: [String], default: [] })
  rooms: string[];

  @Prop({ default: true })
  isConnected: boolean;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const SocketSchema = SchemaFactory.createForClass(SocketConnection);
