// 2ch互換トリップ: 名前欄の「名前#キー」→「名前◆xxxxxxxxxx」
// 仕様（perl crypt / SHA1 と突合検証済み）:
//  - キーのSJISバイト長 < 12 → 10桁トリップ: DES crypt(キー先頭8バイト, salt)、結果の後ろ10文字
//    salt = (キー + "H.") の 1,2バイト目（範囲変換: 3A-40→+7 / 5B-60→+6 / それ以外の[.-z]外→'.'）
//  - キーのSJISバイト長 >= 12 → 12桁トリップ: base64(sha1(SJISバイト)) の先頭12文字（+ → .）
//  検証例: istrip→/WG5qp963c, Wikipedia→Ig9vRBfuyA, テスト→SQ2Wyjdi7M
import { createHash } from "crypto";
import iconv from "iconv-lite";
import unixCryptTD from "./unix-crypt-td";

function sjisBytes(s: string): number[] {
  return Array.from(iconv.encode(s, "shift_jis"));
}

function transformSaltByte(c: number): number {
  if (c >= 0x3a && c <= 0x40) c += 7;
  if (c >= 0x5b && c <= 0x60) c += 6;
  if (c < 0x2e || c > 0x7a) c = 0x2e;
  return c;
}

function trip10(keyBytes: number[]): string {
  const kh = keyBytes.concat([0x48, 0x2e]); // キー + "H."
  const salt =
    String.fromCharCode(transformSaltByte(kh[1])) +
    String.fromCharCode(transformSaltByte(kh[2]));
  const out = unixCryptTD(keyBytes.slice(0, 8), salt, false) as string;
  return out.slice(-10);
}

function trip12(keyBytes: number[]): string {
  const b64 = createHash("sha1").update(Buffer.from(keyBytes)).digest("base64");
  return b64.slice(0, 12).replace(/\+/g, ".");
}

export function computeTrip(key: string): string {
  const bytes = sjisBytes(key);
  return bytes.length >= 12 ? trip12(bytes) : trip10(bytes);
}

/** 名前欄の「#キー」をトリップに変換する（#がなければそのまま。キーが空なら#以降を削除） */
export function applyTrip(rawName: string | null | undefined): string | null {
  const name = (rawName ?? "").trim();
  if (!name) return null;
  const idx = name.indexOf("#");
  if (idx === -1) return name;
  const base = name.slice(0, idx).trim().slice(0, 40);
  const key = name.slice(idx + 1);
  if (!key) return base || null;
  return `${base}◆${computeTrip(key)}`;
}
