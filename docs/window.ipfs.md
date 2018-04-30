# Notes on exposing IPFS API as `window.ipfs`

> ### Disclaimer: this is a new, experimental feature. We are actively working on refining security and UX constraints for this interface, YMMV. <br> Want to contribute? See [#454](https://github.com/ipfs-shipyard/ipfs-companion/issues/454) and other [issues with `window.ipfs` label](https://github.com/ipfs-shipyard/ipfs-companion/labels/window.ipfs).

- [Background](#background)
- [Creating applications using window.ipfs](#creating-applications-using-windowipfs)
    - [Error messages](#error-messages)
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

For more context, see original issue: [Expose IPFS API as window.ipfs #330](https://github.com/ipfs-shipyard/ipfs-companion/issues/330)

## Creating applications using `window.ipfs`

If a user has installed IPFS companion, `window.ipfs` will be available as soon as the first script runs on your web page, so you'll be able to detect it using a simple `if` statement:

```js
if (window.ipfs) {  
  await ipfs.id()
} else {
  // Fallback
}
```

To add and get content, you could do something like this:

```js
if (window.ipfs) {
  try {
    const [{ hash }] = await ipfs.add(Buffer.from('=^.^='))
    const data = await ipfs.cat(hash)
    console.log(data.toString()) // =^.^=
  } catch (err) {
    if (err.isIpfsProxyAclError) {
      // Fallback
      console.log('Unable to get ACL decision from user :(', err)
    } else {
      throw err
    }
  }
} else {
  // Fallback
}
```

Note that IPFS Companion also adds `window.Buffer` if it doesn't already exist.

See also: [How do I fallback if `window.ipfs` is not available?](#how-do-i-fallback-if-windowipfs-is-not-available)

### Error messages

If access was denied:

```
User denied access to ${permission}
```

If the user closes the dialog without making a decision:

```
Failed to obtain access response for ${permission} at ${scope}
```

If access to IPFS was disabled entirely:

```
User disabled access to IPFS
```

Note these might have been re-worded already. Please send a PR.



# Q&A

## What _is_ a `window.ipfs`?

Depending how IPFS companion is configured, you may be talking directly to a `js-ipfs` node running in the companion, a `go-ipfs` daemon over `js-ipfs-api` or a `js-ipfs` daemon over `js-ipfs-api` and potentially others in the future.

Note that `window.ipfs` is _not_ an instance of `js-ipfs` or `js-ipfs-api` but is a proxy to one of them, so don't expect to be able to detect either of them or be able to use any undocumented or instance specific functions.

See the [js-ipfs](https://github.com/ipfs/js-ipfs#api)/[js-ipfs-api](https://github.com/ipfs/js-ipfs-api#api) docs for available functions. If you find that some new functions are missing, the proxy might be out of date. Please check the [current status](https://github.com/tableflip/ipfs-postmsg-proxy#current-status) and submit a PR.

## How do I fallback if `window.ipfs` is not available?

See the [example code](examples/window.ipfs-fallback.html) (and [live demo](https://ipfs-shipyard.github.io/ipfs-companion/docs/examples/window.ipfs-fallback.html)) for getting an IPFS instance with a fallback.

## What about IPFS node configuration?

You can't make any assumptions about how the node is configured. For example, the user may not have enabled experimental features like pubsub.

## Is there a Permission Control (ACL)?

Yes.

IPFS companion users are able to selectively control access to `window.ipfs` functions so calls may reject (or callback) with [an error](#error-messages) if a user decides to deny access.

The first time you call a `window.ipfs` function the user will be prompted to allow or deny the call and the decision will be remembered for subsequent calls.

It looks like this:

> ![permission dialog in Firefox](https://user-images.githubusercontent.com/152863/36159691-3cf44eea-10d7-11e8-81d1-988dfd70a2f7.png)


## Do I need to confirm every API call?

Not all function calls require a decision from the user. You will be able to call [whitelisted](../add-on/src/lib/ipfs-proxy/acl-whitelist.json) IPFS functions and users will _not_ be prompted to allow/deny access.

Functions that are not whitelisted need to be confirmed only once [per scope](#how-are-permissions-scoped).

Note that users can modify their permission decisions after the fact so you should not expect to always be allowed to call a function if it was successfully called previously.


## Can I disable this for now?

Users can permanently deny access to all IPFS functions by disabling `window.ipfs` experiment on _Preferences_ screen.

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

Yes. To avoid conflicts, each app gets it's own MFS directory where it can store files. When using MFS functions (see [docs](https://github.com/ipfs/interface-ipfs-core/blob/master/SPEC/FILES.md#mutable-file-system)) this directory will be automatically added to paths you pass. Your app's MFS directory is based on the **origin and path** where your application is running.

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
