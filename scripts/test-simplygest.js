/**
 * BENTIAN ERP BRIDGE — EJECUTOR DE PRUEBAS SIMPLYGEST CONNECTOR
 */

const path = require('path');
const fs = require('fs');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const origResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain) {
  if (request === '@erp-bridge/shared') {
    return path.join(root, 'packages/shared/dist/index.js');
  }
  if (request === '@erp-bridge/sdk') {
    return path.join(root, 'packages/sdk/dist/index.js');
  }
  if (request === '@erp-bridge/connector-factusol') {
    return path.join(root, 'packages/connectors/factusol/dist/index.js');
  }
  if (request === '@erp-bridge/connector-woocommerce') {
    return path.join(root, 'packages/connectors/woocommerce/dist/index.js');
  }
  if (request === '@erp-bridge/connector-simplygest') {
    return path.join(root, 'packages/connectors/simplygest/dist/index.js');
  }
  if (request === '@erp-bridge/core') {
    return path.join(root, 'packages/core/dist/index.js');
  }
  try {
    return origResolve.call(this, request, parent, isMain);
  } catch (err) {
    try {
      const builderCandidate = path.join(root, 'builder/node_modules', request);
      return origResolve.call(this, builderCandidate, parent, isMain);
    } catch {
      throw err;
    }
  }
};

// Execute compiled test spec
require('../packages/connectors/simplygest/dist/test/read-products.spec.js');
