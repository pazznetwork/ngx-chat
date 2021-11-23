import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Direction, MessageState } from '../../core/message';

@Component({
    selector: 'ngx-chat-message-simple',
    templateUrl: './chat-message-simple.component.html',
    styleUrls: ['./chat-message-simple.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatMessageSimpleComponent {

    @Input()
    avatar?: string;

    @Output()
    avatarClickHandler = new EventEmitter<void>();

    @Input()
    avatarInteractive: boolean;

    @Input()
    direction: Direction;

    @Input()
    formattedDate: string;

    @Input()
    footerHidden = false;

    @Input()
    imageLink: string;

    @Input()
    showImagePlaceholder: boolean;

    @Input()
    messageState: MessageState;

    @Input()
    nick?: string;

    MessageState = MessageState;

}
