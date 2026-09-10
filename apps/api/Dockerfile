FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install --package-lock=false
COPY apps/api apps/api
RUN npm run build -w @sentinelx/api
FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist dist
EXPOSE 3001
CMD ["node", "dist/main"]
