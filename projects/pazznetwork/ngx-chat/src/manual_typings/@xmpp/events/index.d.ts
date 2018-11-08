declare module '@xmpp/events' {

    export function timeout<T>(promise: Promise<T>, timeoutInMS: number): Promise<T>;

}
