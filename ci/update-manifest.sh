#!/bin/bash
# This script is used by CI setup to update add-on name in manifest
# to explicitly state that produced artifact is a dev build.
set -e

MANIFEST=add-on/manifest.common.json

# restore original in case it was modified manually
test -d .git && git checkout -- $MANIFEST

# skip all manifest mutations when building for stable channel
if [ "$RELEASE_CHANNEL" = "stable" ]; then
    echo "Skipping manifest modification (RELEASE_CHANNEL=${RELEASE_CHANNEL})"
    exit 0
fi

# Use jq for JSON operations
function set-manifest {
  jq -M --indent 2 "$1" < $MANIFEST > tmp.json && mv tmp.json $MANIFEST
}

## Set NAME
# Name includes git revision to make QA and bug reporting easier for users :-)
REVISION=$(git show-ref --head HEAD | head -c 7)
if [ "$RELEASE_CHANNEL" = "beta" ]; then
    set-manifest ".name = \"IPFS Companion (Beta @ $REVISION)\""
else
    set-manifest ".name = \"IPFS Companion (Dev Build @ $REVISION)\""
fi
grep $REVISION $MANIFEST

## Set VERSION
# Browsers do not accept non-numeric values in version string
# so we calculate some sub-versions based on number of commits in master and  current branch
# mozilla/addons-linter: Version string must be a string comprising one to four dot-separated integers (0-65535). E.g: 1.2.3.4"
BUILD_VERSION=$(git rev-list --count --first-parent HEAD)
set-manifest ".version = (.version + \".${BUILD_VERSION}\")"
grep \"version\" $MANIFEST
