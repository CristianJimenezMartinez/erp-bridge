import assert from 'assert';
import { CanonicalProduct, Logger } from '@erp-bridge/shared';
import {
  groupProductsByParent,
  toWooCommerceVariationPayload,
  WooCommerceVariationHandler,
} from '../src/handlers/variation.handler';
import { WooCommerceConnector } from '../src/woocommerce.connector';

async function runWooCommerceVariationTests() {
  console.log('--- Running WooCommerce Variation & Parent-Child Tests ---');

  // =========================================================================
  // 1. Agrupación de 6 variantes en 2 productos padres
  // =========================================================================
  console.log('Testing grouping of 6 variations into 2 parent products...');

  // 3 variantes para CAMISA (con parentSku y atributos de talla/color)
  const camisaS: CanonicalProduct = {
    id: 'f_camisa_s',
    sku: 'CAMISA-S-AZUL',
    name: 'Camisa Manga Larga - S Azul',
    regularPrice: 29.95,
    stockQuantity: 10,
    manageStock: true,
    inStock: true,
    status: 'published',
    categories: [],
    images: [],
    attributes: { parentSku: 'CAMISA', talla: 'S', color: 'Azul' },
  };

  const camisaM: CanonicalProduct = {
    id: 'f_camisa_m',
    sku: 'CAMISA-M-AZUL',
    name: 'Camisa Manga Larga - M Azul',
    regularPrice: 29.95,
    stockQuantity: 15,
    manageStock: true,
    inStock: true,
    status: 'published',
    categories: [],
    images: [],
    attributes: { parentSku: 'CAMISA', talla: 'M', color: 'Azul' },
  };

  const camisaL: CanonicalProduct = {
    id: 'f_camisa_l',
    sku: 'CAMISA-L-ROJO',
    name: 'Camisa Manga Larga - L Rojo',
    regularPrice: 32.50,
    stockQuantity: 5,
    manageStock: true,
    inStock: true,
    status: 'published',
    categories: [],
    images: [],
    attributes: { parentSku: 'CAMISA', talla: 'L', color: 'Rojo' },
  };

  // 3 variantes para PANTALON (con prefijo de SKU y atributos Factusol CP1..CP2)
  const pantalon38: CanonicalProduct = {
    id: 'f_pantalon_38',
    sku: 'PANTALON-38-NEGRO',
    name: 'Pantalón Chino - 38 Negro',
    regularPrice: 45.00,
    stockQuantity: 8,
    manageStock: true,
    inStock: true,
    status: 'published',
    categories: [],
    images: [],
    attributes: { cp1: '38', cp2: 'Negro' },
  };

  const pantalon40: CanonicalProduct = {
    id: 'f_pantalon_40',
    sku: 'PANTALON-40-NEGRO',
    name: 'Pantalón Chino - 40 Negro',
    regularPrice: 45.00,
    stockQuantity: 12,
    manageStock: true,
    inStock: true,
    status: 'published',
    categories: [],
    images: [],
    attributes: { cp1: '40', cp2: 'Negro' },
  };

  const pantalon42: CanonicalProduct = {
    id: 'f_pantalon_42',
    sku: 'PANTALON-42-AZUL',
    name: 'Pantalón Chino - 42 Azul',
    regularPrice: 48.00,
    stockQuantity: 6,
    manageStock: true,
    inStock: true,
    status: 'published',
    categories: [],
    images: [],
    attributes: { cp1: '42', cp2: 'Azul' },
  };

  const sixVariations = [camisaS, camisaM, camisaL, pantalon38, pantalon40, pantalon42];

  // Caso A: Solo variantes proporcionadas
  const groupedOnlyVariations = groupProductsByParent(sixVariations);
  assert.strictEqual(groupedOnlyVariations.size, 2, 'Debe haber exactamente 2 grupos padres');
  assert.ok(groupedOnlyVariations.has('CAMISA'), 'Debe contener el grupo CAMISA');
  assert.ok(groupedOnlyVariations.has('PANTALON'), 'Debe contener el grupo PANTALON');

  const camisaGroup = groupedOnlyVariations.get('CAMISA')!;
  assert.strictEqual(camisaGroup.variations.length, 3, 'El grupo CAMISA debe tener 3 variaciones');
  assert.strictEqual(camisaGroup.parent, undefined, 'El padre no está presente en la lista de solo variantes');

  const pantalonGroup = groupedOnlyVariations.get('PANTALON')!;
  assert.strictEqual(pantalonGroup.variations.length, 3, 'El grupo PANTALON debe tener 3 variaciones');
  assert.strictEqual(pantalonGroup.parent, undefined, 'El padre no está presente en la lista de solo variantes');

  // Caso B: Padres incluidos explícitamente en el conjunto
  const camisaPadre: CanonicalProduct = {
    id: 'f_camisa_padre',
    sku: 'CAMISA',
    name: 'Camisa Manga Larga Variable',
    regularPrice: 29.95,
    stockQuantity: 30,
    manageStock: false,
    inStock: true,
    status: 'published',
    categories: [{ id: 'ROPA', name: 'Ropa' }],
    images: [{ url: 'https://example.com/camisa.jpg', alt: 'Camisa' }],
    attributes: {},
  };

  const pantalonPadre: CanonicalProduct = {
    id: 'f_pantalon_padre',
    sku: 'PANTALON',
    name: 'Pantalón Chino Variable',
    regularPrice: 45.00,
    stockQuantity: 26,
    manageStock: false,
    inStock: true,
    status: 'published',
    categories: [{ id: 'ROPA', name: 'Ropa' }],
    images: [{ url: 'https://example.com/pantalon.jpg', alt: 'Pantalon' }],
    attributes: {},
  };

  const allWithParents = [camisaPadre, pantalonPadre, ...sixVariations];
  const groupedWithParents = groupProductsByParent(allWithParents);
  assert.strictEqual(groupedWithParents.size, 2, 'Debe haber 2 grupos padres con los padres incluidos');

  const camisaFullGroup = groupedWithParents.get('CAMISA')!;
  assert.ok(camisaFullGroup.parent, 'El grupo CAMISA debe tener el producto padre asignado');
  assert.strictEqual(camisaFullGroup.parent!.sku, 'CAMISA');
  assert.strictEqual(camisaFullGroup.variations.length, 3);

  const pantalonFullGroup = groupedWithParents.get('PANTALON')!;
  assert.ok(pantalonFullGroup.parent, 'El grupo PANTALON debe tener el producto padre asignado');
  assert.strictEqual(pantalonFullGroup.parent!.sku, 'PANTALON');
  assert.strictEqual(pantalonFullGroup.variations.length, 3);

  console.log('✓ Agrupación de 6 variantes en 2 productos padres verificada correctamente.');

  // =========================================================================
  // 2. Generación de payloads de variación con atributos de talla y color
  // =========================================================================
  console.log('Testing WooCommerce variation payload generation with size and color attributes...');

  // Prueba con atributos estándar (talla, color)
  const payloadCamisaM = toWooCommerceVariationPayload(camisaM);
  assert.strictEqual(payloadCamisaM['sku'], 'CAMISA-M-AZUL');
  assert.strictEqual(payloadCamisaM['regular_price'], '29.95');
  assert.strictEqual(payloadCamisaM['manage_stock'], true);
  assert.strictEqual(payloadCamisaM['stock_quantity'], 15);
  assert.strictEqual(payloadCamisaM['status'], 'publish');

  const attrsM = payloadCamisaM['attributes'] as Array<{ name: string; option: string }>;
  assert.ok(Array.isArray(attrsM), 'Attributes debe ser un array');
  assert.strictEqual(attrsM.length, 2, 'Debe incluir 2 atributos de variación (Talla y Color)');

  const tallaAttr = attrsM.find((a) => a.name === 'Talla');
  const colorAttr = attrsM.find((a) => a.name === 'Color');
  assert.ok(tallaAttr, 'Debe contener el atributo Talla');
  assert.strictEqual(tallaAttr!.option, 'M');
  assert.ok(colorAttr, 'Debe contener el atributo Color');
  assert.strictEqual(colorAttr!.option, 'Azul');

  // Prueba con atributos Factusol CP1 y CP2
  const payloadPantalon38 = toWooCommerceVariationPayload(pantalon38);
  assert.strictEqual(payloadPantalon38['sku'], 'PANTALON-38-NEGRO');
  assert.strictEqual(payloadPantalon38['regular_price'], '45');
  assert.strictEqual(payloadPantalon38['stock_quantity'], 8);

  const attrsPantalon = payloadPantalon38['attributes'] as Array<{ name: string; option: string }>;
  const tallaP = attrsPantalon.find((a) => a.name === 'Talla');
  const colorP = attrsPantalon.find((a) => a.name === 'Color');
  assert.ok(tallaP, 'Factusol CP1 debe mapear a Talla');
  assert.strictEqual(tallaP!.option, '38');
  assert.ok(colorP, 'Factusol CP2 debe mapear a Color');
  assert.strictEqual(colorP!.option, 'Negro');

  // Prueba con atributos en inglés (size, colour) y precio rebajado
  const englishProduct: CanonicalProduct = {
    id: 'f_jacket_xl',
    sku: 'JACKET-XL-RED',
    name: 'Winter Jacket XL Red',
    regularPrice: 89.90,
    salePrice: 69.90,
    stockQuantity: 4,
    manageStock: true,
    inStock: true,
    status: 'published',
    categories: [],
    images: [{ url: 'https://example.com/jacket-red.jpg' }],
    attributes: { size: 'XL', colour: 'Red' },
  };

  const payloadEnglish = toWooCommerceVariationPayload(englishProduct);
  assert.strictEqual(payloadEnglish['sku'], 'JACKET-XL-RED');
  assert.strictEqual(payloadEnglish['regular_price'], '89.9');
  assert.strictEqual(payloadEnglish['sale_price'], '69.9');
  assert.strictEqual(payloadEnglish['stock_quantity'], 4);
  const attrsEnglish = payloadEnglish['attributes'] as Array<{ name: string; option: string }>;
  assert.strictEqual(attrsEnglish.find((a) => a.name === 'Talla')?.option, 'XL');
  assert.strictEqual(attrsEnglish.find((a) => a.name === 'Color')?.option, 'Red');

  console.log('✓ Generación de payloads de variación con atributos verificada correctamente.');

  // =========================================================================
  // 3. Simulación de actualización de stock de variación
  // =========================================================================
  console.log('Testing WooCommerce variation stock synchronization...');

  const capturedPuts: Array<{ endpoint: string; data: Record<string, unknown> }> = [];
  const mockClient: any = {
    put: async (endpoint: string, data: Record<string, unknown>) => {
      capturedPuts.push({ endpoint, data });
      return { id: 5678, stock_quantity: data['stock_quantity'] };
    },
  };

  const variationHandler = new WooCommerceVariationHandler(mockClient, new Logger('TestVariationHandler'));

  // Sincronización normal
  const syncOk = await variationHandler.syncVariationStock(1234, 5678, 25);
  assert.strictEqual(syncOk, true, 'La sincronización debe retornar true en caso de éxito');
  assert.strictEqual(capturedPuts.length, 1);
  assert.strictEqual(capturedPuts[0]?.endpoint, 'products/1234/variations/5678');
  assert.strictEqual(capturedPuts[0]?.data['manage_stock'], true);
  assert.strictEqual(capturedPuts[0]?.data['stock_quantity'], 25);
  assert.strictEqual(capturedPuts[0]?.data['in_stock'], true);
  assert.strictEqual(capturedPuts[0]?.data['stock_status'], 'instock');

  // Sincronización con stock 0 (agotado)
  const syncZero = await variationHandler.syncVariationStock(1234, 5678, 0);
  assert.strictEqual(syncZero, true);
  assert.strictEqual(capturedPuts.length, 2);
  assert.strictEqual(capturedPuts[1]?.data['stock_quantity'], 0);
  assert.strictEqual(capturedPuts[1]?.data['in_stock'], false);
  assert.strictEqual(capturedPuts[1]?.data['stock_status'], 'outofstock');

  // Sincronización con stock negativo (debe acotarse a 0)
  const syncNeg = await variationHandler.syncVariationStock(1234, 5678, -5);
  assert.strictEqual(syncNeg, true);
  assert.strictEqual(capturedPuts.length, 3);
  assert.strictEqual(capturedPuts[2]?.data['stock_quantity'], 0);
  assert.strictEqual(capturedPuts[2]?.data['in_stock'], false);

  // Simulación de error en la API de WooCommerce (debe retornar false y no arrojar excepción no controlada)
  const failingClient: any = {
    put: async () => {
      throw new Error('404 Not Found - Variation does not exist');
    },
  };
  const failingHandler = new WooCommerceVariationHandler(failingClient, new Logger('FailingTestHandler'));
  const syncFail = await failingHandler.syncVariationStock(9999, 8888, 10);
  assert.strictEqual(syncFail, false, 'Debe retornar false si la API rechaza la petición');

  // =========================================================================
  // 4. Verificación de capacidades y delegación en WooCommerceConnector
  // =========================================================================
  console.log('Testing WooCommerceConnector capability and delegation...');

  const connector = new WooCommerceConnector();
  const capabilities = connector.getCapabilities();
  assert.strictEqual(capabilities.supportsVariations, true, 'El conector debe tener capability supportsVariations: true');

  // Agrupación vía conector
  const connectorGrouped = connector.groupProductsByParent(sixVariations);
  assert.strictEqual(connectorGrouped.size, 2);

  // Mapeo de payload de variación vía conector
  const connectorPayload = connector.toWooCommerceVariationPayload(camisaM);
  assert.strictEqual(connectorPayload['sku'], 'CAMISA-M-AZUL');

  console.log('✓ WooCommerce Variation Tests Passed Successfully');
}

runWooCommerceVariationTests().catch((err) => {
  console.error('❌ Error en test de variaciones de WooCommerce:', err);
  process.exit(1);
});
