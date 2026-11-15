/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,

  // 서버 전용 패키지는 번들에 넣지 않고 node_modules 에서 그대로 불러온다.
  // (BullMQ 와 우리 코드가 같은 ioredis 모듈을 쓰게 하고, 번들링으로 인한 문제를 피한다)
  serverExternalPackages: ['bullmq', 'ioredis'],

  // 프로덕션 최적화
  compiler: {
    // 운영에서도 오류/경고 로그는 남긴다 (장애 원인 추적용)
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '10badv.s3.ap-northeast-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // 보안 헤더
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.portone.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.kakaopay.com https://*.kakaocdn.net https://res.cloudinary.com https://*.amazonaws.com https://i.pravatar.cc https://via.placeholder.com https://images.unsplash.com; font-src 'self' data:; connect-src 'self' https://*.kakaopay.com https://*.amazonaws.com https://api.portone.io https://cdn.portone.io https://*.iamport.co https://*.iamport.kr wss: ws:; frame-src 'self' https://*.kakaopay.com https://*.kakao.com https://*.portone.io https://*.iamport.kr https://*.iamport.co; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },

  // Vercel에서는 standalone 불필요 (Docker 배포 시에만 사용)
  // output: 'standalone',
};

export default nextConfig;
