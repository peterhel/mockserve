FROM alpine:3.5
RUN apk add --no-cache nodejs-current tini
ENTRYPOINT ["/sbin/tini", "--"]

RUN npm install -g mockserve
EXPOSE 4129
ENV DEBUG=*
CMD mockserve