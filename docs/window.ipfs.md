# Creating applications using `window.ipfs`

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
    await ipfs.add(Buffer.from('=^.^='))
   } catch (err) {
     if (err.message === 'User denied access to ipfs.files.add') {
       // Fallback
     } else {
       throw err
     }
   }

   const data = await ipfs.cat('QmS5RzFV9v4fucVtjATPxoxABgEmNhhduykzUbQeGyyS3N')
   console.log(data.toString()) // =^.^=
} else {
  // Fallback
}
```

Note that IPFS Companion also adds `window.Buffer` if it doesn't already exist.

## What _is_ a `window.ipfs`?

Depending how IPFS companion is configured, you may be talking directly to a `js-ipfs` node running in the companion, a `go-ipfs` daemon over `js-ipfs-api` or a `js-ipfs` daemon over `js-ipfs-api` and potentially others in the future.

Note that `window.ipfs` is _not_ an instance of `js-ipfs` or `js-ipfs-api` but is a proxy to one of them, so don't expect to be able to detect either of them or be able to use any undocumented or instance specific functions.

See the [js-ipfs](https://github.com/ipfs/js-ipfs#api)/[js-ipfs-api](https://github.com/ipfs/js-ipfs-api#api) docs for available functions. If you find that some new functions are missing, the proxy might be out of date. Please check the [current status](https://github.com/tableflip/ipfs-postmsg-proxy#current-status) and submit a PR.

## Node configuration

You can't make any assumptions about how the node is configured. For example, the user may not have enabled experimental features like pubsub.

## Permissions

IPFS companion users are able to selectively control access to `window.ipfs` functions so calls may reject (or callback) with an error if a user decides to deny access.

The first time you call a `window.ipfs` function the user will be prompted to allow or deny the call and the decision will be remembered for subsequent calls.

Not all function calls require a decision from the user. You will be able to call [whitelisted](add-on/src/lib/ipfs-proxy/acl-whitelist.json) IPFS functions and users will _not_ be prompted to allow/deny access.

Users can modify their permission decisions after the fact so you should not expect to always be allowed to call a function if it was successfully called previously. Additionally, **users can also deny access to _all_ IPFS functions**.

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

### Scopes

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
