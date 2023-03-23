// SPDX-License-Identifier: MIT
type ArrayElementType<TArr extends readonly unknown[]> = TArr extends ReadonlyArray<infer TElem>
  ? TElem
  : never;

type XHTMLTags = ArrayElementType<typeof XHTML.tags>;

/** Constants: XHTML_IM Namespace
 *  contains allowed tags, tag attributes, and css properties.
 *  Used in the createHtml function to filter incoming html into the allowed XHTML-IM subset.
 *  See http://xmpp.org/extensions/xep-0071.html#profile-summary for the list of recommended
 *  allowed tags and their attributes.
 */
export class XHTML {
  static readonly tags = [
    'a',
    'blockquote',
    'br',
    'cite',
    'em',
    'img',
    'li',
    'ol',
    'p',
    'span',
    'strong',
    'ul',
    'body',
  ] as const;

  static readonly attributes: Record<XHTMLTags, readonly string[]> = {
    a: ['href'],
    blockquote: ['style'],
    br: [],
    cite: ['style'],
    em: [],
    img: ['src', 'alt', 'style', 'height', 'width'],
    li: ['style'],
    ol: ['style'],
    p: ['style'],
    span: ['style'],
    strong: [],
    ul: ['style'],
    body: [],
  };

  static readonly css: readonly string[] = [
    'background-color',
    'color',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'margin-left',
    'margin-right',
    'text-align',
    'text-decoration',
  ];

  /**
   * Function: XHTML.validTag
   * Utility method to determine whether a tag is allowed in the XHTML_IM namespace.
   *
   * @param tag XHTML tag names are case-sensitive and must be lower-case.
   */
  static validTag(tag: string): tag is XHTMLTags {
    return tag in XHTML.attributes;
  }

  /**
   * Function: XHTML.validAttribute
   * Utility method to determine whether an attribute is allowed as recommended per XEP-0071 for the passed tag
   *
   * @param tag XHTML tag names are case-sensitive and must be lower-case
   * @param attribute XHTML attribute names are case-sensitive and must be lower-case.
   */
  static validAttribute(tag: string, attribute: string): boolean {
    if (!this.validTag(tag)) {
      return false;
    }
    return XHTML.attributes[tag].includes(attribute);
  }

  /**
   * Function: XHTML.validCSS
   * Utility method to determine whether an css style attribute is allowed as recommended per XEP-0071
   *
   * @param style XHTML css style attribute names are case-sensitive and must be lower-case in snake-case.
   */
  static validCSS(style: string): boolean {
    return XHTML.css.includes(style);
  }
}
