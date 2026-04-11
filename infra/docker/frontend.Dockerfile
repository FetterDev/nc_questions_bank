FROM node:20-alpine AS builder
WORKDIR /workspace/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
COPY backend/openapi.json /workspace/backend/openapi.json
RUN npm run build:with-sdk

FROM nginx:1.27-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
