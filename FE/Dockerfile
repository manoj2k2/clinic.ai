FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies based on package.json and package-lock.json (if present)
COPY package*.json ./
COPY proxy.conf.json ./

RUN npm install --silent -f

# Copy the rest of the application source code
COPY . ./

# Build the Angular application for production
# RUN npm run build -- --output-path=dist --configuration=production
RUN npm run build -- --output-path=dist 

# ----------
# Runtime image
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Optional: copy custom nginx config if you have one
# COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
