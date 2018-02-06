FROM node:9.5.0
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/package.json
COPY yarn.lock /usr/src/app/yarn.lock
RUN npm run ci:install
ENV PATH="/usr/src/app/node_modules/.bin:${PATH}"
COPY . /usr/src/app
