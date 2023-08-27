const isManifestV3 = process.env.TEST_MV3 === 'true'
export const manifestVersion = isManifestV3 ? 'MV3' : 'MV2'
export default isManifestV3
