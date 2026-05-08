#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

for (const dir of fs.readdirSync('build', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const subdir = path.join('build', dir.name)
  for (const entry of fs.readdirSync(subdir)) {
    if (!entry.endsWith('.zip')) continue
    const oldPath = path.join(subdir, entry)
    const name = entry.slice(0, -'.zip'.length)
    const newPath = path.join('build', `${name}_${dir.name}.zip`)
    if (fs.existsSync(newPath)) fs.unlinkSync(newPath)
    console.log(`${oldPath} -> ${newPath}`)
    fs.renameSync(oldPath, newPath)
  }
  fs.rmSync(subdir, { recursive: true })
}
