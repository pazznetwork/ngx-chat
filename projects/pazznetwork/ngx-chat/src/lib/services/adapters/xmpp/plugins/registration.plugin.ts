import { client } from '@xmpp/client';
import { Client } from '@xmpp/client-core';
import getDomain from '@xmpp/client/lib/getDomain';
import { timeout } from '@xmpp/events';
import { x as xml } from '@xmpp/xml';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
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

    constructor(private logService: LogService) {
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
            this.logService.error('error registering', e);
            throw e;
        } finally {
            this.logService.debug('registration plugin', 'cleaning up');
            this.xmppRegistrationFinally$.next();
            await this.client.stop();
            this.client.removeAllListeners();
        }
    }

    private connect(username: string, password: string, service: string, domain?: string) {
        return new Promise(resolveConnectionEstablished => {
            this.client = client({
                service,
                domain,
                credentials: (proceedWithLogin: any) => {
                    return new Promise(credentialsResolve => {
                        resolveConnectionEstablished();
                        // wait until registration is successful and pass the credentials
                        this.xmppRegistrationComplete$.pipe(
                            first(),
                            takeUntil(this.xmppRegistrationFinally$)
                        ).subscribe(() => {
                            this.logService.debug('registration plugin', 'proceeding');
                            proceedWithLogin({username, password}).then(() => credentialsResolve());
                        });
                    });
                }
            });

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

            this.client.reconnect.stop();
            this.client.start();
        });
    }

    private writeRegister(username: string, password: string) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await this.client.iqCaller.request(
                    xml('iq', {type: 'set'},
                        xml('query', {xmlns: 'jabber:iq:register'},
                            xml('username', {}, username),
                            xml('password', {}, password)
                        )
                    )
                );
                if (result.attrs.type === 'result') {
                    resolve();
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    private async announceRegistration(domain: string) {
        await this.client.iqCaller.request(
            xml('iq', {type: 'get', to: domain},
                xml('query', {xmlns: 'jabber:iq:register'})
            )
        );
    }

}
