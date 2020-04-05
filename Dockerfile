FROM node:12.16.1

ARG USER_ID
ARG GROUP_ID

RUN curl -s https://ipfs.io/ipfs/QmbukYcmtyU6ZEKt6fepnvrTNa9F6VqsUPMUgNxQjEmphH > /usr/local/bin/jq && chmod +x /usr/local/bin/jq

RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY . /home/node/app

RUN if [ ${USER_ID:-0} -ne 0 ] && [ ${GROUP_ID:-0} -ne 0 ]; then \
    userdel -f node && \
    if getent group node ; then groupdel node; fi && \
    groupadd -g ${GROUP_ID} node && \
    useradd -l -u ${USER_ID} -g node node && \
    chown -fhR ${USER_ID}:${GROUP_ID} /home/node; fi

USER node

RUN npm run ci:install

ENV PATH="/home/node/app/node_modules/.bin:${PATH}"
