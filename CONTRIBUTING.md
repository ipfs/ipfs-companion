# Contributing

Contributions are always welcome!

## Creating New Issues

Do not hesitate and [create a new Issue](https://github.com/ipfs/ipfs-companion/issues/new) if you see a bug, room for improvement or simply have a question.

## Working on existing Issues

Feel free to work on issues that are [not assigned yet](https://github.com/ipfs/ipfs-companion/issues?utf8=✓&q=is%3Aissue+is%3Aopen+no%3Aassignee) and/or ones marked with [help wanted](https://github.com/ipfs/ipfs-companion/issues?q=is%3Aopen+label%3A%22help+wanted%22+no%3Aassignee) tag.  
As a courtesy, please add a comment informing  about your intent. That way we will not duplicate effort.

## Submitting Pull Requests

Just make sure your PR comes with its own tests and does pass [automated TravisCI tests](https://travis-ci.org/ipfs/ipfs-companion/branches).
See the [GitHub Flow Guide](https://guides.github.com/introduction/flow/) for details.

Read section below to get familiar with tools and commands that will make your work easier.

## Translations

Submit PR with a new locale or improve existing ones via [Crowdin](https://crowdin.com/project/ipfs-companion).

## Development

You will need [NodeJS](https://nodejs.org/) and [Firefox](https://www.mozilla.org/en-US/firefox/developer/). Make sure `npm` and `firefox` are in your `PATH`.

### Installing Dependencies

To install all dependencies into to `node_modules` directory, execute:

```bash
npm install
```

### Firefox

One stop command to build, test and deploy add-on to Firefox:

```bash
npm start
```

### Chromium

First, build it manually:

```bash
npm run build
```

Then open up `chrome://extensions` in Chromium-based browser, enable "Developer mode", click "Load unpacked extension..." and point it at `add-on/manifest.json`

## Useful Tasks

Each `npm` task can be run separately. The most useful ones are:

- `npm install` -- install all NPM dependencies
- `npm run build` -- build the add-on (copy external libraries, create `.zip` bundle)
- `npm run yarn-build` -- fast install+build with yarn
- `npm run docker-build` -- reproducible build using yarn.lock and specific version of yarn and node
- `npm test` -- run entire test suite
- `npm run lint` -- check for potential syntax problems (run all linters)
- `npm run lint:standard` -- run [standard](http://standardjs.com) linter ([IPFS JavaScript projects default to standard code style](https://github.com/ipfs/community/blob/master/js-project-guidelines.md#linting--code-style))
- `npm run lint:web-ext` -- run [addons-linter](https://github.com/mozilla/addons-linter) shipped with `web-ext` tool
- `npm run firefox` -- run as temporary add-on in Firefox

### Tips

- You can switch to alternative Firefox version by overriding your `PATH`:

  ```bash
  export PATH="/path/to/alternative/version/of/firefox/:${PATH}"
  ```
