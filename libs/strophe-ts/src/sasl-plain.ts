// SPDX-License-Identifier: MIT
import type { Sasl } from './sasl';
import { utf16to8 } from './utils';
import { SASLMechanismBase } from './sasl-mechanism-base';

export class SASLPlain extends SASLMechanismBase {
  /** PrivateConstructor: SASLPlain
   *  SASL PLAIN authentication.
   */
  constructor() {
    super('PLAIN', true, 50);
  }

  test(sasl: Sasl): boolean {
    return sasl.authcid !== null;
  }

  onChallenge(sasl: Sasl, domain: string): Promise<string> {
    const { authcid, authzid, pass } = sasl;
    if (!domain) {
      throw new Error('SASLPlain onChallenge: domain is not defined!');
    }
    // Only include authzid if it differs from authcid.
    // See: https://tools.ietf.org/html/rfc6120#section-6.3.8
    let auth_str: string = authzid !== `${authcid as string}@${domain}` ? (authzid as string) : '';
    auth_str = auth_str + '\u0000';
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    auth_str = auth_str + authcid;
    auth_str = auth_str + '\u0000';
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    auth_str = auth_str + pass;
    return Promise.resolve(utf16to8(auth_str));
  }
}
