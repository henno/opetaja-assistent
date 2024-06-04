const sveltePreprocess = require("svelte-preprocess");

module.exports = {
    preprocess: sveltePreprocess({
        sourceMap: true // Ensure preprocessors generate source maps for debugging
    }),
    compilerOptions: {
        dev: process.env.NODE_ENV !== 'production',
        sourcemap: true // Enable source maps for Svelte compiler output
    }
};
