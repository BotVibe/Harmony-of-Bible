# syntax=docker/dockerfile:1
#
# Static site (vanilla JS, no bundler) served by nginx. CI publishes this image to
# ghcr.io/botvibe/harmony-of-bible (.github/workflows/docker-publish.yml);
# deploy/compose.yml pulls it behind Caddy. Only the files the app loads at
# runtime are copied (data/books.json + data/cross_references.txt).

FROM nginx:1.27-alpine

ARG APP_REVISION=unknown
LABEL org.opencontainers.image.revision=$APP_REVISION

COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s/__APP_REVISION__/${APP_REVISION}/g" /etc/nginx/conf.d/default.conf \
 && nginx -t

COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY data/books.json data/cross_references.txt /usr/share/nginx/html/data/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/healthz || exit 1
