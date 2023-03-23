// SPDX-License-Identifier: MIT
import { utf16to8 } from './utils';
import { SASLMechanismBase } from './sasl-mechanism-base';
import type { Sasl } from './sasl';

export class SASLXOAuth2 extends SASLMechanismBase {
  /**
   *  SASL X-OAuth2 authentication.
   */
  constructor() {
    super('X-OAUTH2', true, 30);
  }

  test(sasl: Sasl): boolean {
    return sasl.pass !== null;
  }

  onChallenge(sasl: Sasl): Promise<string> {
    let auth_str = '\u0000';
    if (sasl.authcid !== null) {
      auth_str = auth_str + sasl.authzid;
    }
    auth_str = auth_str + '\u0000';
    auth_str = auth_str + sasl.pass;
    return Promise.resolve(utf16to8(auth_str));
  }
}
