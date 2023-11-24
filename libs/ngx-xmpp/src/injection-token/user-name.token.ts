// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Optional injectable token to customize the name of the current user. The Observable should emit a URL to an image.
 * For example is used for the outgoing messages.
 */
export const USER_NAME_TOKEN = new InjectionToken<Observable<string>>('ngxUserName');
