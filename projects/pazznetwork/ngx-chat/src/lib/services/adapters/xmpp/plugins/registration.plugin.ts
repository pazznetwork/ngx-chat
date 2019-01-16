import { NgZone } from '@angular/core';
import { Client } from '@xmpp/client-core';
import { timeout } from '@xmpp/events';
import bind from '@xmpp/plugins/bind';
import iqCaller from '@xmpp/plugins/iq-caller';
import plain from '@xmpp/plugins/sasl-plain';
import sessionEstablishment from '@xmpp/plugins/session-establishment';
import websocket from '@xmpp/plugins/websocket';
import { x as xml } from '@xmpp/xml';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { getDomain } from '../../../../core/get-domain';
import { LogService } from '../../../log.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

/**
 * xep-0077
 */
export class RegistrationPlugin extends AbstractXmppPlugin {

    private readonly xmppRegistrationComplete$ = new Subject();
    private readonly xmppRegistrationFinally$ = new Subject();
    private readonly xmppLoggedIn$ = new Subject();
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
                          domain?: string): Promise<void> {
        await this.ngZone.runOutsideAngular(async () => {
            try {
                await timeout((async () => {
                    domain = domain || getDomain(service);

                    this.logService.debug('registration plugin', 'connecting...');
                    await this.connect(username, password, service, domain);

                    this.logService.debug('registration plugin', 'connection established, starting registration');
                    await this.announceRegistration(domain);

                    this.logService.debug('registration plugin', 'server acknowledged registration request, sending credentials');
                    await this.writeRegister(username, password);
                    this.xmppRegistrationComplete$.next();

                    this.logService.debug('registration plugin', 'registration successful');
                    await this.xmppLoggedIn$.pipe(first(), takeUntil(this.xmppRegistrationFinally$)).toPromise();
                    this.logService.debug('registration plugin', 'logged in');

                    this.logService.debug('registration plugin', 'saving encrypted credentials');
                })(), this.registrationTimeout);
            } catch (e) {
                this.logService.warn('error registering', e);
                throw e;
            } finally {
                this.logService.debug('registration plugin', 'cleaning up');
                this.xmppRegistrationFinally$.next();
                await this.client.stop();
            }
        });
    }

    private connect(username: string, password: string, service: string, domain?: string) {
        return new Promise(resolveConnectionEstablished => {

            this.client = new Client();
            this.client.plugin(bind);
            this.client.plugin(iqCaller);
            this.client.plugin(plain);
            this.client.plugin(sessionEstablishment);
            this.client.plugin(websocket);

            this.client.timeout = this.registrationTimeout;

            this.client.on('online', () => {
                this.logService.debug('registration plugin', 'online event');
                this.xmppLoggedIn$.next();
            });

            this.client.on('error', (err: any) => {
                this.logService.error('registration plugin', err);
            });

            this.client.on('offline', () => {
                this.logService.debug('registration plugin', 'offline event');
            });

            this.client.handle('authenticate', (proceedWithLogin: any) =>
                new Promise(authenticateResolve => {
                    resolveConnectionEstablished();
                    this.xmppRegistrationComplete$.pipe(
                        first(),
                        takeUntil(this.xmppRegistrationFinally$)
                    ).subscribe(() => {
                        this.logService.debug('registration plugin', 'proceeding');
                        proceedWithLogin(username, password).then(authenticateResolve);
                    });
                })
            );

            this.client.start({
                domain: domain || getDomain(service),
                uri: service
            });
        });
    }

    private async writeRegister(username: string, password: string) {
        await this.client.plugins['iq-caller'].request(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: 'jabber:iq:register'},
                    xml('username', {}, username),
                    xml('password', {}, password)
                )
            )
        );
    }

    private async announceRegistration(domain: string) {
        await this.client.plugins['iq-caller'].request(
            xml('iq', {type: 'get', to: domain},
                xml('query', {xmlns: 'jabber:iq:register'})
            )
        );
    }

}
