const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push(
    // Adds support for `.db` files for SQLite databases
    'db',
    'wav', // For audio files
    'gguf', // For LLM models
    'zip' // For zipped assets
);
// Add COEP and COOP headers to support SharedArrayBuffer
config.server.enhanceMiddleware = (middleware) => {
    return (req, res, next) => {
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        middleware(req, res, next);
    };
};

module.exports = config;
