
const isMv3TestingEnabled = () => {
  return process.env.TEST_MV3 === 'true'
}
export const manifestVersion = isMv3TestingEnabled() ? 'MV3' : 'MV2'
export default isMv3TestingEnabled
