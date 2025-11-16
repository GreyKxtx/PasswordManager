import mongoose, { Schema, Document } from 'mongoose';

export interface VaultItemDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string; // Незашифрованный, для UX и поиска
  username?: string; // Опционально в открытом виде
  url?: string;
  tags?: string[];
  encryptedData: string; // base64 шифротекста (JSON с паролем и прочим)
  iv: string; // base64 IV для AES-GCM
  version: number; // Для конфликтов и синхронизации
  createdAt: Date;
  updatedAt: Date;
}

const VaultItemSchema = new Schema<VaultItemDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    encryptedData: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true, // createdAt и updatedAt автоматически
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        if (ret._id && typeof ret._id === 'object' && 'toString' in ret._id) {
          ret.id = ret._id.toString();
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
VaultItemSchema.index({ userId: 1, updatedAt: -1 }); // Сортировка по дате обновления
VaultItemSchema.index({ userId: 1, tags: 1 }); // Поиск по тегам
VaultItemSchema.index({ userId: 1, title: 'text' }); // Текстовый поиск по названию

export const VaultItemModel = mongoose.model<VaultItemDocument>('VaultItem', VaultItemSchema);

