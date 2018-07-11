'use strict'

const filesize = require('filesize')
const mainStyle = require('ipfs-http-response/src/dir-view/style')

function buildFilesList (path, links) {
  const rows = links.map((link) => {
    let row = [
      `<div class="ipfs-icon ipfs-_blank">&nbsp;</div>`,
      `<a href="${path}${path.endsWith('/') ? '' : '/'}${link.name}">${link.name}</a>`,
      filesize(link.size)
    ]

    row = row.map((cell) => `<td>${cell}</td>`).join('')

    return `<tr>${row}</tr>`
  })

  return rows.join('')
}

function isRoot (path) {
  // Remove leading ipfs// and trailing / and split by /
  const parts = path.replace(/^ipfs:\/\//, '').replace(/\/$/, '').split('/')
  // If there's only 1 part, then it's the hash, so we are at root
  return parts.length === 1
}

function buildTable (path, links) {
  return `
    <table class="table table-striped">
      <tbody>
        ${isRoot(path) ? '' : (`
          <tr>
            <td class="narrow">
              <div class="ipfs-icon ipfs-_blank">&nbsp;</div>
            </td>
            <td class="padding">
              <a href="${path.split('/').slice(0, -1).join('/')}">..</a>
            </td>
            <td></td>
          </tr>
        `)}
        ${buildFilesList(path, links)}
      </tbody>
    </table>
  `
}

function render (path, links) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${path}</title>
      <style>${mainStyle}</style>
    </head>
    <body>
      <div id="header" class="row">
        <div class="col-xs-2">
          <div id="logo" class="ipfs-logo"></div>
        </div>
      </div>
      <br>
      <div class="col-xs-12">
        <div class="panel panel-default">
          <div class="panel-heading">
            <strong>Index of ${path}</strong>
          </div>
          ${buildTable(path, links)}
        </div>
      </div>
    </body>
    </html>
  `
}

exports.render = render
