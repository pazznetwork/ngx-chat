import {InjectionToken} from '@angular/core';

export const CHAT_STYLE_TOKEN = new InjectionToken<ChatStyle>('ngxChatStyle');

export interface ChatStyle {
    windowFrame: {
        windowWidth: string
    };
}
