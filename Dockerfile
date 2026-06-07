FROM node:22-slim

WORKDIR /app

COPY tsconfig.json package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY keyspot-sdk/apps/ keyspot-sdk/apps/

RUN corepack enable && corepack prepare && pnpm install --frozen-lockfile

# Generate Prisma client (creates TypeScript types from schema)
RUN pnpm --filter @roadsidelab/keyspot-server db:generate

# Build the project
RUN pnpm build

EXPOSE 3000

CMD ["node", "packages/@keyspot/server/dist/index.js"]
