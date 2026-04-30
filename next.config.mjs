/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include the SQLite database in the serverless function bundle
  outputFileTracingIncludes: {
    '/api/brands': ['./data/**/*'],
    '/api/brands/timeline': ['./data/**/*'],
    '/api/brands/metadata': ['./data/**/*'],
  },
  // Ensure better-sqlite3 is treated as an external package (native module)
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
