import { InjectionToken } from '@angular/core';
import { Recipient } from '../core/recipient';

export const CONTACT_CLICK_HANDLER_TOKEN = new InjectionToken('ChatContactClickHandler');

export interface ChatContactClickHandler {

    onClick(contact: Recipient): void;

}
