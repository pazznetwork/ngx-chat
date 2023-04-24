// SPDX-License-Identifier: MIT
import type { Sasl } from './sasl';
import { clientChallenge, scramResponse } from './scram';
import { SASLMechanismBase } from './sasl-mechanism-base';

export class SASLSHA512 extends SASLMechanismBase {
  /** PrivateConstructor: SASLSHA512
   *  SASL SCRAM SHA 512 authentication.
   */
  constructor() {
    super('SCRAM-SHA-512', true, 72);
  }

  test(sasl: Sasl): boolean {
    return sasl.authcid !== null;
  }

  async onChallenge(sasl: Sasl, challenge?: string): Promise<string> {
    return (
      await scramResponse(sasl, () => sasl.onSaslFailed(), challenge, 'SHA-512', 512)
    ).toString();
  }

  override async clientChallenge(sasl: Sasl, testCnonce: string): Promise<string> {
    return Promise.resolve(clientChallenge(sasl, testCnonce));
  }
}
