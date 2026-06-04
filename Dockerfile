FROM node:22-slim

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/ packages/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build the project
RUN pnpm build

EXPOSE 3000

CMD ["node", "packages/@agentguard/server/dist/index.js"]
