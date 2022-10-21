const pairs = (obj) => Object.keys(obj).map(k => [k, obj[k]])
// Converts an ACL expressed as a plain old object into an ACL Map
export const objToAcl = (obj) => new Map(pairs(obj).map(e => [e[0], new Map(pairs(e[1]))]))
