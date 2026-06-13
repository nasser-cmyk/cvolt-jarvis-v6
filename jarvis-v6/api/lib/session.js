// Encrypted session cookies — uses Node's webcrypto, zero dependencies
import { webcrypto } from 'crypto';
const crypto = webcrypto;

const COOKIE_NAME = 'cvolt_sess';
const COOKIE_DAYS = 30;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(s) {
  s = s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='=';
  return Buffer.from(s,'base64');
}

async function getKey() {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error('COOKIE_SECRET env var not set');
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt','decrypt']);
}

export async function sealSession(obj) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, data);
  return b64url(iv) + '.' + b64url(new Uint8Array(cipher));
}

export async function openSession(token) {
  if (!token || !token.includes('.')) return null;
  try {
    const [ivStr, ctStr] = token.split('.');
    const iv = b64urlDecode(ivStr);
    const ct = b64urlDecode(ctStr);
    const key = await getKey();
    const data = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(data));
  } catch (e) { return null; }
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  }
  return out;
}

export async function readSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return await openSession(cookies[COOKIE_NAME]);
}

export async function writeSession(res, obj) {
  const sealed = await sealSession(obj);
  const expires = new Date(Date.now() + COOKIE_DAYS*24*3600*1000).toUTCString();
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(sealed)}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Lax`);
}

export function clearSession(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`);
}

export { COOKIE_NAME };
