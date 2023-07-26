declare module 'countly-web-sdk' {
  export interface CountlyEvent {
    key: string
    count?: number
    sum?: number
    dur?: number
    segmentation?: Record<string, string>
  }
}
