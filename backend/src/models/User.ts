import mongoose, { Schema, Document } from 'mongoose';
import { User as IUser } from '@password-manager/shared/types';

export interface UserDocument extends Omit<IUser, 'userId'>, Document {
  _id: mongoose.Types.ObjectId;
  passwordVerifier: string; // Результат Argon2id KDF (base64)
  kdfParams: {
    algorithm: 'argon2id';
    memory: number;
    iterations: number;
    parallelism: number;
    salt: string; // base64
  };
  vaultKeyEnc: string; // VaultKey, зашифрованный PasswordKey (base64)
  vaultKeyEncIV: string; // IV для шифрования VaultKey (base64)
  totpSecretEnc?: string; // Зашифрованный TOTP секрет (base64)
  totpSecretEncIV?: string; // IV для шифрования TOTP секрета (base64)
  webauthnCredentials?: Array<{
    credId: string;
    publicKey: string;
    type: string;
    regDate: Date;
    counter?: number;
  }>;
}

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordVerifier: {
      type: String,
      required: true,
    },
    kdfParams: {
      algorithm: { type: String, required: true, enum: ['argon2id'] },
      memory: { type: Number, required: true },
      iterations: { type: Number, required: true },
      parallelism: { type: Number, required: true },
      salt: { type: String, required: true },
    },
    vaultKeyEnc: {
      type: String,
      required: true,
    },
    vaultKeyEncIV: {
      type: String,
      required: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    totpSecretEnc: {
      type: String,
      default: undefined,
    },
    totpSecretEncIV: {
      type: String,
      default: undefined,
    },
    webauthnCredentials: {
      type: [
        {
          credId: String,
          publicKey: String,
          type: String,
          regDate: Date,
          counter: Number,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        if (ret._id && typeof ret._id === 'object' && 'toString' in ret._id) {
          ret.userId = ret._id.toString();
        }
        delete ret._id;
        delete ret.__v;
        delete ret.passwordVerifier;
        delete ret.kdfParams;
        delete ret.vaultKeyEnc;
        delete ret.vaultKeyEncIV;
        delete ret.totpSecretEnc;
        delete ret.totpSecretEncIV;
        delete ret.webauthnCredentials;
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);

