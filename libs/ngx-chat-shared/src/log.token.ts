// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import type { Log } from './interface';

export const LOG_SERVICE_TOKEN = new InjectionToken<Log>('ngxLogService');
