FROM node:22.19.0

ARG USER_ID
ARG GROUP_ID

RUN apt-get update && apt-get install -y --no-install-recommends jq && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/node/app
RUN if [ ${USER_ID:-0} -ne 0 ] && [ ${GROUP_ID:-0} -ne 0 ]; then \
    userdel -f node && \
    if getent group node ; then groupdel node; fi && \
    if getent passwd ${USER_ID} ; then userdel -f $(getent passwd ${USER_ID} | cut -d: -f1); fi && \
    if getent group ${GROUP_ID} ; then groupdel $(getent group ${GROUP_ID} | cut -d: -f1); fi && \
    groupadd -g ${GROUP_ID} node && \
    useradd -l -u ${USER_ID} -g node node; fi
RUN chown -fhR node:node /home/node

WORKDIR /home/node/app

COPY --chown=node:node ./package.json ./package-lock.json /home/node/app/

USER node

RUN npm run ci:install

COPY --chown=node:node . /home/node/app

ENV PATH="/home/node/app/node_modules/.bin:${PATH}"
