# MV3 Migration

## Overview

This document describes the migration process from MV2 to MV3. MV3 is a new version of the extension manifest format that fundamentally changes the way extensions are loaded and run in the browser. A few notable changes have been discussed in this [thread](https://discuss.ipfs.tech/t/announcing-ipfs-companion-mv3-rc-beta/16442) and a detailed plan can be found [here](https://github.com/ipfs/ipfs-companion/issues/1152).

## Implementation

The most important change that lead to this migration was how url request interception model was changed. In MV2, we used `webRequest.onBeforeRequest` to intercept requests and redirect them to the local gateway. That process looked something like:

```mermaid
flowchart TD
    A[Web Request] --> B[Companion Blocks]
    B --> C[Check if request\ncan be served\nover IPFS?]
    C --> D[Address Contains CID?]
    D --> |yes| F
    D --> |no| E[Address Resolves\nOver IPNS?]
    E --> |yes| F[Redirect to Local\nIPFS Node]
    E --> |no| G[Continue Request\nNormally]
```

The process was simple and synchronous, the request is intercepted and handed over to companion, which then redirects it to the local gateway as needed. MV3 changes this process by introducing a new API called `declarativeNetRequest`. MV3 does not allow synchronous request interception (also called blocking request), which is not secure and can lead to performance issues. Instead, it uses a declarative approach where the extension declares a set of rules that are then used by the browser to intercept requests. This process looks something like:

```mermaid
flowchart TD
    A[Web Request] --> B[Companion Observes Request]
    A --> C{Check if any\nredirect rule applies\nto the current request}
    B:::companion --> D[Check if request can\nbe served over IPFS?]
    D:::companion --> E[Address Contains CID?]:::companion
    E --> |no| F[Address Resolves\nOver IPNS?]:::companion
    F --> |no| I[Ignore Request]:::companion
    F --> |yes| H:::companion
    E --> |yes| H[Insert Redirect Rules]:::companion
    H:::companion --> K(Declarative NetRequest Store):::browser
    C:::browser <--> |check| K
    C --> |redirect| G[To Local IPFS Node]
    C --> |no-redirect| J[Continue Request Normally]
    classDef companion fill:#0aca9f,stroke:#7f8491,stroke-width:2px;
    classDef browser fill:#d9dbe2,stroke:#7f8491,stroke-width:1px;
```

The process is asynchronous, the browser allows "observation" of requests to companion, which asynchronously determines if the given request is serviceable by IPFS and then dynamically introduces a rule for the browser to perform redirects to the local gateway. A sample rule looks something like:

```js
{
  id,                                    // random id for reference
  priority: 1,                           // priority of the rule
  action: {
    type: 'redirect',
    redirect: { '<regex substitution>' } // redirect to gateway
  },
  condition: {
    '<regex filter>',                    // filter to match requests
    '<filtered domains list>,
    resourceTypes: [
      'csp_report',
      'font',
      'image',
      'main_frame',
      'media',
      'object',
      'other',
      'ping',
      'script',
      'stylesheet',
      'sub_frame',
      'webbundle',
      'websocket',
      'webtransport',
      'xmlhttprequest'
    ]
  }
}
```

The API only allows for 5000 such rules to exist at the time of writing this, so that value can be exhausted pretty quickly. So instead of adding one rule per redirect, we can dynamically generate a single regex pattern to handle multiple redirections.

For example

```
https://ipfs.io/ipns/en.wikipedia-on-ipfs.org -> http://localhost:8080/ipns/en.wikipedia-on-ipfs.org
```

can be represented as

```
https://ipfs.io/ipns/(.*) -> http://localhost:8080/ipns/$1
```

That's just an example, but in reality it looks more like (which covers edge cases like URL endings):

```js
{
  "action": {
    "redirect": {
      "regexSubstitution": "http://localhost:8080\\1"
    },
    "type": "redirect"
  },
  "condition": {
    "excludedInitiatorDomains": [],
    "regexFilter": "^https?\\:\\/\\/ipfs\\.io((?:[^\\.]|$).*)$",
    "resourceTypes": [
      "csp_report",
      "font",
      "image",
      "main_frame",
      "media",
      "object",
      "other",
      "ping",
      "script",
      "stylesheet",
      "sub_frame",
      "webbundle",
      "websocket",
      "webtransport",
      "xmlhttprequest"
    ]
  },
  "id": 1234,
  "priority": 1
}
```

This is a single rule that covers all the redirects from `ipfs.io` to `localhost:8080`. This means that we can save a lot of rules and gain more coverage of serviceable URLs. This is the approach we have taken in MV3.

## Gotchas

Since the process is asynchronous, there are a few things that we need to keep in mind:

- There will always be scenarios, where the servicing of the public URL happens before companion determines if the URL is serviceable over IPFS (consider ipns/fqdn resolutions.) To tackle this a refresh mechanism has been put in place that refreshes the page after a few milliseconds if the URL is serviceable. This is not ideal, but it is the best we can do for now.
- Similarly there are scenarios around page recovery, where the page starts redirection, but the kubo node goes offline, in which case companion needs to remove offending rule and replace it with the recovery URL.
- If the kubo rpc api url changes for some reason, companion needs to update the rules to reflect the new URL. We can preemptively generate new rules based on the new url, but the new node might not be servicing content over the old URL structure (e.g. https://ipfs.io/ipns/en.wikipedia-on-ipfs.org resolves to http://en.wikipedia-on-ipfs.org.ipns.localhost:8080/ with kubo but http://en-wikipedia--on--ipfs-org.ipns.localhost:48084/wiki/ on brave's node, similarly the node can have its own URL structure,) which we need to account for. Hence, we remove all such rules as offending and begin the process of generating new rules on the fly.
- Metrics collection becomes harder, as we can no longer reliably determine if the requested resource was serviced by declarative rule introduced by companion. We can only determine if the request was serviceable and we had a rule.

## Other Thoughts

Not intercepting requests synchronously has its quirks, but implementing a dynamic ruleset of possible redirects is even more complicated. We're expecting drastic improvements in load times from the second request (to the same host) onwards as the browser no longer relies on companion to intercept requests and redirect those. Instead declarative rule set allows for redirection to happen at the browser level, which is much faster in-theory. This also means that companion is no longer a bottleneck for the browser, which is a good thing.
