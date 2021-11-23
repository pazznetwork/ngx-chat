import { Component, Input } from '@angular/core';

@Component({
    selector: 'ngx-chat-message-text',
    template: `{{text}}`,
    styles: [
        `
            :host {
                white-space: pre-wrap;
            }
        `
    ]
})
export class ChatMessageTextComponent {
    @Input() text: string;
}
