'use strict'

// Normalizers that turn the various browser file APIs into a single stream of
// { path, file } entries ready for ipfs.addAll. `path` keeps the directory
// structure the user picked (e.g. photos/2024/cat.jpg); `file` is a browser
// File, so its contents are only read when addAll pulls them.

// FileList comes from <input type="file"> (both single files and, with the
// webkitdirectory attribute, whole folders). webkitRelativePath carries the
// path within a picked folder; a plain multi-file selection leaves it empty,
// so we fall back to the file name.
export async function * fileListSource (fileList) {
  for (const file of fileList) {
    yield { path: file.webkitRelativePath || file.name, file }
  }
}

// dataTransfer comes from a drop event. Its items expose FileSystemEntry via
// webkitGetAsEntry(), which is the only cross-browser way to see a dropped
// folder's contents; the flat dataTransfer.files list drops directories. When
// no entry is available (e.g. content dragged from another app) we fall back
// to the flat list.
export async function * dataTransferSource (dataTransfer) {
  const items = dataTransfer.items ? Array.from(dataTransfer.items) : []
  let walkedEntries = false
  for (const item of items) {
    if (item.kind !== 'file') continue
    const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
    if (entry) {
      walkedEntries = true
      yield * fileSystemEntrySource(entry)
    }
  }
  if (!walkedEntries) {
    yield * fileListSource(dataTransfer.files)
  }
}

// FileSystemEntry is a node in the tree exposed by webkitGetAsEntry(). Files
// are yielded directly; directories are read in full and walked recursively,
// with each level prefixed onto the path so the tree is preserved.
export async function * fileSystemEntrySource (entry, prefix = '') {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name
  if (entry.isFile) {
    yield { path, file: await fileFromEntry(entry) }
  } else if (entry.isDirectory) {
    const reader = entry.createReader()
    for (const child of await readAllEntries(reader)) {
      yield * fileSystemEntrySource(child, path)
    }
  }
}

function fileFromEntry (entry) {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

// readEntries returns the directory in batches (often capped around 100), so
// it must be called until it reports an empty batch.
async function readAllEntries (reader) {
  const entries = []
  let batch
  do {
    batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject))
    entries.push(...batch)
  } while (batch.length > 0)
  return entries
}
