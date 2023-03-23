// SPDX-License-Identifier: MIT
export class Finder {
  private currentElements: Element[];

  get result(): Element | undefined {
    return this.currentElements?.[0];
  }

  get results(): Element[] {
    return this.currentElements;
  }

  private constructor(readonly root: Element) {
    this.currentElements = [root];
  }

  static create(root: Element): Finder {
    return new Finder(root);
  }

  searchByTag(tagName: string): Finder {
    this.currentElements = this.currentElements.reduce((acc: Element[], el: Element) => {
      acc.push(...Array.from(el.querySelectorAll(tagName)));
      return acc;
    }, []);
    return this;
  }

  searchByNamespace(nameSpace: string): Finder {
    this.currentElements = this.currentElements.filter(
      (el) => el.getAttribute('xmlns') === nameSpace
    );
    return this;
  }

  searchByNamespaceStartsWith(nameSpace: string): Finder {
    this.currentElements = this.currentElements.filter((el) =>
      el.getAttribute('xmlns')?.startsWith(nameSpace)
    );
    return this;
  }

  searchByAttribute(attributeName: string, attributeValue: string): Finder {
    this.currentElements = this.currentElements.filter(
      (el) => el.getAttribute(attributeName) === attributeValue
    );
    return this;
  }
}
