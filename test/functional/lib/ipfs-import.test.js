'use strict'
import { expect } from 'chai'
import { describe, it, afterEach } from 'mocha'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import { createIpfsImportHandler, formatImportDirectory } from '../../../add-on/src/lib/ipfs-import.js'

describe('ipfs-import.js', function () {
  describe('formatImportDirectory', function () {
    it('should change nothing if path is properly formatted and date wildcards are not provided', function () {
      const path = '/ipfs-companion-imports/my-directory/'
      expect(formatImportDirectory(path)).to.equal('/ipfs-companion-imports/my-directory/')
    })

    it('should replace two successive slashes with a single slash', function () {
      const path = '/ipfs-companion-imports//my-directory/'
      expect(formatImportDirectory(path)).to.equal('/ipfs-companion-imports/my-directory/')
    })

    it('should replace multiple slashes with a single slash', function () {
      const path = '/ipfs-companion-imports/////////my-directory/'
      expect(formatImportDirectory(path)).to.equal('/ipfs-companion-imports/my-directory/')
    })

    it('should add trailing slash if not present', function () {
      const path = '/ipfs-companion-imports/my-directory'
      expect(formatImportDirectory(path)).to.equal('/ipfs-companion-imports/my-directory/')
    })

    it('should replace date wildcards with padded dates', function () {
      const path = '/ipfs-companion-imports/%Y-%M-%D_%h%m%s/'
      expect(formatImportDirectory(path)).to.equal('/ipfs-companion-imports/2017-11-05_120101/')
    })
  })

  describe('createIpfsImportHandler', function () {
    const sandbox = sinon.createSandbox()
    const getState = sandbox.stub()
    const getIpfs = sandbox.stub()
    const ipfsPathValidator = sandbox.stub()
    const runtime = {
      hasNativeProtocolHandler: false
    }
    const hasNativeProtocolHandlerStub = sandbox.stub(runtime, 'hasNativeProtocolHandler')
    const copier = sandbox.stub()

    const ipfsImportHandler = createIpfsImportHandler(getState, getIpfs, ipfsPathValidator, runtime, copier)

    afterEach(function () {
      sandbox.restore()
    })

    describe('openFilesAtWebUI', function () {
      it('should open the webui with the correct path', async function () {
        const state = { webuiRootUrl: 'http://localhost:5001' }
        const mfsPath = '/my-directory'
        const url = `${state.webuiRootUrl}#/files${mfsPath}`
        getState.returns(state)
        await ipfsImportHandler.openFilesAtWebUI(mfsPath)
        sinon.assert.calledWith(browser.tabs.create, { url })
      })
    })

    describe('openFilesAtGateway', function () {
      it('should open the gateway with the correct path', async function () {
        const ipfs = {
          files: {
            stat: () => Promise.resolve({
              cid: 'bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa'
            })
          }
        }
        const state = { pubGwURLString: 'http://ipfs.io' }
        const mfsPath = '/my-directory'
        const url = `${state.pubGwURLString}/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa`
        getState.returns(state)
        getIpfs.returns(ipfs)
        await ipfsImportHandler.openFilesAtGateway(mfsPath)
        sinon.assert.calledWith(browser.tabs.create, { url })
      })

      it('should open the gateway with the correct path when native protocol handlers are set', async function () {
        const ipfs = {
          files: {
            stat: () => Promise.resolve({
              cid: 'bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa'
            })
          }
        }
        getIpfs.returns(ipfs)
        getState.returns({ pubGwURLString: 'http://ipfs.io' })
        hasNativeProtocolHandlerStub.value(true)
        const mfsPath = '/my-directory'
        const url = 'ipfs://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa'
        await ipfsImportHandler.openFilesAtGateway(mfsPath)
        sinon.assert.calledWith(browser.tabs.create, { url })
      })
    })

    describe('copyImportResultsToFiles', function () {
      // TODO: implement
    })

    describe('copyShareLink', function () {
      // TODO: implement
    })

    describe('preloadFilesAtPublicGateway', function () {
      // TODO: implement
    })

    describe('filesCpImportCurrentTab', function () {
      // TODO: implement
    })
  })
})
