import { InjectionToken } from '@angular/core';
import { Recipient } from '../core/recipient';

/**
 * Optional injectable token to handle contact clicks in the chat
 */
export const CONTACT_CLICK_HANDLER_TOKEN = new InjectionToken<ChatContactClickHandler>('ngxChatContactClickHandler');

export interface ChatContactClickHandler {

    onClick(contact: Recipient): void;

}
