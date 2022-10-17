import {Component, EventEmitter, Inject, Optional, Output} from '@angular/core';
import {ChatStyle, CHAT_STYLE_TOKEN } from 'src/lib/services/chat-style';

@Component({
    selector: 'ngx-chat-window-frame',
    templateUrl: './chat-window-frame.component.html',
    styleUrls: ['./chat-window-frame.component.less'],
})
export class ChatWindowFrameComponent {

    @Output()
    closeClick = new EventEmitter<void>();

    @Output()
    headerClick = new EventEmitter<void>();

    constructor(@Optional() @Inject(CHAT_STYLE_TOKEN) public chatStyle: ChatStyle) {
    }

}
