#!/bin/sh
set -ex

IPFS_COMPANION_VERSION=${IPFS_COMPANION_VERSION:-$(jq -r '.version' ./add-on/manifest.common.json)}

id="$(curl --retry 5 --no-progress-meter "https://api.github.com/repos/ipfs/ipfs-companion/releases/tags/v$IPFS_COMPANION_VERSION" | jq '.id')"
assets="$(curl --retry 5 --no-progress-meter --location "https://api.github.com/repos/ipfs/ipfs-companion/releases/$id/assets" | jq -r '.[].name')"

for asset in $assets; do
  curl --retry 5 --no-progress-meter --location --output "build/$asset" "https://github.com/ipfs/ipfs-companion/releases/download/v$IPFS_COMPANION_VERSION/$asset"
done
