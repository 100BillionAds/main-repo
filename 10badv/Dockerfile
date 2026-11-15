# 백억광고 (10badv) 프로덕션 이미지
# 커스텀 서버(server.js: Next.js + Socket.io + 자동정산 스케줄러)를 실행한다.
# Next.js standalone 출력은 자체 server.js 를 생성해 커스텀 서버와 충돌하므로 사용하지 않는다.

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- 전체 의존성 (빌드용) ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---- 운영 의존성만 ----
FROM base AS prod-deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- 빌드 ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* 값은 빌드 시점에 클라이언트 번들에 박힌다. 실행 시 환경변수로는 바꿀 수 없다.
ARG NEXT_PUBLIC_PORTONE_STORE_ID=""
ARG NEXT_PUBLIC_PORTONE_CHANNEL_KEY=""
ARG NEXT_PUBLIC_PORTONE_PAY_METHOD=""
ARG NEXT_PUBLIC_PAYMENT_MOCK_MODE="false"
ENV NEXT_PUBLIC_PORTONE_STORE_ID=$NEXT_PUBLIC_PORTONE_STORE_ID \
    NEXT_PUBLIC_PORTONE_PAY_METHOD=$NEXT_PUBLIC_PORTONE_PAY_METHOD \
    NEXT_PUBLIC_PORTONE_CHANNEL_KEY=$NEXT_PUBLIC_PORTONE_CHANNEL_KEY \
    NEXT_PUBLIC_PAYMENT_MOCK_MODE=$NEXT_PUBLIC_PAYMENT_MOCK_MODE
RUN npm run build

# ---- 실행 ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/next.config.mjs /app/server.js ./

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
