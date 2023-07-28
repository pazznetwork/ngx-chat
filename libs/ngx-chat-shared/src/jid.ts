// SPDX-License-Identifier: AGPL-3.0-or-later
export class JID {
  /**
   *
   * @param local can be undefined for example for conference room node (it than a bare jid)
   * @param domain never undefined
   * @param resource can be undefined
   */
  constructor(
    readonly local: string | undefined,
    readonly domain: string,
    readonly resource: string | undefined
  ) {}

  [Symbol.toPrimitive](hint: 'number' | 'string' | 'boolean'): number | string | boolean {
    if (hint === 'number') {
      return NaN;
    }

    if (hint === 'string') {
      return this.toString();
    }

    return true;
  }

  toString(): string {
    let s = this.domain;
    if (this.local) {
      s = this.local + '@' + s;
    }

    if (this.resource) {
      s = s + '/' + this.resource;
    }

    return s;
  }

  /**
   * Comparison function
   * */
  equals(
    other: { local: string | undefined; domain: string; resource: string | undefined } | undefined
  ): boolean {
    if (!other) {
      return false;
    }
    return (
      this.local === other.local && this.domain === other.domain && this.resource === other.resource
    );
  }

  bare(): JID {
    return new JID(this.local, this.domain, '');
  }
}

export function parseJid(jid: string): JID {
  let local;
  let resource;

  const resourceStart = jid.indexOf('/');
  if (resourceStart !== -1) {
    resource = jid.slice(resourceStart + 1);
    jid = jid.slice(0, resourceStart);
  }

  const atStart = jid.indexOf('@');
  if (atStart !== -1) {
    local = jid.slice(0, atStart);
    jid = jid.slice(atStart + 1);
  }

  return new JID(local, jid, resource);
}

export function makeSafeJidString(username: string, domain: string): string {
  const separator = '@';
  const safeUsername = username.includes(separator) ? username.split(separator)[0] : username;
  if (!safeUsername) {
    throw new Error(`safeUsername is undefined`);
  }
  return safeUsername + separator + domain;
}
