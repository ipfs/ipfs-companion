// eslint-disable-next-line @typescript-eslint/no-unused-vars
import browser from "webextension-polyfill";

declare module 'browser' {
    export type declarativeNetRequest = {
        /**
         * fetch our set of rules from the declarativeNetRequest API
         *
         * @param callback Called when rules updated.
         */
         getDynamicRules(callback: () => void): Promise<void>;
         /**
          * Update our set of dynamic rules from the declarativeNetRequest API
          *
          * @param options Object specifying rules to add, remove, or modify https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-UpdateRuleOptions
          * @param callback Called when rules updated.
          */
          updateDynamicRules(options: object, callback: () => void): Promise<void>;
    }
}
