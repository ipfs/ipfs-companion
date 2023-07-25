'use strict'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { formatImportDirectory } from '../../../add-on/src/lib/ipfs-import.js'

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
  // TODO: complete tests
  // describe('openFilesAtWebUI', function () {
  // })
  //
  // describe('openFilesAtGateway', function () {
  // })
  //
  // describe('importFiles', function () {
  // })
})
