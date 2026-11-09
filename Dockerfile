FROM node:24-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:24-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node backend/ ./
COPY --from=frontend-build --chown=node:node /build/frontend/dist /app/frontend/dist
USER node
EXPOSE 3000
CMD ["node", "index.js"]