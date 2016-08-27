#!/bin/bash
BUILD_TYPE=${1:-$FIREFOX_RELEASE}
echo "Looking up latest URL for $BUILD_TYPE"
BUILD_ROOT="/pub/firefox/tinderbox-builds/mozilla-${BUILD_TYPE}/"
ROOT="https://archive.mozilla.org"
LATEST=$(curl -s "$ROOT$BUILD_ROOT" | grep $BUILD_TYPE | grep -Po '<a href=".+">\K[[:digit:]]+' | sort -n | tail -1)
FILE=$(curl -s "$ROOT$BUILD_ROOT$LATEST/" | grep '.tar.' | grep -Po '<a href="\K[^"]*')
echo "URL: $ROOT$FILE"
exec aria2c -q -o "firefox-${BUILD_TYPE}.tar.bz2" "$ROOT$FILE"
