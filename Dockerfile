FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json biome.json ./
COPY src/ ./src/
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.44.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
# Install Playwright browsers
RUN npx playwright install chromium
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data && chown -R pwuser:pwuser /app/data
VOLUME ["/app/data"]
USER pwuser
CMD ["node", "dist/index.js"]
