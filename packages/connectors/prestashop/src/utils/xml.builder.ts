import { XMLBuilder, XMLParser } from 'fast-xml-parser';

export class PrestaShopXml {
  private static readonly builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: false,
    suppressEmptyNode: false,
  });

  private static readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    trimValues: true,
  });

  public static build(resourceName: string, data: Record<string, unknown>): string {
    const payload = {
      prestashop: {
        '@_xmlns:xlink': 'http://www.w3.org/1999/xlink',
        [resourceName]: data,
      },
    };
    return PrestaShopXml.builder.build(payload);
  }

  public static parse<T = Record<string, unknown>>(xmlString: string): T {
    return PrestaShopXml.parser.parse(xmlString) as T;
  }

  public static toLanguageNode(text: string, langId = 1): { language: { '@_id': string; '#text': string } } {
    return {
      language: {
        '@_id': String(langId),
        '#text': text,
      },
    };
  }

  public static extractLanguageText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        const item = first as Record<string, unknown>;
        if (typeof item['value'] === 'string') return item['value'];
        if (typeof item['#text'] === 'string') return item['#text'];
      }
      return '';
    }
    if (typeof value === 'object' && value !== null) {
      const v = value as { language?: { '#text'?: string; value?: string } | Array<{ '#text'?: string; value?: string }>; value?: string; '#text'?: string };
      if (Array.isArray(v.language)) {
        const first = v.language[0];
        return first?.['#text'] || first?.value || '';
      }
      if (v.language && typeof v.language === 'object') {
        return v.language['#text'] || v.language.value || '';
      }
      if (typeof v.value === 'string') return v.value;
      if (typeof v['#text'] === 'string') return v['#text'];
    }
    return '';
  }
}
