FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY tsconfig.json package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY keyspot-sdk/apps/ keyspot-sdk/apps/

# Remove .env files — DATABASE_URL comes from the deployment platform
RUN find /app -name ".env" -type f -delete

RUN corepack enable && corepack prepare && pnpm install --frozen-lockfile

# Generate Prisma client (creates TypeScript types from schema)
RUN pnpm --filter @roadsidelab/keyspot-server db:generate

# Build the project
RUN pnpm build

EXPOSE 3000

# DATABASE_URL and DIRECT_URL must be set by the deployment platform (e.g. Neon)
CMD ["sh", "-c", "pnpm --filter @roadsidelab/keyspot-server db:migrate && node packages/@keyspot/server/dist/index.js"]
