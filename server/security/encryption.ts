/**
 * GRT智能系统 - 数据加密服务
 * 提供敏感数据的加密、解密和哈希功能
 */

import crypto from "crypto";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("encryption");

// 加密配置
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

// 从环境变量获取主密钥（生产环境应使用HSM或密钥管理服务）
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: ENCRYPTION_MASTER_KEY is not set.");
    }
    log.warn("ENCRYPTION_MASTER_KEY not set — using insecure dev default");
    return "grt-dev-only-insecure-default-key-32ch";
  }
  return key;
}
const MASTER_KEY = getMasterKey();

/**
 * 从主密钥派生加密密钥
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(MASTER_KEY, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * 加密敏感数据
 * @param plaintext 明文数据
 * @returns 加密后的数据（Base64编码）
 */
export function encrypt(plaintext: string): string {
  try {
    // 生成随机盐和IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // 派生密钥
    const key = deriveKey(salt);
    
    // 创建加密器
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // 加密数据
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 获取认证标签
    const authTag = cipher.getAuthTag();
    
    // 组合：salt + iv + authTag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    log.error({ err: error }, "Failed to encrypt data");
    throw new Error('Encryption failed');
  }
}

/**
 * 解密敏感数据
 * @param ciphertext 加密数据（Base64编码）
 * @returns 解密后的明文
 */
export function decrypt(ciphertext: string): string {
  try {
    // 解码Base64
    const combined = Buffer.from(ciphertext, 'base64');
    
    // 提取各部分
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    // 派生密钥
    const key = deriveKey(salt);
    
    // 创建解密器
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // 解密数据
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    log.error({ err: error }, "Failed to decrypt data");
    throw new Error('Decryption failed - data may be corrupted or tampered');
  }
}

/**
 * 使用Argon2id算法哈希密码（推荐用于密码存储）
 * 注意：需要安装argon2包，这里使用PBKDF2作为后备
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512');
  return `pbkdf2:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [algorithm, saltHex, hashHex] = hashedPassword.split(':');
    
    if (algorithm !== 'pbkdf2') {
      throw new Error('Unsupported hash algorithm');
    }
    
    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    const actualHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512');
    
    return crypto.timingSafeEqual(expectedHash, actualHash);
  } catch (error) {
    log.error({ err: error }, "Password verification failed");
    return false;
  }
}

/**
 * 生成安全的随机令牌
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成TOTP密钥（用于MFA）
 */
export function generateTOTPSecret(): string {
  // 生成20字节的随机密钥，Base32编码
  const secret = crypto.randomBytes(20);
  return base32Encode(secret);
}

/**
 * Base32编码
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (const byte of Array.from(buffer)) {
    value = (value << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  
  return result;
}

/**
 * 验证TOTP令牌
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const counter = Math.floor(Date.now() / 30000);
  
  for (let i = -window; i <= window; i++) {
    const expectedToken = generateTOTPToken(secret, counter + i);
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
      return true;
    }
  }
  
  return false;
}

/**
 * 生成TOTP令牌
 */
function generateTOTPToken(secret: string, counter: number): string {
  // Base32解码密钥
  const key = base32Decode(secret);
  
  // 将计数器转换为8字节大端序
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  
  // 计算HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();
  
  // 动态截断
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = 
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  
  // 生成6位数字
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Base32解码
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const lookup: Record<string, number> = {};
  for (let i = 0; i < alphabet.length; i++) {
    lookup[alphabet[i]] = i;
  }
  
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  
  for (const char of encoded.toUpperCase()) {
    if (!(char in lookup)) continue;
    
    value = (value << 5) | lookup[char];
    bits += 5;
    
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  
  return Buffer.from(bytes);
}

/**
 * 生成备份码（用于MFA恢复）
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 生成8位随机数字
    const code = crypto.randomInt(10000000, 99999999).toString();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * 计算数据指纹（用于完整性验证）
 */
export function calculateFingerprint(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 生成HMAC签名（用于API请求签名）
 */
export function generateHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * 验证HMAC签名
 */
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHMAC(data, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * 数据脱敏工具类
 */
export const DataMasking = {
  /**
   * 脱敏手机号
   */
  phone(value: string): string {
    if (!value || value.length < 7) return value;
    return value.replace(/(\d{3})\d{4}(\d+)/, '$1****$2');
  },
  
  /**
   * 脱敏邮箱
   */
  email(value: string): string {
    if (!value || !value.includes('@')) return value;
    const [local, domain] = value.split('@');
    const maskedLocal = local.length > 2 
      ? local.slice(0, 2) + '***' 
      : local[0] + '***';
    return `${maskedLocal}@${domain}`;
  },
  
  /**
   * 脱敏身份证号
   */
  idCard(value: string): string {
    if (!value || value.length < 10) return value;
    return value.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  },
  
  /**
   * 脱敏银行卡号
   */
  bankCard(value: string): string {
    if (!value || value.length < 8) return value;
    return value.replace(/\d(?=\d{4})/g, '*');
  },
  
  /**
   * 脱敏姓名
   */
  name(value: string): string {
    if (!value || value.length < 2) return value;
    if (value.length === 2) return value[0] + '*';
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
  },
  
  /**
   * 脱敏地址
   */
  address(value: string): string {
    if (!value || value.length < 10) return value;
    return value.slice(0, 6) + '****' + value.slice(-4);
  },
  
  /**
   * 脱敏金额（降低精度）
   */
  amount(value: number, precision: number = 1000): number {
    return Math.round(value / precision) * precision;
  },
  
  /**
   * 添加噪声（用于技术参数）
   */
  addNoise(value: number, noisePercent: number = 10): number {
    const noise = (Math.random() - 0.5) * 2 * (noisePercent / 100);
    return value * (1 + noise);
  },
};
