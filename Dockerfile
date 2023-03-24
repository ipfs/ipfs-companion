FROM node:18.14.0

ARG USER_ID
ARG GROUP_ID

RUN curl -s https://ipfs.io/ipfs/QmbukYcmtyU6ZEKt6fepnvrTNa9F6VqsUPMUgNxQjEmphH > /usr/local/bin/jq && chmod +x /usr/local/bin/jq

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
