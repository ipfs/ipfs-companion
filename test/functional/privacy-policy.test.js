'use strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { expect } from 'chai'

// PRIVACY-POLICY.md and data_collection_permissions are one promise written in
// two places, and they have drifted apart before. Keep them together: deleting
// either sentence turns this red, which is the point. Changing what Companion
// collects is a policy decision for a maintainer, not a feature to land on a
// task prompt. See AGENTS.md.

const repoFile = (name) => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8')

const policy = repoFile('PRIVACY-POLICY.md')
const firefox = JSON.parse(repoFile('add-on/manifest.firefox.json'))

describe('PRIVACY-POLICY.md', function () {
  it('should state that no metrics are collected', () => {
    expect(policy).to.include('We do not collect usage metrics, analytics, or telemetry.')
  })

  it('should state that no personal information is collected', () => {
    expect(policy).to.include('We do not collect personal information from the users of the Service.')
  })
})

describe('data_collection_permissions', function () {
  it('should declare no collection to addons.mozilla.org', () => {
    expect(firefox.browser_specific_settings.gecko.data_collection_permissions).to.deep.equal({
      required: ['none']
    })
  })
})
