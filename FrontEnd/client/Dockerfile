# ---- Build stage: produce the static React build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# REACT_APP_* vars are baked in at build time. Default points at the
# backend on localhost:5454 (browser talks to it directly).
ARG REACT_APP_API_BASE_URL=http://localhost:5454
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN npm run build

# ---- Run stage: serve the static build with nginx ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
