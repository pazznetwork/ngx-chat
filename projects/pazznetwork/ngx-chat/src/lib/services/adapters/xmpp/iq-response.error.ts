import { IqResponseStanza } from '../../../core/stanza';

export class IqResponseError extends Error {
    static readonly ERROR_ELEMENT_NS = 'urn:ietf:params:xml:ns:xmpp-stanzas';
    readonly errorCode?: number;
    readonly errorType?: string;
    readonly errorCondition?: string;

    constructor(readonly errorStanza: IqResponseStanza<'error'>) {
        super(
            IqResponseError.extractErrorTextFromErrorResponse(
                errorStanza,
                IqResponseError.extractErrorDataFromErrorResponse(errorStanza)
            )
        );

        const {code, type, condition} = IqResponseError.extractErrorDataFromErrorResponse(errorStanza);
        this.errorCode = code;
        this.errorType = type;
        this.errorCondition = condition;
    }

    private static extractErrorDataFromErrorResponse(stanza: IqResponseStanza<'error'>): {
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
                    childElement.attrs.xmlns === IqResponseError.ERROR_ELEMENT_NS
                )[0]
                ?.getName());

        return {
            code: errorCode,
            type: errorType,
            condition: errorCondition,
        };
    }

    private static extractErrorTextFromErrorResponse(
        stanza: IqResponseStanza<'error'>,
        {code, type, condition}: {
            code?: number,
            type?: string,
            condition?: string
        }): string {
        const additionalData = [
            `errorCode: ${code ?? '[unknown]'}`,
            `errorType: ${type ?? '[unknown]'}`,
            `errorCondition: ${condition ?? '[unknown]'}`
        ].join(', ');
        const errorText =
            stanza.getChild('error')?.getChildText('text', IqResponseError.ERROR_ELEMENT_NS) || 'Unknown error';

        return `IqResponseError: ${errorText}${additionalData ? ` (${additionalData})` : ''}`;
    }
}
