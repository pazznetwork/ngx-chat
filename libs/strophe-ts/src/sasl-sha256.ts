// SPDX-License-Identifier: MIT
import { clientChallenge, scramResponse } from './scram';
import { SASLMechanismBase } from './sasl-mechanism-base';
import type { Sasl } from './sasl';

export class SASLSHA256 extends SASLMechanismBase {
  /** PrivateConstructor: SASLSHA256
   *  SASL SCRAM SHA 256 authentication.
   */
  constructor() {
    super('SCRAM-SHA-256', true, 70);
  }

  test(sasl: Sasl): boolean {
    return sasl.authcid !== null;
  }

  async onChallenge(sasl: Sasl, challenge?: string): Promise<string> {
    return (await scramResponse(sasl, challenge, 'SHA-256', 256)).toString();
  }

  override async clientChallenge(sasl: Sasl, testCnonce: string): Promise<string> {
    return Promise.resolve(clientChallenge(sasl, testCnonce));
  }
}
