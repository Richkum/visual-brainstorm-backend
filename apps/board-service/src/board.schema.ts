import { HydratedDocument, Schema, model, Types } from "mongoose";

export enum BoardRole {
  OWNER = "owner",
  EDITOR = "editor",
  COMMENTER = "commenter",
  VIEWER = "viewer",
}

export enum InviteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  EXPIRED = "expired",
}

// 👥 Member Schema
const MemberSchema = new Schema(
  {
    userId: { type: String, required: true },
    email: { type: String, required: false },
    role: {
      type: String,
      enum: Object.values(BoardRole),
      default: BoardRole.VIEWER,
    },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: String },
  },
  { _id: false }
);

// 🔗 Public Link Schema
const PublicLinkSchema = new Schema(
  {
    token: { type: String, required: true },
    role: {
      type: String,
      enum: [BoardRole.VIEWER, BoardRole.COMMENTER],
      default: BoardRole.VIEWER,
    },
  },
  { _id: false }
);

// 📩 Invite Schema (for link-based invites)
const InviteSchema = new Schema(
  {
    email: { type: String },
    targetUserId: { type: String },
    role: {
      type: String,
      enum: [BoardRole.EDITOR, BoardRole.VIEWER, BoardRole.COMMENTER],
      default: BoardRole.VIEWER,
    },
    token: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(InviteStatus),
      default: InviteStatus.PENDING,
    },
    invitedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: true }
);

// 📬 Access Request Schema
const AccessRequestSchema = new Schema({
  userId: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  requestedRole: {
    type: String,
    enum: [BoardRole.VIEWER, BoardRole.COMMENTER, BoardRole.EDITOR],
    required: true,
  },
  message: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true });


// 🖼️ Board Schema
export const BoardSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    ownerEmail: { type: String, required: true },
    members: { type: [MemberSchema], default: [] },
    invites: { type: [InviteSchema], default: [] },
    publicLink: { type: PublicLinkSchema, default: null },
    isPublic: { type: Boolean, default: false },
    accessRequests: { type: [AccessRequestSchema], default: [] },
  },
  { timestamps: true }
);

// ======================
// Interfaces
// ======================
export interface BoardMember {
  userId: string;
  email?: string;
  role: BoardRole;
  joinedAt: Date;
  invitedBy?: string;
}

export interface BoardInvite {
  _id: Types.ObjectId;
  email?: string;
  targetUserId?: string;
  role: BoardRole.EDITOR | BoardRole.VIEWER | BoardRole.COMMENTER;
  token: string;
  status: InviteStatus;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface PublicLink {
  token: string;
  role: Exclude<BoardRole, BoardRole.OWNER>;
}

export interface AccessRequest {
  _id: Types.ObjectId;
  userId: string;
  requesterEmail?: string;
  requestedRole: BoardRole.VIEWER | BoardRole.COMMENTER | BoardRole.EDITOR;
  message?: string;
  status: "pending" | "approved" | "denied";
  createdAt: Date;
  updatedAt: Date;
}

export interface Board {
  title: string;
  slug: string;
  ownerId: string;
  ownerEmail: string;
  members: BoardMember[];
  invites: BoardInvite[];
  publicLink: PublicLink | null;
  accessRequests: AccessRequest[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BoardDocument = HydratedDocument<Board>;
export const BoardModel = model<Board>("Board", BoardSchema);
