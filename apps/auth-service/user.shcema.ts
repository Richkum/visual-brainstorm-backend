// user.schema.ts
import { HydratedDocument, Schema, Types } from 'mongoose';

const SessionSchema = new Schema({
  refreshTokenHash: { type: String, required: true },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { _id: true });

export const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    trim: false,
    match: [/^[a-zA-Z0-9 ]{3,30}$/, 'Username must be 3-30 characters.'],
  },
  displayName: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  profileColor: { type: String, default: '#6c5ce7' },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address.'],
  },

  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },

  verificationCode: { type: String, default: '' },
  verificationCodeExpires: { type: Date, default: null },

  // sessions
  sessions: { type: [SessionSchema], default: [] },

  // optional convenience: list of owned boards (denormalized)
  ownedBoards: [{ type: Types.ObjectId, ref: 'Board' }],
}, { timestamps: true });

export interface User {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  profileColor?: string;
  email: string;
  password: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date | null;
  sessions: Array<{
    _id?: Types.ObjectId;
    refreshTokenHash: string;
    ip?: string;
    userAgent?: string;
    createdAt: Date;
    expiresAt: Date;
  }>;
  ownedBoards?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
