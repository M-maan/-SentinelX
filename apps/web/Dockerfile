FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install --package-lock=false
COPY apps/web apps/web
RUN npm run build -w @sentinelx/web
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/web/.next-build .next-build
COPY --from=build /app/apps/web/public public
COPY --from=build /app/apps/web/package.json package.json
COPY --from=build /app/apps/web/next.config.ts next.config.ts
EXPOSE 3000
CMD ["npm", "start"]
