// SPDX-License-Identifier: MIT
import type { Builder } from '@pazznetwork/strophe-ts';

export class StanzaBuilder {
  constructor(
    private stropheBuilder: Builder,
    private readonly sendInner: (content: Element) => Promise<Element>,
    private readonly sendWithoutResponse: (content: Element) => Promise<void>
  ) {}

  attrs(moreAttrs: Record<string, string>): StanzaBuilder {
    this.stropheBuilder = this.stropheBuilder.attrs(moreAttrs);
    return this;
  }

  /**
   *  Add a child to the current element and make it the new current
   *  element.
   *
   *  This function moves the current element pointer to the child,
   *  unless text is provided.  If you need to add another child, it
   *  is necessary to use up() to go back to the parent in the tree.
   *
   * @param name
   * @param attrs
   * @param text
   */
  c(name: string, attrs?: Record<string, string>, text?: string): StanzaBuilder {
    this.stropheBuilder = this.stropheBuilder.c(name, attrs, text);
    return this;
  }

  cNode(element: Element): StanzaBuilder {
    this.stropheBuilder = this.stropheBuilder.cnode(element);
    return this;
  }

  cCreateMethod(create: (builder: StanzaBuilder) => StanzaBuilder): StanzaBuilder {
    return create(this);
  }

  h(html: string): StanzaBuilder {
    this.stropheBuilder = this.stropheBuilder.h(html);
    return this;
  }

  send(): Promise<Element> {
    return this.sendInner(this.stropheBuilder.tree());
  }

  sendResponseLess(): Promise<void> {
    return this.sendWithoutResponse(this.stropheBuilder.tree());
  }

  t(text: string): StanzaBuilder {
    this.stropheBuilder = this.stropheBuilder.t(text);
    return this;
  }

  tree(): Element {
    return this.stropheBuilder.tree();
  }

  up(): StanzaBuilder {
    this.stropheBuilder = this.stropheBuilder.up();
    return this;
  }

  toString(): string {
    return this.stropheBuilder.toString();
  }
}
