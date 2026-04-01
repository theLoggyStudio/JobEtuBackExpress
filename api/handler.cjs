'use strict';

/**
 * Entrée serverless explicite : utile si la détection automatique Express (src/index.ts) ne crée pas de fonction.
 * Nécessite `npm run build:plain` (dist/src/index.js).
 */
module.exports = require('../dist/src/index.js').default;
