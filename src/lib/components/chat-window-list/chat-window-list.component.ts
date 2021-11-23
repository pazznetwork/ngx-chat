import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, Input } from '@angular/core';
import { ChatListStateService } from '../../services/chat-list-state.service';

@Component({
    selector: 'ngx-chat-window-list',
    templateUrl: './chat-window-list.component.html',
    styleUrls: ['./chat-window-list.component.less'],
    animations: [
        trigger('rosterVisibility', [
            state('hidden', style({
                right: '1em',
            })),
            state('shown', style({
                right: '15em',
            })),
            transition('hidden => shown', animate('400ms ease')),
            transition('shown => hidden', animate('400ms ease'))
        ])
    ]
})
export class ChatWindowListComponent {

    @Input()
    rosterState: string;

    constructor(public chatListService: ChatListStateService) {
    }

}
