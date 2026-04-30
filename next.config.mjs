/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include the SQLite database and sql.js WASM binary in the serverless function bundle
  outputFileTracingIncludes: {
    '/api/brands': ['./data/**/*', './node_modules/sql.js/dist/sql-wasm.wasm'],
    '/api/brands/timeline': ['./data/**/*', './node_modules/sql.js/dist/sql-wasm.wasm'],
    '/api/brands/metadata': ['./data/**/*', './node_modules/sql.js/dist/sql-wasm.wasm'],
  },
};

export default nextConfig;
