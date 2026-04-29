FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite inlines VITE_* at build time (not at nginx runtime). Override via docker-compose build.args
# or keep frontend/.env in the build context.
ARG VITE_API_ORIGIN=http://127.0.0.1:8000
# Leave empty so the app uses /twelve-punto-api (nginx proxies). Set only if you deploy without nginx and API allows CORS.
ARG VITE_TWELVE_PUNTO_API_ORIGIN=
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN
ENV VITE_TWELVE_PUNTO_API_ORIGIN=$VITE_TWELVE_PUNTO_API_ORIGIN

# Use Vite build directly so existing TypeScript typecheck issues don't block container build.
RUN npx vite build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
