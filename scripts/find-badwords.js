// this scripts helps to find the trigger for MOZILLA_COND_OF_USE
// details: https://github.com/ipfs-shipyard/ipfs-companion/issues/369

// the file with the problem
const problem = '../add-on/dist/bundles/backgroundPage.bundle.js'

/*
   download https://github.com/mozilla/addons-linter/blob/master/src/badwords.json
   in version matching active addons-linter:
   grep version ../node_modules/addons-linter/package.json
 */
const badwords = require('./badwords.json')

const Fs = require('fs')
const file = Fs.readFileSync(problem, 'utf8')

const BADWORDS_RE = {
  en: new RegExp(`\\b(?:${badwords.en.join('|')})\\b`, 'gi')
}

console.log('finding badwords...')

const matches = file.match(BADWORDS_RE.en)

console.log(matches)
