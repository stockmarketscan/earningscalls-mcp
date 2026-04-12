FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ src/
COPY tsconfig.json .
RUN npx tsc

FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/ dist/
EXPOSE 3000
CMD ["node", "dist/http.js"]
