# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time, so the Convex URL is baked into the
# bundle here — it is not read at runtime. Rebuild to point at another
# deployment. This URL is public by design (the anon client connects to it);
# it is not a secret.
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
RUN test -n "$VITE_CONVEX_URL" || (echo "VITE_CONVEX_URL build arg is required" && exit 1)

RUN npm run build

# ---- serve ----------------------------------------------------------------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
