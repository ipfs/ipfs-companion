#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const files = []
for (const dir of fs.readdirSync('build', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const dirPath = path.join('build', dir.name)
  for (const entry of fs.readdirSync(dirPath)) {
    if (entry.endsWith('.zip')) files.push(path.join(dirPath, entry))
  }
}

for (const file of files) {
  const parts = file.split('/')
  const name = parts.pop().split('.zip').shift()
  const target = parts.pop()
  const newFile = `build/${name}_${target}.zip`
  if (fs.existsSync(newFile)) fs.unlinkSync(newFile)
  console.log(`${file} -> ${newFile}`)
  fs.renameSync(file, newFile)
  fs.rmSync(`build/${target}`, { recursive: true })
}
