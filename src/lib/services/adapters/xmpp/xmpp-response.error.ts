import { Stanza } from '../../../core/stanza';

export class XmppResponseError extends Error {
    static readonly ERROR_ELEMENT_NS = 'urn:ietf:params:xml:ns:xmpp-stanzas';
    readonly errorCode?: number;
    readonly errorType?: string;
    readonly errorCondition?: string;

    constructor(readonly errorStanza: Stanza) {
        super(
            XmppResponseError.extractErrorTextFromErrorResponse(
                errorStanza,
                XmppResponseError.extractErrorDataFromErrorResponse(errorStanza),
            ),
        );

        const {code, type, condition} = XmppResponseError.extractErrorDataFromErrorResponse(errorStanza);
        this.errorCode = code;
        this.errorType = type;
        this.errorCondition = condition;
    }

    private static extractErrorDataFromErrorResponse(stanza: Stanza): {
        code?: number,
        type?: string,
        condition?: string
    } {
        const errorElement = stanza.getChild('error');
        const errorCode = Number(errorElement?.attrs.code) || undefined;
        const errorType = errorElement?.attrs.type as string | undefined;
        const errorCondition =
            (errorElement
                ?.children
                .filter(childElement =>
                    childElement.getName() !== 'text' &&
                    childElement.attrs.xmlns === XmppResponseError.ERROR_ELEMENT_NS,
                )[0]
                ?.getName());

        return {
            code: errorCode,
            type: errorType,
            condition: errorCondition,
        };
    }

    private static extractErrorTextFromErrorResponse(
        stanza: Stanza,
        {code, type, condition}: {
            code?: number,
            type?: string,
            condition?: string
        }): string {
        const additionalData = [
            `errorCode: ${code ?? '[unknown]'}`,
            `errorType: ${type ?? '[unknown]'}`,
            `errorCondition: ${condition ?? '[unknown]'}`,
        ].join(', ');
        const errorText =
            stanza.getChild('error')?.getChildText('text', XmppResponseError.ERROR_ELEMENT_NS) || 'Unknown error';

        return `XmppResponseError: ${errorText}${additionalData ? ` (${additionalData})` : ''}`;
    }
}
