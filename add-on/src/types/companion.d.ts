export interface CompanionOptions {
  active: boolean
  ipfsNodeType: string
  ipfsNodeConfig: string
  publicGatewayUrl: string
  publicSubdomainGatewayUrl: string
  usePublicGatewaysForShare: boolean
  useCustomGateway: boolean
  useSubdomains: boolean
  redirectSubresources: boolean
  enabledOn: string[]
  disabledOn: string[]
  automaticMode: boolean
  linkify: boolean
  dnslinkLookup: boolean
  dnslinkRedirect: boolean
  recoverFailedHttpRequests: boolean
  redirectToXIpfsPathValue: boolean
  honorRedirectOptOutHint: boolean
  preloadAtPublicGateway: boolean
  catchUnhandledProtocols: boolean
  displayNotifications: boolean
  displayReleaseNotes: boolean
  customGatewayUrl: string
  ipfsApiUrl: string
  ipfsApiPollMs: number
  logNamespaces: string
  importDir: string
  useLatestWebUI: boolean
  dismissedUpdate: null | string
  openViaWebUI: boolean
}

export interface CompanionState extends Omit<CompanionOptions, 'publicGatewayUrl' | 'publicSubdomainGatewayUrl' | 'useCustomGateway' | 'ipfsApiUrl' | 'customGatewayUrl'> {
  peerCount: number
  pubGwURL: URL | undefined
  pubGwURLString: string | undefined
  pubSubdomainGwURL: URL | undefined
  pubSubdomainGwURLString: string | undefined
  redirect: boolean
  apiURL: URL
  apiURLString: string
  gwURL: URL
  gwURLString: string
  activeIntegrations: (url: string) => boolean
  localGwAvailable: boolean
  webuiRootUrl: string
}

interface SwitchToggleArguments {
  id: string
  onchange: () => void
  checked?: boolean
  disabled?: boolean
  style?: string
}
export function SwitchToggle (args: SwitchToggleArguments): undefined | HTMLElement
