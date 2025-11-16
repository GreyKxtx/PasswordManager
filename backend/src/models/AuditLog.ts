import mongoose, { Schema, Document } from 'mongoose';

export type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'login_2fa_required'
  | 'login_2fa_failed'
  | 'logout'
  | 'register'
  | 'password_change'
  | 'vault_item_created'
  | 'vault_item_updated'
  | 'vault_item_deleted'
  | 'session_revoked'
  | 'session_revoked_all'
  | 'token_refresh'
  | 'unauthorized_access'
  | 'security_settings_changed'
  | 'totp_setup_started'
  | 'totp_enabled'
  | 'totp_enable_failed'
  | 'totp_disabled'
  | 'totp_disable_failed';

export interface AuditLogDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // null для событий без пользователя (например, неудачный вход)
  eventType: AuditEventType;
  description: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>; // Дополнительные данные события
  createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'login_success',
        'login_failed',
        'login_2fa_required',
        'login_2fa_failed',
        'logout',
        'register',
        'password_change',
        'vault_item_created',
        'vault_item_updated',
        'vault_item_deleted',
        'session_revoked',
        'session_revoked_all',
        'token_refresh',
        'unauthorized_access',
        'security_settings_changed',
        'totp_setup_started',
        'totp_enabled',
        'totp_enable_failed',
        'totp_disabled',
        'totp_disable_failed',
      ],
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // createdAt автоматически
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        if (ret._id && typeof ret._id === 'object' && 'toString' in ret._id) {
          ret.logId = ret._id.toString();
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

// Индексы для быстрого поиска
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ eventType: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);

