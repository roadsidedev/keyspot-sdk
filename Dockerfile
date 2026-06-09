FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY tsconfig.json package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY keyspot-sdk/apps/ keyspot-sdk/apps/

# Remove .env files so Prisma uses the Docker ENV, not localhost defaults
RUN find /app -name ".env" -type f -delete

RUN corepack enable && corepack prepare && pnpm install --frozen-lockfile

# Generate Prisma client (creates TypeScript types from schema)
RUN pnpm --filter @roadsidelab/keyspot-server db:generate

# Build the project
RUN pnpm build

EXPOSE 3000

ENV DATABASE_URL="postgresql://keyspot:keyspot@postgres:5432/keyspot?schema=public"

CMD ["sh", "-c", "export DATABASE_URL=\"${DATABASE_URL:-postgresql://keyspot:keyspot@postgres:5432/keyspot?schema=public}\" && pnpm --filter @roadsidelab/keyspot-server db:migrate && node packages/@keyspot/server/dist/index.js"]
