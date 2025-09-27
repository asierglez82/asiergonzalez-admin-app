const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configurar resolver para evitar errores de assets no encontrados
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Bloquear rutas específicas que causan problemas
config.resolver.blockList = [
  // Bloquear rutas de imágenes de blog que no existen en admin app
  /.*\/img\/blog\/innovationpoc\.png$/,
  /.*\/img\/blog\/cybersecurityquotation\.png$/,
  /.*\/img\/blog\/workingbackwards\.png$/,
  /.*\/img\/blog\/microchips\.png$/,
  /.*\/img\/blog\/southsummit2025\.jpg$/,
  /.*\/img\/blog\/lorawancomparison\.png$/,
  /.*\/img\/blog\/actility\.jpg$/,
  /.*\/img\/blog\/loriot\.png$/,
  /.*\/img\/blog\/ttn\.png$/,
  // Bloquear toda la carpeta img/blog
  /.*\/img\/blog\/.*/,
  /.*\/assets\/img\/blog\/.*/
];

// Configurar para manejar assets no encontrados de manera silenciosa
config.transformer = {
  ...config.transformer,
  assetPlugins: [],
};

module.exports = config;
