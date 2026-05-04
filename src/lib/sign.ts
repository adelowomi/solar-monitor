import CryptoJS from "crypto-js";
import qs from "qs";

const OPEN_APP_ID = "rBrTRfAPXz";
const OPEN_APP_SECRET = "I4D0KRr2339z3pQ/at91V9BpFAOe54DaTafwSm6suIQ=";

/**
 * Generate a random alphanumeric nonce of given length.
 */
function randomNonce(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Decrypt the appSecret using AES-CBC.
 * Key = first 16 hex chars of MD5(appId), IV = last 16 hex chars.
 * The secret is base64-encoded ciphertext.
 */
function decryptSecret(appId: string, encryptedSecret: string): string {
  const hash = CryptoJS.MD5(appId).toString().toLowerCase();
  const keyHex = hash.substring(0, 16);
  const ivHex = hash.substring(16);

  const key = CryptoJS.enc.Utf8.parse(keyHex);
  const iv = CryptoJS.enc.Utf8.parse(ivHex);

  const decrypted = CryptoJS.AES.decrypt(encryptedSecret, key, {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding,
    iv,
  });

  return decrypted.toString(CryptoJS.enc.Utf8).trim();
}

/**
 * Compute the body hash for non-GET requests.
 * SHA-256 of the raw body string.
 */
function computeBodyHash(method: string, body?: string): string {
  if (method.toUpperCase() === "GET" || !body) return "";
  return CryptoJS.SHA256(body).toString().toLowerCase();
}

/**
 * Build the signature:
 * 1. Collect URL query params + body hash + AppID + Nonce
 * 2. Sort keys, stringify as query string (no encoding)
 * 3. HMAC-SHA256(queryString, decryptedSecret)
 * 4. MD5 the HMAC result
 */
function computeSign(
  params: Record<string, string>,
  decryptedSecret: string
): string {
  // Sort keys
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(params).sort()) {
    sorted[key] = params[key];
  }

  const queryString = qs.stringify(sorted, { encode: false });
  const wordArray = CryptoJS.enc.Utf8.parse(queryString);
  const base64 = CryptoJS.enc.Base64.stringify(wordArray);
  const hmac = CryptoJS.HmacSHA256(base64, decryptedSecret);
  return CryptoJS.MD5(hmac).toString().toLowerCase();
}

// Pre-compute the decrypted secret (it's constant)
const decryptedSecret = decryptSecret(OPEN_APP_ID, OPEN_APP_SECRET);

export interface SignHeaders {
  "IOT-Open-AppID": string;
  "IOT-Open-Nonce": string;
  "IOT-Open-Sign": string;
}

/**
 * Generate the IOT-Open-* headers for a request.
 */
export function generateSignHeaders(
  url: string,
  method: string,
  body?: string
): SignHeaders {
  // Extract query params from URL
  const params: Record<string, string> = {};
  try {
    const u = new URL(url);
    u.searchParams.forEach((v, k) => {
      params[k] = v;
    });
  } catch {
    // no query params
  }

  // Remove any existing sign headers from params
  delete params["IOT-Open-AppID"];
  delete params["IOT-Open-Nonce"];
  delete params["IOT-Open-Sign"];
  delete params["IOT-Open-Body-Hash"];

  // Add body hash
  params["IOT-Open-Body-Hash"] = computeBodyHash(method, body);

  // Add AppID and Nonce
  const nonce = randomNonce(32);
  params["IOT-Open-AppID"] = OPEN_APP_ID;
  params["IOT-Open-Nonce"] = nonce;

  const sign = computeSign(params, decryptedSecret);

  return {
    "IOT-Open-AppID": OPEN_APP_ID,
    "IOT-Open-Nonce": nonce,
    "IOT-Open-Sign": sign,
  };
}
