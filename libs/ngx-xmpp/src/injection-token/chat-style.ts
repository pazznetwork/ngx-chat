import { InjectionToken } from '@angular/core';

// Currently not in use
export const CHAT_STYLE_TOKEN = new InjectionToken<ChatStyle>('ngxChatStyle');

export interface ChatStyle {
  windowFrame: {
    windowWidth: string;
  };
}
