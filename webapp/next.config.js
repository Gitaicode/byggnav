/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tybozdgvgebadpasmssr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**', // Återställ till mer generell sökväg
      },
      // Lägg till eventuella andra tillåtna domäner här
    ],
  },
  // ... andra konfigurationer ...
};

module.exports = nextConfig; 