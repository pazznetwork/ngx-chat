import { Component, EventEmitter, Output } from '@angular/core';

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

}
