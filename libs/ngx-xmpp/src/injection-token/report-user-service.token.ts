// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import type { ReportUserService } from '@pazznetwork/ngx-chat-shared';

/**
 * Optional injectable token to handle contact reports in the chat
 */
export const REPORT_USER_INJECTION_TOKEN = new InjectionToken<ReportUserService>(
  'ngxChatReportUserService'
);
