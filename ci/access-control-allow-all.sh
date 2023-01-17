#!/bin/sh
set -ex

ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin "${ACCESS_CONTROL_ALLOW_ORIGIN:-[\"*\"]}"
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods "${ACCESS_CONTROL_ALLOW_METHODS:-[\"*\"]}"
