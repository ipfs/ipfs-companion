'use strict'
import { expect } from 'chai'
import { describe, it } from 'vitest'
import { fileListSource } from '../../../add-on/src/lib/quick-import-sources.js'

async function collect (source) {
  const out = []
  for await (const entry of source) out.push(entry)
  return out
}

// Minimal File stand-in: the sources only read name/webkitRelativePath and
// pass the object straight through to addAll.
function fakeFile (name, webkitRelativePath = '') {
  return { name, webkitRelativePath, size: 1 }
}

describe('quick-import-sources.js', function () {
  describe('fileListSource', function () {
    it('uses file name as path for a flat selection', async function () {
      const files = [fakeFile('a.txt'), fakeFile('b.txt')]
      const entries = await collect(fileListSource(files))
      expect(entries.map(e => e.path)).to.deep.equal(['a.txt', 'b.txt'])
      expect(entries[0].file).to.equal(files[0])
    })

    it('keeps directory structure from webkitRelativePath', async function () {
      const files = [
        fakeFile('cat.jpg', 'photos/2024/cat.jpg'),
        fakeFile('dog.jpg', 'photos/2024/dog.jpg')
      ]
      const entries = await collect(fileListSource(files))
      expect(entries.map(e => e.path)).to.deep.equal([
        'photos/2024/cat.jpg',
        'photos/2024/dog.jpg'
      ])
    })

    it('yields nothing for an empty list', async function () {
      const entries = await collect(fileListSource([]))
      expect(entries).to.deep.equal([])
    })
  })
})
