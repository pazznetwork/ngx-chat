import { InjectionToken } from '@angular/core';
import { Contact } from '../core/contact';

export const REPORT_USER_INJECTION_TOKEN = new InjectionToken('ReportUserService');

export interface ReportUserService {

    reportUser(user: Contact): void;

}
