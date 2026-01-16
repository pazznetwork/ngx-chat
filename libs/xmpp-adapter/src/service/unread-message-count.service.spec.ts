import { UnreadMessageCountService } from './unread-message-count.service';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { Message, Contact, Direction } from '@pazznetwork/ngx-chat-shared';
import { fakeAsync, tick } from '@angular/core/testing';


const mockJid = (user: string) => ({
    bare: () => ({
        toString: () => user
    }),
    toString: () => user,
    equals: (other: any) => other.toString() === user
});

describe('UnreadMessageCountService', () => {
    let service: UnreadMessageCountService;
    let mockChatService: any;
    let mockChatListService: any;
    let mockPubSub: any;
    let mockEntityTimePlugin: any;
    let mockMucPlugin: any;
    let mockBlockPlugin: any;

    let contactsSubject: BehaviorSubject<Contact[]>;
    let onOnlineSubject: Subject<void>;
    let roomsSubject: Subject<any[]>;

    beforeEach(() => {

        contactsSubject = new BehaviorSubject<Contact[]>([]);
        onOnlineSubject = new Subject<void>();
        roomsSubject = new BehaviorSubject<any[]>([]);

        mockChatService = {
            contactListService: {
                contacts$: contactsSubject.asObservable()
            },
            onOnline$: onOnlineSubject.asObservable(),
            onOffline$: of(),
            zone: {
                run: (fn: any) => fn()
            },
            messageService: {
                messageReceived$: new Subject(),
                loadMostRecentMessages: jest.fn()
            }
        };

        mockChatListService = {
            chatMessagesViewed$: of(),
            chatMessages$: of(),
            isChatOpen: jest.fn().mockReturnValue(false)
        };

        mockPubSub = {
            publish$: jest.fn().mockReturnValue(of('item')),
            retrieveNodeItems: jest.fn().mockResolvedValue([{
                querySelector: jest.fn().mockReturnValue({
                    querySelectorAll: jest.fn().mockReturnValue([])
                })
            }]),
            publishEvent$: of()
        };

        mockEntityTimePlugin = {};

        mockMucPlugin = {
            rooms$: roomsSubject.asObservable()
        };

        mockBlockPlugin = {
            unblock$: of()
        };

        service = new UnreadMessageCountService(
            mockChatService,
            mockChatListService,
            mockPubSub,
            mockEntityTimePlugin,
            mockMucPlugin,
            mockBlockPlugin
        );
    });

    it('should track unread messages for contacts added in a batch', fakeAsync(() => {
        // Mock contacts
        const contact1 = {
            jid: mockJid('alice@example.com'),
            messageStore: {
                messages$: new BehaviorSubject<Message[]>([]),
                messages: []
            }
        } as any;
        const contact2 = {
            jid: mockJid('bob@example.com'),
            messageStore: {
                messages$: new BehaviorSubject<Message[]>([]),
                messages: []
            }
        } as any;

        const contacts = [contact1, contact2];

        // 1. Simulate Online
        onOnlineSubject.next();

        // 2. Emit Batch Contacts
        contactsSubject.next(contacts);

        // 3. Emit message for Contact 1 (Alice)
        const msg1: Message = {
            direction: Direction.in,
            datetime: new Date(),
            body: 'Hello Alice',
            id: '1'
        } as any;

        // Push message to store
        contact1.messageStore.messages = [msg1];
        contact1.messageStore.messages$.next([msg1]);

        let aliceCount = 0;
        let bobCount = 0;
        const sub = service.jidToUnreadCount$.subscribe(map => {
            aliceCount = map.get('alice@example.com') || 0;
            bobCount = map.get('bob@example.com') || 0;
        });

        // 4. Verify Unread Count for Alice
        // Wait for debounce/processing
        tick(100);

        expect(aliceCount).toBe(1);
        expect(bobCount).toBe(0);

        sub.unsubscribe();
    }));

    it('should verify reading a message and getting a new one (badge flow)', fakeAsync(() => {
        const contact1 = {
            jid: mockJid('alice@example.com'),
            messageStore: {
                messages$: new BehaviorSubject<Message[]>([]),
                messages: []
            }
        } as any;

        onOnlineSubject.next();
        contactsSubject.next([contact1]);

        let currentCount = 0;
        const sub = service.jidToUnreadCount$.subscribe(m => {
            currentCount = m.get('alice@example.com') || 0;
        });

        // 1. Message 1 arrives
        const msg1: Message = {
            direction: Direction.in,
            datetime: new Date(),
            body: 'Hello Alice 1',
            id: '1'
        } as any;
        contact1.messageStore.messages = [msg1];
        contact1.messageStore.messages$.next([msg1]);

        tick(100); // Wait for debounceTime(20)

        // Count should be 1
        expect(currentCount).toBe(1);

        // 2. Simulate Reading (Update Last Read Time)
        (service as any).jidToLastReadTimestamp.set('alice@example.com', Date.now());
        service.updateContactUnreadMessageState(contact1);

        expect(currentCount).toBe(0);

        tick(10); // Ensure time advances

        // 3. New Message
        const msg2: Message = {
            direction: Direction.in,
            datetime: new Date(),
            body: 'Msg2',
            id: '2'
        } as any;
        contact1.messageStore.messages = [msg1, msg2];
        contact1.messageStore.messages$.next([msg1, msg2]);

        tick(100); // Wait for debounceTime(20)

        // Check final
        expect(currentCount).toBe(1);

        sub.unsubscribe();
    }));
});
