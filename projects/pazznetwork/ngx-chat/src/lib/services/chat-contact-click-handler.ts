import { InjectionToken } from '@angular/core';
import { Contact } from '../core/contact';

export const CONTACT_CLICK_HANDLER_TOKEN = new InjectionToken('ChatContactClickHandler');

export interface ChatContactClickHandler {

    onClickContact(contact: Contact);

}
