FROM node:14-slim

ADD ./bundle /bundle
ADD ./serve.js /serve.js
ADD ./franchise-client /franchise-client
WORKDIR /franchise-client
RUN yarn install
WORKDIR /


EXPOSE 80 14645
COPY ./docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
