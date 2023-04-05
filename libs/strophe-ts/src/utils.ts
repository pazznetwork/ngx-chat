// SPDX-License-Identifier: MIT
// noinspection JSDeprecatedSymbols

export function utf16to8(str: string): string {
  let out = '';
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const c = str.charCodeAt(i);
    if (c >= 0x0000 && c <= 0x007f) {
      out += str.charAt(i);
    } else if (c > 0x07ff) {
      out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f));
      out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
      out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
    } else {
      out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f));
      out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
    }
  }
  return out;
}

export function xorArrayBuffers(x: ArrayBufferLike, y: ArrayBufferLike): ArrayBufferLike {
  const xIntArray = new Uint8Array(x);
  const yIntArray = new Uint8Array(y);
  const zIntArray = new Uint8Array(xIntArray.length);
  for (let i = 0; i < xIntArray.length; i++) {
    zIntArray[i] = (xIntArray[i] ?? 0) ^ (yIntArray[i] ?? 0);
  }
  return zIntArray.buffer;
}

export function arrayBufToBase64(buffer: ArrayBufferLike): string {
  // This function is due to mobz (https://stackoverflow.com/users/1234628/mobz)
  //  and Emmanuel (https://stackoverflow.com/users/288564/emmanuel)
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuf(str: string): ArrayBufferLike {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))?.buffer;
}

export function stringToArrayBuf(str: string): ArrayBufferLike {
  //utf-8
  const bytes = new TextEncoder().encode(str);
  return bytes.buffer;
}

export function generateResource(): string {
  return `/ngx-chat-${Math.floor(Math.random() * 139749528).toString()}`;
}

export function isValidJID(jid: string): boolean {
  return jid.trim().split('@').length === 2 && !jid.startsWith('@') && !jid.endsWith('@');
}
