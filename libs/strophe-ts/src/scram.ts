// SPDX-License-Identifier: MIT
import { arrayBufToBase64, base64ToArrayBuf, stringToArrayBuf, xorArrayBuffers } from './utils';
import { warn } from './log';
import type { Sasl } from './sasl';

async function scramClientProof(
  authMessage: string,
  clientKey: ArrayBufferLike,
  hashName: string
): Promise<ArrayBuffer> {
  const storedKey = await window.crypto.subtle.importKey(
    'raw',
    await window.crypto.subtle.digest(hashName, clientKey),
    { name: 'HMAC', hash: hashName },
    false,
    ['sign']
  );
  const clientSignature = await window.crypto.subtle.sign(
    'HMAC',
    storedKey,
    stringToArrayBuf(authMessage)
  );

  return xorArrayBuffers(clientKey, clientSignature);
}

/* This function parses the information in a SASL SCRAM challenge response,
 * into an object of the form
 * { nonce: String,
 *   salt:  ArrayBuffer,
 *   iter:  Int
 * }
 * Returns undefined on failure.
 */
function scramParseChallenge(
  challenge: string
): { salt: ArrayBuffer; iter: number; nonce: string } | undefined {
  let nonce;
  let salt;
  let iter;
  const attribMatch = /([a-z]+)=([^,]+)(,|$)/;
  while (challenge.match(attribMatch)) {
    const matches = challenge.match(attribMatch);
    if (!matches) {
      throw new Error('matches cannot be undefined');
    }
    if (matches.length < 3) {
      throw new Error('matches has not enough array members');
    }
    challenge = challenge.replace(matches[0]!, '');
    switch (matches[1]) {
      case 'r':
        nonce = matches[2];
        break;
      case 's':
        salt = base64ToArrayBuf(matches[2]!);
        break;
      case 'i':
        iter = parseInt(matches[2]!, 10);
        break;
      default:
        return undefined;
    }
  }

  if (!iter) {
    throw new Error('iter cannot be undefined');
  }
  // Consider iteration counts less than 4096 insecure, as recommended by
  // RFC 5802
  if (isNaN(iter) || iter < 4096) {
    warn('Failing SCRAM authentication because server supplied iteration count < 4096.');
    return undefined;
  }

  if (!salt) {
    warn('Failing SCRAM authentication because server supplied incorrect salt.');
    return undefined;
  }

  if (!nonce) {
    throw new Error('nonce cannot be undefined');
  }

  return { nonce, salt, iter };
}

/* Derive the client and server keys given a string password,
 * a hash name, and a bit length.
 * Returns an object of the following form:
 * { ck: ArrayBuffer, the client key
 *   sk: ArrayBuffer, the server key
 * }
 */
async function scramDeriveKeys(
  password: string,
  salt: ArrayBufferLike,
  iter: number,
  hashName: string,
  hashBits: number
): Promise<{ ck: ArrayBuffer; sk: ArrayBuffer }> {
  const saltedPasswordBits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iter, hash: { name: hashName } },
    await window.crypto.subtle.importKey('raw', stringToArrayBuf(password), 'PBKDF2', false, [
      'deriveBits',
    ]),
    hashBits
  );
  const saltedPassword = await window.crypto.subtle.importKey(
    'raw',
    saltedPasswordBits,
    { name: 'HMAC', hash: hashName },
    false,
    ['sign']
  );

  return {
    ck: await window.crypto.subtle.sign('HMAC', saltedPassword, stringToArrayBuf('Client Key')),
    sk: await window.crypto.subtle.sign('HMAC', saltedPassword, stringToArrayBuf('Server Key')),
  };
}

async function scramServerSign(
  authMessage: string,
  sk: ArrayBufferLike,
  hashName: string
): Promise<ArrayBuffer> {
  const serverKey = await window.crypto.subtle.importKey(
    'raw',
    sk,
    { name: 'HMAC', hash: hashName },
    false,
    ['sign']
  );

  return window.crypto.subtle.sign('HMAC', serverKey, stringToArrayBuf(authMessage));
}

// Generate an ASCII nonce (not containing the ',' character)
function generateCnonce(): string {
  // generate 16 random bytes of nonce, base64 encoded
  const bytes = new Uint8Array(16);
  return arrayBufToBase64(crypto.getRandomValues(bytes).buffer);
}

/* On success, sets
 * connection_sasl_data["server-signature"]
 * and
 * connection._sasl_data.keys
 *
 * The server signature should be verified after this function completes..
 *
 * On failure, returns connection._sasl_failure_cb();
 */
export async function scramResponse(
  sasl: Sasl,
  challenge: string | undefined,
  hashName: string,
  hashBits: number
): Promise<string | Error | boolean> {
  const cnonce = sasl.saslData.cnonce as string;
  if (!challenge) {
    throw new Error('challenge cannot be undefined');
  }
  const challengeData = scramParseChallenge(challenge);

  // The RFC requires that we verify the (server) nonce has the client
  // nonce as an initial substring.
  if (!challengeData && (challengeData as any)?.nonce.slice(0, cnonce.length) !== cnonce) {
    warn('Failing SCRAM authentication because server supplied incorrect nonce.');
    sasl.saslData = {};
    return sasl.saslFailureCb(() => {}, undefined);
  }

  if (!challengeData) {
    throw new Error('challengeData cannot be undefined');
  }

  let clientKey;
  let serverKey;

  // Either restore the client key and server key passed in, or derive new ones
  if (
    typeof sasl.pass !== 'string' &&
    sasl.pass?.name === hashName &&
    sasl.pass?.salt === arrayBufToBase64(challengeData.salt) &&
    sasl.pass?.iter === challengeData.iter
  ) {
    clientKey = base64ToArrayBuf(sasl.pass.ck);
    serverKey = base64ToArrayBuf(sasl.pass.sk);
  } else if (typeof sasl.pass === 'string') {
    const keys = await scramDeriveKeys(
      sasl.pass,
      challengeData.salt,
      challengeData.iter,
      hashName,
      hashBits
    );
    clientKey = keys.ck;
    serverKey = keys.sk;
  } else {
    sasl.saslFailureCb(() => {}, undefined);
    return new Error('SASL SCRAM ERROR');
  }

  const clientFirstMessageBare = sasl.saslData.clientFirstMessageBare;
  const serverFirstMessage = challenge;
  const clientFinalMessageBare = `c=biws,r=${challengeData.nonce}`;

  const authMessage = `${clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageBare}`;

  const clientProof = await scramClientProof(authMessage, clientKey, hashName);
  const serverSignature = await scramServerSign(authMessage, serverKey, hashName);

  sasl.saslData.serverSignature = arrayBufToBase64(serverSignature);
  sasl.saslData.keys = {
    name: hashName,
    iter: challengeData.iter,
    salt: arrayBufToBase64(challengeData.salt),
    ck: arrayBufToBase64(clientKey),
    sk: arrayBufToBase64(serverKey),
  };

  return `${clientFinalMessageBare},p=${arrayBufToBase64(clientProof)}`;
}

// Returns a string containing the client first message
export function clientChallenge(sasl: Sasl, testCnonce: string): string {
  const cnonce = testCnonce || generateCnonce();
  const clientFirstMessageBare = `n=${sasl.authcid},r=${cnonce}`;
  sasl.saslData.cnonce = cnonce;
  sasl.saslData.clientFirstMessageBare = clientFirstMessageBare;
  return `n,,${clientFirstMessageBare}`;
}
