# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
#COPY package-lock.json .
RUN npm install
COPY . .
RUN chmod -R +x node_modules/.bin
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 
