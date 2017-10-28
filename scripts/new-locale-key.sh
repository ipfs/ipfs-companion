#!/bin/bash

read -p "Key: " key
read -p "Message: " message

dir=$(dirname $0)

cat $dir/../add-on/_locales/en/messages.json | \
    jq --arg foo bar ". + {\"${key}\": {\"message\": \"${message}\"}}" | \
    sponge $dir/../add-on/_locales/en/messages.json

tail -10 $dir/../add-on/_locales/en/messages.json
