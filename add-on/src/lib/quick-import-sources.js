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
