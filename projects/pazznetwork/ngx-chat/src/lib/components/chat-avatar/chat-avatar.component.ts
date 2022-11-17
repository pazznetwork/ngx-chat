import { Component, Input } from '@angular/core';

@Component({
    selector: 'ngx-chat-avatar',
    templateUrl: './chat-avatar.component.html',
    styleUrls: ['./chat-avatar.component.less'],
})
export class ChatAvatarComponent {

    @Input()
    imageUrl: string;

}
