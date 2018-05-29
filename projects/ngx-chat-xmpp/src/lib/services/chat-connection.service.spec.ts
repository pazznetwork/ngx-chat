import { TestBed } from '@angular/core/testing';
import { ChatConnectionService, XmppClientToken } from './chat-connection.service';
import { LogService } from './log.service';

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

});
