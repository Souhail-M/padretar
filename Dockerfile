# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time, so the Convex URL is baked into the
# bundle here — it is never read at runtime. Pointing at another deployment
# means rebuilding, not restarting.
#
# In Coolify: set VITE_CONVEX_URL in the resource's Environment Variables and
# tick "Build Variable" so it reaches the image build. A plain runtime
# variable will NOT work — the build below fails on purpose rather than
# shipping a bundle wired to "undefined", which looks like a blank app.
#
# The URL is public by design (the browser connects straight to it) and is
# not a secret.
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

RUN if [ -z "$VITE_CONVEX_URL" ]; then \
      echo "──────────────────────────────────────────────────────────────"; \
      echo " Build stopped: VITE_CONVEX_URL is empty."; \
      echo ""; \
      echo " Coolify → your resource → Environment Variables:"; \
      echo "   VITE_CONVEX_URL=https://<your-deployment>.convex.cloud"; \
      echo "   and tick 'Build Variable'."; \
      echo ""; \
      echo " Without it the app builds but connects to nothing."; \
      echo "──────────────────────────────────────────────────────────────"; \
      exit 1; \
    fi

RUN npm run build

# ---- serve ----------------------------------------------------------------
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Coolify polls this to decide whether a deploy succeeded before switching
# traffic over. wget ships with the busybox in nginx:alpine.
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1
