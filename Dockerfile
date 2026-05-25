FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json biome.json opencode.json ./
COPY src/ ./src/
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.44.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
# Install opencode CLI (needed by @opencode-ai/sdk to start the server)
RUN npm install -g opencode-ai@latest --ignore-scripts
# Install Playwright browsers
RUN npx playwright install chromium
COPY --from=builder /app/dist ./dist
COPY opencode.json ./
RUN mkdir -p /app/data
VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
