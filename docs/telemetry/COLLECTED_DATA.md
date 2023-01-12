# Collected telemetry data

Copied from https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/COLLECTED_DATA.template.md

## What metrics data do we NOT collect

We do not collect any of the below listed items in our metric data:

1. User identifiable data (names, email addresses, aliases, handles, etc.)
2. CIDs
3. IP addresses

Telemetry is sent to Countly instance at `countly.ipfs.tech`. You can read how they protect your data at [Security, Privacy, and Access FAQ](https://support.count.ly/hc/en-us/articles/360037501372-Security-Privacy-and-Access-FAQ)

## What metrics data DO we collect

As a general rule, we collect only application data; no user data. Some examples of application data we collect are:

| Metric data name    | Metric feature name | Metric trigger                                          | Analytics use                                                     | Notes         |
|:-------------------:|---------------------|---------------------------------------------------------|-------------------------------------------------------------------|---------------|
| begin_session       | sessions            | At the start of the extension being active and enabled  | Count unique active users (daily/weekly/monthly) & session length | see [Countly's session flow documentation](https://support.count.ly/hc/en-us/articles/360037753291-SDK-development-guide#session-flow) |
| end_session         | sessions            | Whenever extension is disabled or idle                  | Count unique active users (daily/weekly/monthly) & session length | see [Countly's session flow documentation](https://support.count.ly/hc/en-us/articles/360037753291-SDK-development-guide#session-flow) |
| session_duration    | sessions            | At the end of the extension being active and enabled    | Count unique active users (daily/weekly/monthly) & session length | see [Countly's session flow documentation](https://support.count.ly/hc/en-us/articles/360037753291-SDK-development-guide#session-flow) |
| view:background     | views               | When the background view is shown                       | View count                                                        |               |
| view:welcome        | views               | When the welcome view is shown                          | View count                                                        |               |
| view:options        | views               | When the options view is shown                          | View count                                                        |               |
| view:quick-import   | views               | When the quick-import view is shown                     | View count                                                        |               |
| view:browser-action | views               | When the browser-action view is shown                   | View count                                                        |               |

* "Metric data name" - The app-specific metric/event name we're using for this metric data. (e.g. APP_BOOTSTRAP_START)
* "Metric feature name" - The metric feature the event/metric data correlates to. The group the metric feature belongs to is defined in our [COLLECTION_POLICY](https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/COLLECTION_POLICY.md#metric-features-and-their-groupings). (e.g. Minimal)
* "Metric trigger" - An explanation covering when this metric data is triggered. (e.g. On Application init)
* "Analytics use" - An explanation about how this metric data is used for analytics. (e.g. Input to load time calculations)
* "Notes" - Any additional notes. (e.g. Used as a timestamp identifier for when an application is first loaded)

## Other related documents

* [COLLECTION_POLICY](https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/COLLECTION_POLICY.md)
* [PRIVACY_POLICY](https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/PRIVACY_POLICY.md)
* [FAQs](https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/FAQs.md)
