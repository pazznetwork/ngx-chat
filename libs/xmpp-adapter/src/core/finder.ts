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

  static getElementByTags(stanza: Element, tags: string[]): Element | undefined {
    let finder = Finder.create(stanza);
    tags.forEach((tag) => (finder = finder.searchByTag(tag)));
    return finder.result;
  }

  searchByTag(tagName: string): Finder {
    this.currentElements = this.currentElements.reduce((acc: Element[], el: Element) => {
      acc.push(...Array.from(el.querySelectorAll(tagName)));
      return acc;
    }, []);
    return this;
  }

  searchForDeepestByTag(tagName: string): Finder {
    // Gather all matching elements.
    const allMatches: Element[] = [];
    for (const el of this.currentElements) {
      allMatches.push(...Array.from(el.querySelectorAll(tagName)));
    }

    // Compute the depth for each element.
    const depths: Map<Element, number> = new Map();
    let maxDepth = 0;
    for (const el of allMatches) {
      let depth = 0;
      let current = el;
      while (current.parentElement) {
        depth++;
        current = current.parentElement;
      }
      depths.set(el, depth);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }

    // Filter the elements that have the maximum depth.
    this.currentElements = allMatches.filter((el) => depths.get(el) === maxDepth);
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
