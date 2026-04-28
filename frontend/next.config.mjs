/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/upload',      destination: '/ingest',   permanent: true },
      { source: '/exceptions',  destination: '/review',   permanent: true },
      { source: '/chat',        destination: '/insights', permanent: true },
      { source: '/export',      destination: '/reports',  permanent: true },
      { source: '/users',       destination: '/team',     permanent: true },
      { source: '/rules',       destination: '/config',   permanent: true },
      { source: '/master-data', destination: '/config',   permanent: true },
    ]
  },
}
export default nextConfig
