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

  equalsBare(other: JID | undefined): boolean {
    if (!other) {
      return false;
    }
    return this.bare().equals(other.bare());
  }

  equalsBareString(other: string | undefined): boolean {
    if (!other) {
      return false;
    }
    return this.bare().equals(parseJid(other).bare());
  }
}

export function parseJid(jid: string): JID {
  let local: string | undefined;
  let resource: string | undefined;
  let domain: string | undefined;

  // Extract resource part, if available
  const resourceStart = jid.indexOf('/');
  if (resourceStart !== -1) {
    resource = jid.substring(resourceStart + 1);
    jid = jid.substring(0, resourceStart);
  }

  // Extract local and domain parts
  const atStart = jid.indexOf('@');
  if (atStart !== -1) {
    local = jid.substring(0, atStart).toLowerCase();
    domain = jid.substring(atStart + 1).toLowerCase();
  } else if (jid.includes('.')) {
    domain = jid.toLowerCase();
  } else {
    local = jid.toLowerCase();
  }

  // Return parsed JID parts
  return new JID(local, domain ?? '', resource);
}

export function bareJidStringsEqual(a: string, b: string): boolean {
  return parseJid(a).bare().equals(parseJid(b).bare());
}

export function makeSafeJidString(username: string, domain: string): string {
  const separator = '@';
  const safeUsername = username.includes(separator) ? username.split(separator)[0] : username;
  if (!safeUsername) {
    throw new Error(`safeUsername is undefined`);
  }
  return safeUsername + separator + domain;
}
