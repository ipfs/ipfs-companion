'use strict'
const { describe, it } = require('mocha')
const { expect } = require('chai')
const createPreMfsScope = require('../../../../add-on/src/lib/ipfs-proxy/pre-mfs-scope')

describe('lib/ipfs-proxy/pre-mfs-scope', () => {
  it('should return null for non MFS function', () => {
    const fnName = 'object.get'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope)
    expect(pre).to.equal(null)
  })

  it('should scope src/dest paths for files.cp', async () => {
    const fnName = 'files.cp'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre(['/source.txt', '/destination.txt'])
    expect(args[0][0]).to.equal('/test-dapps/https:/ipfs.io/source.txt')
    expect(args[0][1]).to.equal('/test-dapps/https:/ipfs.io/destination.txt')
  })

  it('should scope src path for files.mkdir', async () => {
    const fnName = 'files.mkdir'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre('/dir')
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/dir')
  })

  it('should scope src path for files.stat', async () => {
    const fnName = 'files.stat'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre('/')
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/')
  })

  it('should scope src path for files.rm', async () => {
    const fnName = 'files.rm'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre('/file')
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/file')
  })

  it('should scope src path for files.read', async () => {
    const fnName = 'files.read'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre('/path/to/file.md')
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/path/to/file.md')
  })

  it('should scope src path for files.write', async () => {
    const fnName = 'files.write'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre('/path/to/file.md')
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/path/to/file.md')
  })

  it('should scope src/dest paths for files.mv', async () => {
    const fnName = 'files.mv'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre(['/source.txt', '/destination.txt'])
    expect(args[0][0]).to.equal('/test-dapps/https:/ipfs.io/source.txt')
    expect(args[0][1]).to.equal('/test-dapps/https:/ipfs.io/destination.txt')
  })

  it('should scope src path for files.flush', async () => {
    const fnName = 'files.flush'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre('/path/to/file.md')
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/path/to/file.md')
  })

  it('should scope src path for files.flush with no path and no options', async () => {
    const fnName = 'files.flush'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre()
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/')
  })

  it('should scope src path for files.flush with no path and options', async () => {
    const fnName = 'files.flush'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre({})
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/')
  })

  it('should scope src path for files.flush with null path and options', async () => {
    const fnName = 'files.flush'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre(null, {})
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/')
  })

  it('should scope src path for files.ls', async () => {
    const fnName = 'files.ls'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre('/path/to/file.md')
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/path/to/file.md')
  })

  it('should scope src path for files.ls with no path and no options', async () => {
    const fnName = 'files.ls'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre()
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/')
  })

  it('should scope src path for files.ls with no path and options', async () => {
    const fnName = 'files.ls'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre({})
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/')
  })

  it('should scope src path for files.ls with null path and options', async () => {
    const fnName = 'files.ls'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')
    const args = await pre(null, {})
    expect(args[0]).to.equal('/test-dapps/https:/ipfs.io/')
  })

  it('should not allow write to root', async () => {
    const fnName = 'files.write'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')

    let error

    try {
      await pre('/')
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('/ was not a file')
  })

  it('should not allow remove root', async () => {
    const fnName = 'files.rm'
    const getScope = () => 'https://ipfs.io/'
    const pre = createPreMfsScope(fnName, getScope, '/test-dapps')

    let error

    try {
      await pre('/', { recursive: true })
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('cannot delete root')
  })
})
