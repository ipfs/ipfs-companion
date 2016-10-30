# Contributing

## Work on existing issues

Feel free to work on issues that are [not assigned to me yet](https://github.com/lidel/yt-looper/issues?utf8=✓&q=is%3Aissue+is%3Aopen+no%3Aassignee) or are marked with [help wanted](https://github.com/lidel/ipfs-firefox-addon/issues?q=is%3Aopen+label%3A%22help+wanted%22+no%3Aassignee).
As a courtesy, please add a comment informing  about your intent. That way we will not duplicate effort.


## Create new Issue

Do not hesitate and [create a new Issue](https://github.com/ipfs-firefox-addon/issues/new)
if you see a bug, a room for improvement or simply have a question.

## Submit Pull Requests

Pull Requests are welcome :-)

Just make sure your PR comes with its own tests and does pass [automated TravisCI tests](https://travis-ci.org/lidel/ipfs-firefox-addon/branches) against different Firefox versions.

Read section below to get familiar with tools that will make your work easier.

## WebExtension Development

You will need [NodeJS](https://nodejs.org/) and [Firefox](https://www.mozilla.org/en-US/firefox/developer/). Make sure `npm` and `firefox` are in your `PATH`.  

First step is easy and needs to be run only once. To install all dependencies into to `node_modules` directory, execute:

```bash
npm install
```

Then, there is a handy one stop command to build, test and deploy add-on in Firefox:

```bash
npm start
```

###  Tasks

Each `npm` task can be run separately. The most useful ones are:

- `npm install` -- install all NPM dependencies
- `npm run build` -- build the add-on (copy external libraries, create `.zip` bundle)
- `npm test` -- run entire test suite (both unit and functional tests)
- `npm test:unit` -- run unit tests only
- `npm test:functional` -- run functional tests only
- `npm run lint` -- check for potential syntax problems (run all linters)
- `npm run lint:standard` -- run [standard](http://standardjs.com) linter ([IPFS JavaScript projects default to standard code style](https://github.com/ipfs/community/blob/master/js-project-guidelines.md#linting--code-style))
- `npm run lint:web-ext` -- run [addons-linter](https://github.com/mozilla/addons-linter) shipped with `web-ext` tool
- `npm run firefox` -- run as temporary add-on in Firefox

### Tips

- You can switch to alternative Firefox version by overriding your `PATH`:

  ```bash
  export PATH="/path/to/alternative/version/of/firefox/:${PATH}"
  ``` 
- FOO
