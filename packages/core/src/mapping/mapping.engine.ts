import { CanonicalProduct, FieldMapping } from '@erp-bridge/shared';

export class MappingEngine {
  public applyMappings(
    products: CanonicalProduct[],
    mappings?: FieldMapping[]
  ): CanonicalProduct[] {
    if (!mappings || mappings.length === 0) {
      return products;
    }

    return products.map((product) => this.applyMappingToProduct(product, mappings));
  }

  public applyMappingToProduct(
    product: CanonicalProduct,
    mappings: FieldMapping[]
  ): CanonicalProduct {
    const cloned: CanonicalProduct = {
      ...product,
      attributes: { ...product.attributes },
      categories: [...product.categories],
    };

    for (const m of mappings) {
      const sourceVal = this.getFieldValue(product, m.sourceField);
      const transformed = this.transformValue(sourceVal ?? m.defaultValue, m.transformation);
      this.setFieldValue(cloned, m.destinationField, transformed);
    }

    return cloned;
  }

  private getFieldValue(product: CanonicalProduct, fieldPath: string): unknown {
    const parts = fieldPath.split('.');
    let current: unknown = product;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private setFieldValue(product: CanonicalProduct, fieldPath: string, value: unknown): void {
    const parts = fieldPath.split('.');
    let current: Record<string, unknown> = product as unknown as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1]!;
    current[lastPart] = value;
  }

  private transformValue(value: unknown, transformation?: string): unknown {
    if (!transformation || value === undefined || value === null) {
      return value;
    }

    const trimmed = transformation.trim().toLowerCase();

    if (trimmed === 'uppercase' && typeof value === 'string') {
      return value.toUpperCase();
    }
    if (trimmed === 'lowercase' && typeof value === 'string') {
      return value.toLowerCase();
    }
    if (trimmed === 'trim' && typeof value === 'string') {
      return value.trim();
    }
    if (trimmed.startsWith('prefix:') && typeof value === 'string') {
      const prefix = transformation.substring(7);
      return `${prefix}${value}`;
    }
    if (trimmed.startsWith('suffix:') && typeof value === 'string') {
      const suffix = transformation.substring(7);
      return `${value}${suffix}`;
    }
    if (trimmed.startsWith('multiply:') && typeof value === 'number') {
      const factor = parseFloat(transformation.substring(9));
      return isNaN(factor) ? value : Math.round(value * factor * 100) / 100;
    }

    return value;
  }
}
