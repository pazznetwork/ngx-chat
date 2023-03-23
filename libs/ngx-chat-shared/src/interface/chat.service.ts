// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Observable } from 'rxjs';
import type { AuthRequest } from './auth-request';
import type { Translations } from './translations';
import type { FileUploadHandler } from './file-upload-handler';
import type { MessageService } from './message-service';
import type { ContactListService } from './contact-list-service';
import type { RoomService } from './room-service';

/**
 * ChatServiceInterface is your main API for using ngx-chat. Can be injected in your services like in the following example:
 *
 * ```
 * constructor(@Inject(CHAT_SERVICE_TOKEN) chatService: ChatServiceInterface)
 * ```
 */
export interface ChatService {
  /**
   * Returns the FileUploadHandler for the chosen interface as they have deep dependencies towards the chosen chat system they should
   * be handled separately.
   */
  fileUploadHandler: FileUploadHandler;

  /**
   * The avatar of the user. Is used as src attribute of an img-element. Purely cosmetically. Should be set via the
   * [userAvatar$]{@link ChatService#userAvatar$} @Input-attribute of {@link ChatService}.
   */
  userAvatar$: Observable<string>;

  /**
   * The current translation. Do NOT write to this attribute, use the [translations]{@link ChatService#translations} @Input-attribute
   * of {@link ChatService} instead.
   */
  translations: Translations;

  messageService: MessageService;
  contactListService: ContactListService;
  roomService: RoomService;

  /**
   * Observable to hook at before online actions, emitting the jid which will be used for the login
   */
  readonly onAuthenticating$: Observable<void>;

  readonly onOnline$: Observable<void>;

  /**
   * Observable for clean up actions after going offline
   */
  readonly onOffline$: Observable<void>;

  readonly isOnline$: Observable<boolean>;

  readonly isOffline$: Observable<boolean>;

  /**
   * Logs the user in. Will modify state$ accordingly. If login fails, state will stay in 'disconnected'.
   */
  logIn(logInRequest: AuthRequest): Promise<void>;

  /**
   * Disconnects from the server, clears contacts$, sets state$ to 'disconnected'.
   */
  logOut(): Promise<void>;

  /**
   * Tries to reconnect with the same credentials the user logged in last.
   */
  reconnect(): Promise<void>;

  /**
   * Promise resolves if user account is registered successfully,
   * rejects if an error happens while registering, e.g. the username is already taken.
   */
  register(user: {
    username?: string;
    password?: string;
    service?: string;
    domain?: string;
  }): Promise<void>;

  unregister(param: { service: string; domain: string }): Promise<void>;
}
