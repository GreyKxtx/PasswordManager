/**
 * Общие типы для всех компонентов системы
 */
export interface User {
    userId: string;
    email: string;
    twoFactorEnabled: boolean;
    createdAt: Date;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
}
export interface LoginRequest {
    email: string;
    masterPassword: string;
    totpCode?: string;
}
export interface RegisterRequest {
    email: string;
    masterPassword: string;
    totpSetup?: boolean;
}
export interface VaultItem {
    itemId: string;
    userId: string;
    type: 'password' | 'note' | 'card';
    data: string;
    folder?: string;
    tags?: string[];
    version: number;
    createdAt: Date;
    updatedAt: Date;
    lastModified: Date;
}
export interface VaultItemDecrypted {
    itemId: string;
    title: string;
    login?: string;
    password?: string;
    url?: string;
    note?: string;
    customFields?: Record<string, string>;
    folder?: string;
    tags?: string[];
    version: number;
    createdAt: Date;
    updatedAt: Date;
    lastModified: Date;
}
export interface VaultItemCreate {
    data: string;
    folder?: string;
    tags?: string[];
}
export interface RegisterCryptoData {
    email: string;
    passwordVerifier: string;
    kdfParams: KeyDerivationParams;
    vaultKeyEnc: string;
    vaultKeyEncIV: string;
}
export interface LoginCryptoData {
    email: string;
    passwordVerifier: string;
}
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    vaultKeyEnc: string;
    vaultKeyEncIV: string;
    user: User;
}
export interface Session {
    sessionId: string;
    userId: string;
    device: string;
    ip: string;
    userAgent: string;
    createdAt: Date;
    lastActiveAt: Date;
    current: boolean;
}
export interface TOTPSetup {
    secret: string;
    qrCode: string;
}
export interface WebAuthnCredential {
    credId: string;
    publicKey: string;
    type: string;
    regDate: Date;
}
export type AuditAction = 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'USER_REGISTERED' | 'PASSWORD_CHANGED' | '2FA_ENABLED' | '2FA_DISABLED' | 'ITEM_CREATE' | 'ITEM_UPDATE' | 'ITEM_DELETE' | 'VAULT_EXPORTED' | 'VAULT_IMPORTED';
export interface AuditLog {
    logId: string;
    userId: string | null;
    action: AuditAction;
    timestamp: Date;
    details: Record<string, any>;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface EncryptionResult {
    ciphertext: string;
    iv: string;
    tag: string;
}
export interface KeyDerivationParams {
    algorithm: 'argon2id';
    memory: number;
    iterations: number;
    parallelism: number;
    salt: string;
}
export interface VaultKeyInfo {
    vaultKey: Uint8Array;
    passwordKey: Uint8Array;
}
export interface PasswordChangeData {
    oldPasswordVerifier: string;
    newPasswordVerifier: string;
    newKdfParams: KeyDerivationParams;
    newVaultKeyEnc: string;
    newVaultKeyEncIV: string;
}
//# sourceMappingURL=index.d.ts.map