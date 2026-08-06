# Security notes

## Reporting security issues

If you find a security issue in ipfs-companion, report it privately to security@ipfs.io. **Please do not file a public issue** for anything that could affect people running the extension, for example a way to bypass redirect safety, leak browsing activity, or run code in a page's origin.

If the issue is a design weakness that cannot be exploited as-is, or covers something not yet released, it is fine to discuss it openly.

A maintainer will confirm we received your report and keep you posted while we work on a fix. We are glad to credit you in the release notes, or to leave you out of them if you would rather not be named.

If two weeks pass and no human has replied, assume the message never reached one. Resend it, or escalate: the [OpenSSF finder guide](https://github.com/ossf/oss-vulnerability-guide/blob/main/finder-guide.md) lays out the options, and [CERT/CC](https://kb.cert.org/vuls/report/) takes reports when coordination with a project breaks down. We would rather you do that than sit on a live bug.

For normal bugs, [open an issue](https://github.com/ipfs/ipfs-companion/issues/new/choose). This repository follows the [IPFS project security policy](https://github.com/ipfs/community/blob/master/SECURITY.md).

## Verifying a build against the source

You can confirm that a published extension was built from the source at a given tag by rebuilding it yourself and comparing the result.

1. Check out the [matching tag](https://github.com/ipfs/ipfs-companion/tags) for the version you want to verify.
2. Build reproducibly in Docker:

   ```sh
   npm run release-build
   ```

   The build runs inside a pinned image for identical output across platforms. Afterwards `build/` holds `ipfs_companion-<version>_chromium.zip` and `ipfs_companion-<version>_firefox.zip`.
3. Download the package you want to check, from the store or from the [GitHub release](https://github.com/ipfs/ipfs-companion/releases).

Extension packages are zip archives, so compare the files inside them rather than the archive bytes (zip metadata such as timestamps can differ):

```sh
mkdir built published
unzip -q build/ipfs_companion-<version>_chromium.zip -d built
unzip -q downloaded.zip -d published
diff -r built published && echo same || echo differs
```

A clean `diff -r` means the package contents match what these sources produce.
