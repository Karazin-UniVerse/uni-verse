FROM node:24.20.0-alpine
RUN apk add --no-cache nginx curl bash lsof
WORKDIR /app
COPY docker/frontend /app/docker/frontend
COPY tests/container/fixture.mjs /app/fixture.mjs
RUN chmod +x /app/fixture.mjs && mkdir -p /app/packages/uni-hub/node_modules/.bin /app/packages/grip/frontend/node_modules/.bin \
    && ln -s /app/fixture.mjs /app/packages/uni-hub/node_modules/.bin/next \
    && ln -s /app/fixture.mjs /app/packages/grip/frontend/node_modules/.bin/next
ENV PORT=8080
USER node
CMD ["bash", "/app/docker/frontend/entrypoint.sh"]
