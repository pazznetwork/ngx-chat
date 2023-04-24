// SPDX-License-Identifier: MIT
import type { Stanza } from './stanza';
import { Finder } from './finder';

export class XmppResponseError extends Error {
  static readonly ERROR_ELEMENT_NS = 'urn:ietf:params:xml:ns:xmpp-stanzas';

  private constructor(
    errorMessage: string,
    readonly errorStanza: Stanza,
    readonly errorCode?: number,
    readonly errorType?: string,
    readonly errorCondition?: string
  ) {
    super(errorMessage);
  }

  static create(errorStanza: Stanza): XmppResponseError {
    const { code, type, condition } =
      XmppResponseError.extractErrorDataFromErrorResponse(errorStanza);
    const errorMessage = XmppResponseError.extractErrorTextFromErrorResponse(errorStanza, {
      code,
      type,
      condition,
    });
    return new XmppResponseError(errorMessage, errorStanza, code, type, condition);
  }

  private static extractErrorDataFromErrorResponse(stanza: Stanza): {
    code?: number;
    type?: string;
    condition?: string;
  } {
    const errorElement = stanza.querySelector('error');
    const errorCode = Number(errorElement?.getAttribute('code')) || undefined;
    const errorType = errorElement?.getAttribute('type') as string | undefined;
    const errorChildrenItems = errorElement?.children ? Array.from(errorElement.children) : [];
    const errorCondition = errorChildrenItems.filter(
      (childElement) =>
        childElement?.nodeName !== 'text' &&
        childElement?.getAttribute('xmlns') === XmppResponseError.ERROR_ELEMENT_NS
    )?.[0]?.nodeName;

    return {
      code: errorCode,
      type: errorType,
      condition: errorCondition,
    };
  }

  private static extractErrorTextFromErrorResponse(
    stanza: Stanza,
    {
      code,
      type,
      condition,
    }: {
      code?: number;
      type?: string;
      condition?: string;
    }
  ): string {
    const additionalData = [
      `errorCode: ${code ?? '[unknown]'}`,
      `errorType: ${type ?? '[unknown]'}`,
      `errorCondition: ${condition ?? '[unknown]'}`,
    ].join(', ');

    // eslint-disable-next-line no-console
    console.log(
      'FOUND IN ERROR: ',
      Finder.create(stanza)
        ?.searchByTag('error')
        ?.searchByTag('text')
        ?.searchByNamespace(XmppResponseError.ERROR_ELEMENT_NS)?.result
    );

    const stanzaError = Finder.create(stanza)
      ?.searchByTag('error')
      ?.searchByTag('text')
      ?.searchByNamespace(XmppResponseError.ERROR_ELEMENT_NS)?.result?.textContent;
    const errorText = stanzaError || 'Unknown error';

    return `XmppResponseError: ${errorText}${additionalData ? ` (${additionalData})` : ''}`;
  }
}
