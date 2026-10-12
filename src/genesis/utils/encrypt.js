/**
 * SM2加密工具函数
 * 使用国密SM2算法进行公钥加密
 * @param plaintext - 明文
 * @returns 加密后的密文
 */
export function sm2Encrypt(plaintext: string): string {
  try {
    // 第三个参数：true=C1C2C3，false=C1C3C2
    // 第4个参数 0 = 输出hex字符串（必须和后端统一）
    const SM2_PUBLIC_KEY =
      '04fad7ab1f88086b4ca719b371525b3ef12d265eee2de3187201e0197a66f5f8c6d3f160cd21092f348e8ccc5c6c8edf50b134db79979396f70a08f4497d3237fb';
    const ciphertext = sm2.doEncrypt(plaintext, SM2_PUBLIC_KEY, true, 0);
    return ciphertext;
  } catch (error: any) {
    console.error('SM2加密失败：', error);
    throw new Error('SM2加密失败');
  }
}

/**
 * 密码加密（SM2）
 * 使用内置公钥对密码进行SM2加密，统一项目中所有密码加密入口
 * @param password - 明文密码
 * @returns SM2加密后的密文（hex字符串）
 */
export function encryptPassword(password: string): string {
  /** SM2加密公钥（后端提供） */
  if (!password) return password;
  return sm2Encrypt(password);
}
/** URL报表地址解密公钥（后端提供，RSA-2048，base64 DER 格式） */
const URL_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAql+uuYbDpOHbIjXBWIjL93liwOCvpMHh5dPUZs1x09BHBWeshUQchJeIJb2LHSvFZvoQF/gI5kv25yg3TyE4ogfZ4PQ5Pxj+iefGgGeRbdps427G8CsxJGAJDfD41A5zLo0bm661cnJ6SM9ySHicJ9VTCtdTMnek72O23bsIu2aunh4XPTaeJ0q5nCpF7Yl4zwfC/OvX5gqAtJLwtKGsHQw2DtqVeAbMZByD4hdRqtkM8ImoORrsIhZ+VrsPKIZK6TummgMt7ECFovZNvInMWI0A3BU5SLKlcTv2OWpqaeK8AK3wvnpdg3J44O4MyQhDQx7LQn+DdGGocfPfpg8ddwIDAQAB';

/**
 * 将Base64公钥转换为PEM格式
 * @param key - base64 编码的公钥字符串
 * @returns PEM 格式公钥
 */
function getPublicKeyPem(key: string): string {
  // 每64个字符换行
  const lines = key.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

/** 缓存已解析的 RSA 公钥实例，避免每次解密重复构建 */
let urlKeyCache: any = null;

/**
 * 分段解密RSA加密数据（报表地址解密）
 * 后端用 RSA 私钥对 url 分段加密（PKCS#1 v1.5），密文有两种形式：
 * 1. 逗号拼接的多段 base64 密文；2. 不拼接的整段 base64 密文（内部为多个密文块连续拼接）
 * 前端用公钥逐块解密后拼接，还原原始 url
 * @param url - 后端返回的 base64 密文（逗号分隔各段或整段）
 * @returns 解密后的原始URL
 */
export function urlPublicKey(url: string): string {
  if (!url) return url;
  try {
    // 懒加载公钥：首次使用时从 base64 DER 解析并缓存复用
    const key =
      urlKeyCache || (urlKeyCache = forge.pki.publicKeyFromPem(getPublicKeyPem(URL_PUBLIC_KEY)));
    // RSA-2048 每个密文块固定为 256 字节
    const blockSize = Math.ceil(key.n.bitLength() / 8);
    // 含逗号则按段拆分；不含逗号视为一整段（可能包含多个连续拼接的密文块）
    const segments = url.includes(',') ? url.split(',') : [url];
    let decryptedBytes = '';
    for (const segment of segments) {
      const cipherBytes = forge.util.decode64(segment.trim());
      // 逐块用公钥解密（第三参 true 表示公钥运算 x^e mod n，并自动去除 PKCS#1 填充）
      for (let i = 0; i < cipherBytes.length; i += blockSize) {
        decryptedBytes += forge.pki.rsa.decrypt(cipherBytes.substr(i, blockSize), key, true);
      }
    }
    // 解密得到的是 UTF-8 字节片段，整体拼接后再统一解码，避免多字节字符跨块被拆坏
    console.log(forge.util.decodeUtf8(decryptedBytes), '解密后的字节片段');
    return forge.util.decodeUtf8(decryptedBytes);
  } catch (error) {
    console.error('URL解密失败：', error);
    throw new Error('URL解密失败');
  }
}

/**
 * SM2解密工具函数
 * 使用国密SM2算法进行私钥解密
 * @param ciphertext - 密文
 * @param privateKey - 私钥（十六进制字符串）
 * @param cipherMode - 密文顺序（默认c1c2c3）
 * @returns 解密后的明文
 */
export function sm2Decrypt(
  ciphertext: string,
  privateKey: string,
  cipherMode: 'c1c2c3' | 'c1c3c2' = 'c1c2c3'
): string {
  try {
    const plaintext = sm2.doDecrypt(ciphertext, privateKey, cipherMode === 'c1c2c3');
    return plaintext;
  } catch (error: any) {
    console.error('SM2解密失败：', error);
    throw new Error('SM2解密失败');
  }
}