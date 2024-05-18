FROM node:current as builder

WORKDIR /build

# Add Files
ADD . .

# Build
RUN yarn install && yarn build

FROM node:current as prod-modules

WORKDIR /build
ADD package.json .
ADD yarn.lock .

ENV NODE_ENV=production

RUN yarn install

FROM node:22-alpine

COPY --from=builder /build/build/* /app
COPY --from=prod-modules /build/node_modules /app/node_modules

WORKDIR /app

ENV NODE_ENV=production

CMD [ "node", "main.js" ]