import mongoose, { Schema, Document } from 'mongoose';

export interface SessionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  jti: string; // JWT ID (уникальный идентификатор токена)
  deviceId?: string; // Идентификатор устройства
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date;
}

const SessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    ip: {
      type: String,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true, // createdAt автоматически
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        if (ret._id && typeof ret._id === 'object' && 'toString' in ret._id) {
          ret.sessionId = ret._id.toString();
        }
        if (ret.userId && typeof ret.userId === 'object' && 'toString' in ret.userId) {
          ret.userId = ret.userId.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Индекс для быстрого поиска активных сессий пользователя
SessionSchema.index({ userId: 1, revokedAt: 1 });

export const SessionModel = mongoose.model<SessionDocument>('Session', SessionSchema);

