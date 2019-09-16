#!/usr/bin/env node

const fs = require('fs')
const glob = require('glob')

const files = glob.sync('./build/*/*.zip')

files.map(async file => {
  const path = file.split('/')
  const name = path.pop().split('.zip').shift()
  const target = path.pop()
  const newFile = `./build/${name}_${target}.zip`
  // remove old artifact, if exists
  if (fs.existsSync(newFile)) fs.unlinkSync(newFile)
  // rename artifact
  console.log(`${file} → ${newFile}`)
  fs.renameSync(file, newFile)
  // remove empty dir
  fs.rmdirSync(`./build/${target}`, { recursive: true })
})
