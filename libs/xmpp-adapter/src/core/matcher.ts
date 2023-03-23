// SPDX-License-Identifier: MIT
export class Matcher {
  private constructor(private readonly stanza: Element) {}

  static create(root: Element): Matcher {
    return new Matcher(root);
  }

  isIQ(): boolean {
    return this.stanza?.nodeName === 'iq';
  }

  isPresence(): boolean {
    return this.stanza?.nodeName === 'presence';
  }

  isMessage(): boolean {
    return this.stanza?.nodeName === 'message';
  }

  isOther(): boolean {
    return !(this.isIQ() || this.isPresence() || this.isMessage());
  }

  isTo(jid: string): boolean {
    return this.stanza?.getAttribute('to') === jid;
  }

  includesInTo(jid: string): boolean {
    return this.stanza?.getAttribute('to')?.includes(jid) ?? false;
  }

  isFrom(jid: string): boolean {
    return this.stanza?.getAttribute('from') === jid;
  }

  hasGetAttribute(): boolean {
    return this.stanza?.getAttribute('type') === 'get';
  }

  hasSetAttribute(): boolean {
    return this.stanza?.getAttribute('type') === 'set';
  }

  hasChildWithNameSpace(childName: string, nameSpace: string): boolean {
    return (
      Array.from(this.stanza?.querySelectorAll(childName)).findIndex(
        (el) => el.getAttribute('xmlns') === nameSpace
      ) > -1
    );
  }

  hasChild(childName: string): boolean {
    return !!this.stanza?.querySelectorAll(childName);
  }
}
