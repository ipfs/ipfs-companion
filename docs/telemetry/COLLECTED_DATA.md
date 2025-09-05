# Telemetry Data Collection

## Telemetry has been removed

All telemetry collection has been removed from this project. No data is being collected or sent to any analytics services.

The previous implementation used Countly for telemetry collection, but this functionality has been completely removed.

## Privacy

Currently, there is no telemetry collection implemented in this project.
As a general rule, we collect only application data; no user data.

## Historical Information

Previously, the project collected application data (not user data) through Countly. The following information is kept for historical reference only:

### What metrics data were collected

|  Metric data name   | Metric feature name | Metric trigger                               | Analytics use |
| :-----------------: | ------------------- | -------------------------------------------- | ------------- |
|    view:welcome     | views               | When the welcome view is shown               | View count    |
|    view:options     | views               | When the options view is shown               | View count    |
|  view:quick-import  | views               | When the quick-import view is shown          | View count    |
| view:browser-action | views               | When the browser-action view is shown        | View count    |
| event:url-resolved  | event               | Number of URLs resolved by companion         | Metrics       |
| event:url-observed  | event               | Number of URLs observed (including resolved) | Metrics       |

- "Metric data name" - The app-specific metric/event name we're using for this metric data. (e.g. APP_BOOTSTRAP_START)
- "Metric feature name" - The metric feature the event/metric data correlates to. The group the metric feature belongs to is defined in our [COLLECTION_POLICY](https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/COLLECTION_POLICY.md#metric-features-and-their-groupings). (e.g. Minimal)
- "Metric trigger" - An explanation covering when this metric data is triggered. (e.g. On Application init)
- "Analytics use" - An explanation about how this metric data is used for analytics. (e.g. Input to load time calculations)
- "Notes" - Any additional notes. (e.g. Used as a timestamp identifier for when an application is first loaded)

## Other related documents

- [COLLECTION_POLICY](https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/COLLECTION_POLICY.md)
- [PRIVACY_POLICY](https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/PRIVACY_POLICY.md)
- [FAQs](https://github.com/ipfs-shipyard/ignite-metrics/blob/main/docs/telemetry/FAQs.md)
