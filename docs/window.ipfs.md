# Notes on exposing IPFS API via `window.ipfs`

> ### Disclaimer:
> - ### [🚧 ongoing work on v2 of this interface 🚧](https://github.com/ipfs-shipyard/ipfs-companion/issues/589)
>   - Want to help with shaping it? See [#589](https://github.com/ipfs-shipyard/ipfs-companion/issues/589) and [issues with `window.ipfs` label](https://github.com/ipfs-shipyard/ipfs-companion/labels/window.ipfs).
> - ### ⚠️ the interface is experimental and might change ⚠️
>   - **tl;dr** use [window.ipfs-fallback](https://www.npmjs.com/package/window.ipfs-fallback) to ensure your app follows any future changes

- [Background](#background)
- [Creating applications using `window.ipfs`](#creating-applications-using-windowipfs)
    - [Error Codes](#error-codes)
- [Q&A](#qa)
    - [What is a `window.ipfs`?](#what-is-a-windowipfs)
    - [How do I fallback if `window.ipfs` is not available?](#how-do-i-fallback-if-windowipfs-is-not-available)
    - [What about IPFS node configuration?](#what-about-ipfs-node-configuration)
    - [Is there a Permission Control (ACL)?](#is-there-a-permission-control-acl)
    - [Do I need to confirm every API call?](#do-i-need-to-confirm-every-api-call)
    - [Can I disable this for now?](#can-i-disable-this-for-now)
    - [How are permissions scoped?](#how-are-permissions-scoped)
    - [Are mutable file system (MFS) files sandboxed to a directory?](#are-mutable-file-system-mfs-files-sandboxed-to-a-directory)

## Background

IPFS Companion is exposing a subset of IPFS APIs as `window.ipfs` on every webpage ✨

This means websites can detect that `window.ipfs` already exists and use it instead of spawning own `js-ipfs` node, which saves resources, battery etc.

For more context, see:
- first iteration: [window.ipfs v1](https://github.com/ipfs-shipyard/ipfs-companion/issues/330)
- second iteration (now): [window.ipfs v2](https://github.com/ipfs-shipyard/ipfs-companion/issues/589)

## Creating applications using `window.ipfs`

> **tl;dr** jump to: [how do I fallback if `window.ipfs` is not available?](#how-do-i-fallback-if-windowipfs-is-not-available)

If a user has installed IPFS Companion, `window.ipfs` will be available as soon as the first script runs on your web page, so you'll be able to detect it using a simple `if` statement:

```js
if (window.ipfs && window.ipfs.enable) {
  const ipfs = await window.ipfs.enable({commands: ['id','dag','version']})
  console.log(await ipfs.id())
} else {
  // Fallback
}
```

To add and get content, you could update above example to do something like this:

```js
if (window.ipfs && window.ipfs.enable) {
  try {
    const ipfs = await window.ipfs.enable({commands: ['add','cat']})
    const [{ hash }] = await ipfs.add(Buffer.from('=^.^='))
    const data = await ipfs.cat(hash)
    console.log(data.toString()) // =^.^=
  } catch (err) {
    if (err.code === 'ERR_IPFS_PROXY_ACCESS_DENIED') {
      // Proxy is present but user denied access.
      // (fallback to js-ipfs or js-ipfs-http-client goes here)
    } else {
      // Something else went wrong (error handling)
      throw err
    }
  }
} else {
  // No IPFS Proxy
  // (fallback to js-ipfs or js-ipfs-http-client goes here)
}
```

Note that IPFS Companion does not add `Buffer` to the global scope, you need to [get it on your own](https://github.com/feross/buffer).

See also: [How do I fallback if `window.ipfs` is not available?](#how-do-i-fallback-if-windowipfs-is-not-available)

### Error Codes

Errors returned by IPFS Proxy can be identified by the value of `code` attribute:

#### `ERR_IPFS_PROXY_ACCESS_DENIED`

Thrown when current scope has no access rights to requested commands.

Optional `scope` and `permissions` attributes provide detailed information:
 - **IF** access was denied for a specific command **THEN** the `permissions` list is present and includes names of blocked commands
 - **IF** entire IPFS Proxy was disabled by the user **THEN** the `permissions` list is missing entirely

# Q&A

## What _is_ a `window.ipfs`?

It is an IPFS Proxy endpoint that enables you to obtain IPFS API instance.

Depending how IPFS companion is configured, you may be talking directly to a `js-ipfs` node running in the companion, a `go-ipfs` daemon over `js-ipfs-http-client` or a `js-ipfs` daemon over `js-ipfs-http-client` and potentially others in the future.

Note that object returned by `window.ipfs.enable` is _not_ an instance of `js-ipfs` or `js-ipfs-http-client` but is a Proxy to one of them, so don't expect to be able to detect either of them or be able to use any undocumented or instance specific functions.

See the [js-ipfs](https://github.com/ipfs/js-ipfs#api)/[js-ipfs-http-client](https://github.com/ipfs/js-ipfs-http-client#api) docs for available functions. If you find that some new functions are missing, the proxy might be out of date. Please check the [current status](https://github.com/tableflip/ipfs-postmsg-proxy#current-status) and submit a PR.

## How do I fallback if `window.ipfs` is not available?


See the [example code](examples/window.ipfs-fallback.html) (and [live demo](https://ipfs-shipyard.github.io/ipfs-companion/docs/examples/window.ipfs-fallback.html)) for getting an IPFS instance with a fallback.

**Tip:** use [window.ipfs-fallback](https://www.npmjs.com/package/window.ipfs-fallback) library that takes care of fallback ceremony.
It will ensure your app follows API changes and does not break in the future.

## What about IPFS node configuration?

Right now access to `config` command is blocked, and you can't make any assumptions about how the node is configured. For example, the user may not have enabled experimental features like pubsub.

Spawn a dedicated js-ipfs instance if you need non-standard configuration or any experimental features.

## Is there a Permission Control (ACL)?

Yes.

IPFS companion users are able to selectively control access to proxied commands so calls may reject (or callback) with [an error](#error-codes) if a user decides to deny access.

The first time you call a proxied function the user will be prompted to allow or deny the call and the decision will be remembered for subsequent calls.

It looks like this:

> ![single permission dialog in Firefox](https://user-images.githubusercontent.com/152863/36159691-3cf44eea-10d7-11e8-81d1-988dfd70a2f7.png)


## Do I need to confirm every API call?

Command access need to be confirmed only once [per scope](#how-are-permissions-scoped).

If you provide a list of commands when requesting API instance via `window.ipfs.enable({commands})`
then a single permission dialog will be displayed to the user:

> ![bulk permission dialog in Firefox](https://user-images.githubusercontent.com/157609/49878977-3d475780-fe29-11e8-9da9-2540bb2c8d9f.png)

For everything else, only the first call requires a decision from the user. You will be able to call
previously whitelisted IPFS commands and users will _not_ be prompted to
allow/deny access the second time.

Note that users can modify their permission decisions after the fact so you should not expect to always be allowed to call a command if it was successfully called previously.


## Can I disable this for now?

Users can permanently deny access to all IPFS commands by disabling `window.ipfs` experiment on _Preferences_ screen.

## How are permissions scoped?

Permissions are scoped to the **origin and path** (and sub-paths) of the file from which the permission was requested.

Scoped permissions in `window.ipfs` work similarly to how they work for [service worker registrations](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Examples) except that the user cannot control the scope, and it is set to the origin and path from which the permission was requested.

Scope based permissions allow applications running on an IPFS gateway to be granted different permissions. Consider the following two web sites running on the ipfs.io gateway:

* https://ipfs.io/ipfs/QmQxeMcbqW9npq5h5kyE2iPECR9jxJF4j5x4bSRQ2phLY4/
* https://ipfs.io/ipfs/QmTegrragyzfFq6DSuUaPYoKzm4eRBj2tgQaDHC72dLLaV/

With [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) these two applications would be granted the same permissions. With scoped permissions, these applications will be given a different set of permissions.

e.g.

* Allow `files.add` to `https://domain.com/`
    * ...will allow `files.add` to:
        * `https://domain.com/file`
        * `https://domain.com/file2.html`
        * `https://domain.com/sub/paths`
        * `https://domain.com/sub/paths/files`
        * etc.
* Allow `files.add` to `https://domain.com/feature`
    * ...will allow `files.add` to:
        * `https://domain.com/feature/file`
        * `https://domain.com/feature/file2.html`
        * `https://domain.com/feature/sub/paths`
        * `https://domain.com/feature/sub/paths/files`
        * `https://domain.com/featuresearch/sub/paths/files` (note substring)
        * `https://domain.com/features.html` (note substring)
        * etc.
    * ...will cause additional prompt for `files.add` to:
        * `https://domain.com/`
        * `https://domain.com/files`
        * etc.

## Are mutable file system (MFS) files sandboxed to a directory?

Yes. To avoid conflicts, each app gets it's own MFS directory where it can store files. When using MFS commands (see [docs](https://github.com/ipfs/interface-ipfs-core/blob/master/SPEC/FILES.md#mutable-file-system)) this directory will be automatically added to paths you pass. Your app's MFS directory is based on the **origin and path** where your application is running.

e.g.

* `files.write` to `/myfile.txt` on `https://domain.com/`
    * writes to `/dapps/https/domain.com/myfile.txt`
* `files.write` to `/path/to/myfile.txt` on `https://domain.com/feature`
    * writes to `/dapps/https/domain.com/feature/path/to/myfile.txt`
* `files.read` from `/feature/path/to/myfile.txt` on `https://domain.com/`
    * reads from `/dapps/https/domain.com/feature/path/to/myfile.txt`
* `files.stat` to `/` on `https://domain.com/feature`
    * stats `/dapps/https/domain.com/feature`
* `files.read` from `/../myfile.txt` on `https://domain.com/feature`
    * reads from `/dapps/https/domain.com/feature/myfile.txt` (no traverse above your app's root)
