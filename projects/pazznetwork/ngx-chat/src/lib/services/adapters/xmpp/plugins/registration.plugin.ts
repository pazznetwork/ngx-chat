import { NgZone } from '@angular/core';
import { Client, client, xml } from '@xmpp/client';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { getDomain } from '../../../../core/get-domain';
import { timeout } from '../../../../core/utils-timeout';
import { LogService } from '../../../log.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

/**
 * xep-0077
 */
export class RegistrationPlugin extends AbstractXmppPlugin {

    private readonly registered$ = new Subject<void>();
    private readonly cleanUp = new Subject<void>();
    private readonly loggedIn$ = new Subject<void>();
    private readonly registrationTimeout = 5000;
    private client: Client;

    constructor(private logService: LogService,
                private ngZone: NgZone) {
        super();
    }

    /**
     * Promise resolves if user account is registered successfully,
     * rejects if an error happens while registering, e.g. the username is already taken.
     */
    public async register(username: string,
                          password: string,
                          service: string,
                          domain: string): Promise<void> {
        await this.ngZone.runOutsideAngular(async () => {
            try {
                await timeout((async () => {
                    domain = domain || getDomain(service);

                    this.logService.debug('registration plugin', 'connecting...');
                    await this.connect(username, password, service, domain);

                    this.logService.debug('registration plugin', 'connection established, starting registration');
                    await this.client.iqCaller.request(
                        xml('iq', {type: 'get', to: domain},
                            xml('query', {xmlns: 'jabber:iq:register'})
                        )
                    );

                    this.logService.debug('registration plugin', 'server acknowledged registration request, sending credentials');
                    await this.client.iqCaller.request(
                        xml('iq', {type: 'set'},
                            xml('query', {xmlns: 'jabber:iq:register'},
                                xml('username', {}, username),
                                xml('password', {}, password)
                            )
                        )
                    );

                    this.registered$.next();
                    await this.loggedIn$.pipe(takeUntil(this.cleanUp), first()).toPromise();
                    this.logService.debug('registration plugin', 'registration successful');
                })(), this.registrationTimeout);
            } catch (e) {
                this.logService.warn('error registering', e);
                throw e;
            } finally {
                this.cleanUp.next();
                this.logService.debug('registration plugin', 'cleaning up');
                await this.client.stop();
            }
        });
    }

    private connect(username: string, password: string, service: string, domain?: string) {
        return new Promise(resolveConnectionEstablished => {
            this.client = client({
                domain: domain || getDomain(service),
                service,
                credentials: async (authenticationCallback) => {
                    resolveConnectionEstablished();
                    await this.registered$.pipe(takeUntil(this.cleanUp), first()).toPromise();
                    await authenticationCallback({username, password});
                }
            });

            this.client.reconnect.stop();
            this.client.timeout = this.registrationTimeout;

            this.client.on('online', () => {
                this.logService.debug('registration plugin', 'online event');
                this.loggedIn$.next();
            });

            this.client.on('error', (err: any) => {
                this.logService.error('registration plugin', err);
            });

            this.client.on('offline', () => {
                this.logService.debug('registration plugin', 'offline event');
            });

            return this.client.start();
        });
    }
}
