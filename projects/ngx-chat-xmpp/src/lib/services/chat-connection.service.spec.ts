import { TestBed } from '@angular/core/testing';
import { first } from 'rxjs/operators';
import { ChatConnectionService, XmppClientToken } from './chat-connection.service';
import { LogService } from './log.service';
import { x as xml } from '@xmpp/xml';

describe('chat connection service', () => {

    let chatConnectionService;

    beforeEach(() => {
        const spy = jasmine.createSpyObj('Client', ['getValue', 'on', 'plugin']);

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: spy},
                ChatConnectionService,
                LogService
            ]
        });

        chatConnectionService = TestBed.get(ChatConnectionService);

    });

    it('#getNextIqId() should generate new iq ids', () => {
        expect(chatConnectionService.getNextIqId())
            .not.toEqual(chatConnectionService.getNextIqId(), 'two consecutive iq ids should not match');
    });

    describe('receiving messages', () => {

        it('should emit events on receiving a message', (done) => {
            chatConnectionService.stanzaMessage$.pipe(first()).subscribe(async (stanza) => {
                await expect(stanza.getChildText('body')).toEqual('message text');
                done();
            });
            chatConnectionService.onStanzaReceived(
                xml('message', {},
                    xml('body', {}, 'message text')));
        });

    });

});
