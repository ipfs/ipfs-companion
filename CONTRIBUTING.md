# Contributing

## Make sure you invest your time in future-proof APIs :-)

Mozilla decided to deprecate old SDK and our main objective is to [rewrite addon using WebExtensions APIs](https://github.com/lidel/ipfs-firefox-addon/issues/20).  
Before you start working on any new PR make sure issue [#20](https://github.com/lidel/ipfs-firefox-addon/issues/20) is closed.   
If not, consider helping there first.

## Work on existing issues

Feel free to work on issues that are [not assigned to me yet](https://github.com/lidel/yt-looper/issues?utf8=✓&q=is%3Aissue+is%3Aopen+no%3Aassignee) or are marked with [help wanted](https://github.com/lidel/ipfs-firefox-addon/issues?q=is%3Aopen+label%3A%22help+wanted%22+no%3Aassignee).
As a courtesy, please add a comment informing  about your intent.


## Create new issues

Do not hesitate and [create a new issue](https://github.com/ipfs-firefox-addon/issues/new)
if you see a bug, a room for improvement or simply have a question.

# Pull Requests

Are welcome :-)

Just make sure PR comes with its own tests and does pass automated TravisCI test.


# Tests

Make sure your changes follow code style and pass basic suite of regression and style tests.

Setting it up is easy. To install all dependencies run:


```bash
npm install jpm grunt grunt-cli -g
npm install

```

Remember to specify Firefox binary via `FIREFOX_BIN`. It will be used by `jpm test`.

Running test suite:


```bash
export FIREFOX_BIN=/path/to/firefox-45.0a2/firefox
npm test

```

And that is all.
