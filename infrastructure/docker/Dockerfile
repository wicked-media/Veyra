# Veyra application image.
#
# This image is intended for local/staging evaluation. It includes development
# dependencies so migrations and the TypeScript worker can run. A production
# image should prune dev dependencies and use dedicated migration tooling.
FROM node:22-bookworm-slim

RUN npm install -g pnpm@10.34.9
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "--filter", "@veyra/web", "start"]
