// SPDX-License-Identifier: MIT
import { utf16to8 } from './utils';
import { SASLMechanismBase } from './sasl-mechanism-base';
import type { Sasl } from './sasl';

export class SASLOAuthBearer extends SASLMechanismBase {
  /** PrivateConstructor: SASLOAuthBearer
   *  SASL OAuth Bearer authentication.
   */
  constructor() {
    super('OAUTHBEARER', true, 40);
  }

  test(sasl: Sasl): boolean {
    return sasl.pass !== null;
  }

  onChallenge(sasl: Sasl): Promise<string> {
    let auth_str = 'n,';
    if (sasl.authcid !== null) {
      auth_str = `${auth_str}a=${sasl?.authzid as string}`;
    }
    auth_str = auth_str + ',';
    auth_str = auth_str + '\u0001';
    auth_str = auth_str + 'auth=Bearer ';
    auth_str = auth_str + (sasl.pass as string);
    auth_str = auth_str + '\u0001';
    auth_str = auth_str + '\u0001';
    return Promise.resolve(utf16to8(auth_str));
  }
}
