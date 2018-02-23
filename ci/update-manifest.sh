#!/bin/bash
# This script is used by CI setup to update add-on name in manifest
# to explicitly state that produced artifact is a dev build.
set -e

# make it immutable
git checkout add-on/manifest.json

## NAME
# Name includes git revision to make QA and bug reporting easier for users :-)
REVISION=$(git show-ref --head HEAD | head -c 7)
sed -i 's,__MSG_manifest_extensionName__,IPFS Companion (Dev Build @ '"$REVISION"'),' add-on/manifest.json
grep $REVISION add-on/manifest.json

## VERSION
# Browsers do not accept non-numeric values in version string
# so we calculate some sub-versions based on number of commits in master and  current branch
COMMITS_IN_MASTER=$(git rev-list --count refs/remotes/origin/master)
NEW_COMMITS_IN_CURRENT_BRANCH=$(git rev-list --count HEAD ^refs/remotes/origin/master)
# mozilla/addons-linter: Version string must be a string comprising one to four dot-separated integers (0-65535). E.g: 1.2.3.4"
BUILD_VERSION=$(($COMMITS_IN_MASTER*10+$NEW_COMMITS_IN_CURRENT_BRANCH))
sed -i "s|\"version\".*:.*\"\(.*\)\"|\"version\": \"\1.${BUILD_VERSION}\"|" add-on/manifest.json
grep \"version\" add-on/manifest.json

