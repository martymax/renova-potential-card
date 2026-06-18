# Karta potenciálu — jedna služba: backend obsluhuje i sestavený frontend.
# Vícefázový build: dev závislosti jen pro build, runtime jede čisté Node.

# ---------- build ----------
FROM node:22-slim AS build
WORKDIR /app
COPY . .

# Sub-balíčky se instalují explicitně VČETNĚ devDependencies (tsc, vite, …),
# protože hostingové platformy často zapínají npm production mód.
RUN npm install --prefix web --include=dev \
 && npm install --prefix server --include=dev

# Build frontendu (web/dist) a kompilace backendu (server/dist).
RUN npm --prefix web run build \
 && npm --prefix server run build

# Runtime závislosti backendu (bez dev).
RUN npm install --prefix server --omit=dev

# ---------- runtime ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist

# Railway/hosting předá PORT přes proměnnou prostředí; server ji čte.
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
