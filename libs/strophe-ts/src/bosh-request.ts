// SPDX-License-Identifier: MIT
import { serialize } from './stanza/xml';
import { debug, error } from './log';
import { Status } from './status';
import type { Connection } from './connection';
import type { BoshOptions } from './bosh-options';

/**
 *  helper class that provides a cross implementation abstraction
 *  for a BOSH related XMLHttpRequest.
 *
 *  The Strophe.Request class is used internally to encapsulate BOSH request
 *  information.  It is not meant to be used from user's code.
 */
export class BoshRequest {
  private readonly data: string;
  date: number;
  abort: boolean;
  dead?: number;
  xhr: XMLHttpRequest;

  /**
   * The number of times this same request has been sent.
   */
  sends = 0;

  get age(): number {
    if (!this.date) {
      return 0;
    }
    const now = new Date().getDate();
    return (now - this.date) / 1000;
  }

  get timeDead(): number {
    if (!this.dead) {
      return 0;
    }
    const now = new Date().getDate();
    return (now - this.dead) / 1000;
  }

  /**
   *  Create and initialize a new Strophe.Request object.
   *
   *  Parameters:
   *
   *    @param xmlData - The XML data to be sent in the request.
   *    @param func - The function that will be called when the
   *      XMLHttpRequest readyState changes.
   *    @param rid - The BOSH rid attribute associated with this request.
   */
  constructor(
    readonly xmlData: Element,
    readonly func: (req: BoshRequest) => void,
    readonly rid: number
  ) {
    this.data = serialize(xmlData) ?? '';
    this.date = NaN;
    this.abort = false;
    this.dead = undefined;

    this.xhr = this.newXHR();
  }

  /**
   *  Get a response from the underlying XMLHttpRequest.
   *
   *  This function attempts to get a response from the request and checks
   *  for errors.
   *
   *  Throws:
   *    "parsererror" - A parser error occurred.
   *    "bad-format" - The entity has sent XML that cannot be processed.
   *
   *  Returns:
   *
   *    @returns The DOM element tree of the response.
   */
  getResponse(): Element {
    const parseError = 'parsererror';
    if (this.xhr?.responseXML?.documentElement?.tagName === parseError) {
      throw new Error(parseError);
    }

    if (this.xhr?.responseXML?.documentElement) {
      return this.xhr.responseXML.documentElement;
    }

    if (this.xhr.responseText) {
      return new DOMParser().parseFromString(this.xhr.responseText, 'application/xml')
        .documentElement;
    }

    return new Element();
  }

  /**
   *  helper function to create XMLHttpRequests.
   *
   *  This function creates XMLHttpRequests across all implementations.
   *
   *  Returns:
   *
   *   @returns  A new XMLHttpRequest.
   */
  newXHR(): XMLHttpRequest {
    const xhr = new XMLHttpRequest();
    xhr.overrideMimeType('text/xml; charset=utf-8');
    // use Function.bind() to prepend ourselves as an argument
    xhr.onreadystatechange = () => this.func(this);
    return xhr;
  }

  static get<TData>(url: string): Promise<TData> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Accept', 'application/json, text/javascript');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 400) {
          const data = JSON.parse(xhr.responseText) as TData;
          resolve(data);
        } else {
          reject(new Error(`${xhr.status}: ${xhr.responseText}`));
        }
      };
      xhr.onerror = reject;
      xhr.send();
    });
  }

  process(i: number, connection: Connection, options: BoshOptions, primaryTimeout: number): void {
    if (this.xhr.readyState === 0) {
      debug(`request id ${this.rid}.${this.sends} posting`);

      try {
        const content_type = options.contentType || 'text/xml; charset=utf-8';
        this.xhr.open('POST', connection.service, !options.sync);
        this.xhr.setRequestHeader('Content-Type', content_type);
        if (options.withCredentials) {
          this.xhr.withCredentials = true;
        }
      } catch (e2) {
        error('XHR open failed: ' + (e2 as Error).toString());
        if (!connection.connected) {
          connection.changeConnectStatus(Status.CONNFAIL, 'bad-service');
        }
        void connection.disconnect();
        return;
      }

      // Fires the XHR request -- may be invoked immediately
      // or on a gradually expanding retry window for reconnects
      const sendFunc = (): void => {
        this.date = new Date().getTime();
        if (options.customHeaders) {
          const headers = options.customHeaders;
          for (const [headerName, headerValue] of Object.entries(headers)) {
            this.xhr.setRequestHeader(headerName, headerValue);
          }
        }
        this.xhr.send(this.data);
      };

      // Implement progressive backoff for reconnects --
      // First retry (send === 1) should also be instantaneous
      if (this.sends > 1) {
        // Using a cube of the retry number creates a nicely
        // expanding retry window
        const backoff = Math.min(primaryTimeout, Math.pow(this.sends, 3)) * 1000;
        setTimeout(function () {
          // XXX: setTimeout should be called only with function expressions (23974bc1)
          sendFunc();
        }, backoff);
      } else {
        sendFunc();
      }

      this.sends++;

      connection.xmlOutput?.(this.xmlData);
    } else {
      debug(
        `_processRequest: ${i === 0 ? 'first' : 'second'} request has readyState of ${
          this.xhr.readyState
        }`
      );
    }
  }

  /**
   * @returns the HTTP status code from a BoshRequest. Returns -1 if there was none
   */
  getRequestStatus(): number {
    if (this.xhr.readyState === 4) {
      return this.xhr.status;
    }
    return -1;
  }
}
