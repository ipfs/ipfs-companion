'use strict'
import { expect } from 'chai'
import { describe, it } from 'vitest'
import {
  dataTransferSource,
  fileListSource,
  fileSystemEntrySource
} from '../../../add-on/src/lib/quick-import-sources.js'

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

// Mimic a FileSystemFileEntry: entry.file(cb) hands back the File.
function fileEntry (name) {
  return { name, isFile: true, isDirectory: false, file: (cb) => cb(fakeFile(name)) }
}

// Mimic a FileSystemDirectoryEntry whose reader yields children in one batch,
// then an empty batch (the readEntries contract).
function dirEntry (name, children) {
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader () {
      let done = false
      return {
        readEntries (cb) {
          if (done) return cb([])
          done = true
          cb(children)
        }
      }
    }
  }
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

  describe('fileSystemEntrySource', function () {
    it('yields a single file entry at the top level', async function () {
      const entries = await collect(fileSystemEntrySource(fileEntry('a.txt')))
      expect(entries.map(e => e.path)).to.deep.equal(['a.txt'])
    })

    it('walks a nested directory and prefixes each level onto the path', async function () {
      const tree = dirEntry('root', [
        fileEntry('top.txt'),
        dirEntry('sub', [fileEntry('deep.txt')])
      ])
      const entries = await collect(fileSystemEntrySource(tree))
      expect(entries.map(e => e.path)).to.deep.equal([
        'root/top.txt',
        'root/sub/deep.txt'
      ])
    })
  })

  describe('dataTransferSource', function () {
    it('walks dropped folders via webkitGetAsEntry', async function () {
      const tree = dirEntry('root', [fileEntry('a.txt'), fileEntry('b.txt')])
      const dataTransfer = {
        items: [{ kind: 'file', webkitGetAsEntry: () => tree }],
        files: []
      }
      const entries = await collect(dataTransferSource(dataTransfer))
      expect(entries.map(e => e.path)).to.deep.equal(['root/a.txt', 'root/b.txt'])
    })

    it('ignores non-file items', async function () {
      const dataTransfer = {
        items: [{ kind: 'string', webkitGetAsEntry: () => null }],
        files: []
      }
      const entries = await collect(dataTransferSource(dataTransfer))
      expect(entries).to.deep.equal([])
    })

    it('falls back to the flat file list when no entry is available', async function () {
      const files = [fakeFile('a.txt'), fakeFile('b.txt')]
      const dataTransfer = {
        items: [{ kind: 'file', webkitGetAsEntry: () => null }],
        files
      }
      const entries = await collect(dataTransferSource(dataTransfer))
      expect(entries.map(e => e.path)).to.deep.equal(['a.txt', 'b.txt'])
    })

    it('falls back to the flat file list when items are unavailable', async function () {
      const files = [fakeFile('a.txt')]
      const entries = await collect(dataTransferSource({ files }))
      expect(entries.map(e => e.path)).to.deep.equal(['a.txt'])
    })
  })
})
