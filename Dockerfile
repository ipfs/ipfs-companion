FROM node:9.4.0-alpine
RUN apk add --update make gcc g++ python
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/package.json
COPY yarn.lock /usr/src/app/yarn.lock
RUN yarn
COPY . /usr/src/app
