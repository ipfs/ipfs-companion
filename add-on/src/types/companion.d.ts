
export interface CompanionOptions {
  active: boolean
  ipfsNodeConfig: string
  publicGatewayUrl: string
  publicSubdomainGatewayUrl: string
  useCustomGateway: boolean
  useSubdomains: boolean
  enabledOn: string[]
  disabledOn: string[]
  automaticMode: boolean
  linkify: boolean
  dnslinkPolicy: boolean | string
  dnslinkDataPreload: boolean
  dnslinkRedirect: boolean
  recoverFailedHttpRequests: boolean
  detectIpfsPathHeader: boolean
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
  openViaWebUI: boolean,
  ipfsNodeType: 'external' | 'service_worker_gateway'
  serviceWorkerGatewayUrl: string
  serviceWorkerGatewayFallbackUrl: string
}

export interface CompanionState extends Omit<CompanionOptions, 'publicGatewayUrl' | 'publicSubdomainGatewayUrl' | 'useCustomGateway' | 'ipfsApiUrl' | 'customGatewayUrl'> {
  peerCount: number
  pubGwURL: URL
  pubGwURLString: string
  pubSubdomainGwURL: URL
  pubSubdomainGwURLString: string
  redirect: boolean
  apiURL: URL
  apiURLString: string
  gwURL: URL
  gwURLString: string
  activeIntegrations: (url: string) => boolean
  localGwAvailable: boolean
  webuiRootUrl: string | null
  nodeActive: boolean 
  isServiceWorkerGateway?: boolean
  swGwURL?: URL
  swGwURLString?: string
  swGwFallbackURL?: URL
  swGwFallbackURLString?: string
}

interface SwitchToggleArguments {
  id: string
  onchange: () => void
  checked?: boolean
  disabled?: boolean
  style?: string
}
export function SwitchToggle (args: SwitchToggleArguments): undefined | HTMLElement
