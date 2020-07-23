import { xml } from '@xmpp/client';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, first, flatMap, map, timeout } from 'rxjs/operators';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

export interface TimeReference {
    utcTimestamp: number;
    /**
     * When was utcTimestamp seen locally according to performance.now().
     */
    localReference: number;
}

/**
 * Request time of entities via XEP-0202.
 */
export class EntityTimePlugin extends AbstractXmppPlugin {

    private serverSupportsTime$ = new BehaviorSubject<boolean | 'unknown'>('unknown');
    private serverTime$ = new BehaviorSubject<TimeReference | null>(null);

    constructor(
        private xmppChatAdapter: XmppChatAdapter,
        private serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
        private logService: LogService,
    ) {
        super();
    }

    async onBeforeOnline(): Promise<void> {
        const serverSupportsTimeRequest = await this.serviceDiscoveryPlugin.supportsFeature(
            this.xmppChatAdapter.chatConnectionService.userJid.domain,
            'urn:xmpp:time',
        );
        if (serverSupportsTimeRequest) {
            const sharedUtcTimeStamp = await this.requestTime(this.xmppChatAdapter.chatConnectionService.userJid.domain);
            this.serverTime$.next(sharedUtcTimeStamp);
            this.serverSupportsTime$.next(true);
        } else {
            this.serverSupportsTime$.next(false);
        }
    }

    onOffline() {
        this.serverSupportsTime$.next('unknown');
        this.serverTime$.next(null);
    }

    /**
     * Returns a non-client-specific timestamp if server supports XEP-0202. Fallback to local timestamp in case of missing support.
     */
    async getNow(): Promise<number> {
        const calculateNowViaServerTime$ = this.serverTime$.pipe(map(reference => this.calculateNow(reference)), first());
        return await this.serverSupportsTime$.pipe(
            timeout(5000),
            first(supportsServerTime => supportsServerTime !== 'unknown'),
            flatMap(supportsServerTime => supportsServerTime ? calculateNowViaServerTime$ : of(Date.now())),
            catchError(() => of(Date.now())),
        ).toPromise();
    }

    private calculateNow(reference: TimeReference): number {
        return reference.utcTimestamp + (performance.now() - reference.localReference);
    }

    async requestTime(jid: string): Promise<TimeReference> {
        const response = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', to: jid},
                xml('time', {xmlns: 'urn:xmpp:time'}),
            ),
        );
        const utcString = response.getChild('time', 'urn:xmpp:time')?.getChildText('utc');
        if (!utcString) {
            const message = 'invalid time response';
            this.logService.error(message, response.toString());
            throw new Error(message);
        }
        return {utcTimestamp: Date.parse(utcString), localReference: performance.now()};
    }

}
