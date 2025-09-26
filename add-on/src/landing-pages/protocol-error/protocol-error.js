'use strict';
/* eslint-env browser, webextensions */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search)
  const incorrectUrl = params.get('url') || ''
  
  if (incorrectUrl) {
    const domain = incorrectUrl.replace(/^ipfs:\/\//, '')
    const correctUrl = `ipns://${domain}`
    
    document.getElementById('incorrect-url').textContent = incorrectUrl
    document.getElementById('correct-url').textContent = correctUrl
    document.getElementById('btn-url').textContent = correctUrl
    document.getElementById('continue-btn').addEventListener('click', () => {
      // Redirect to Google search with ipns:// which will be intercepted by the extension
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(correctUrl)}`
      window.location.href = searchUrl
    })
    
    // Handle Go Back button
    document.getElementById('go-back').addEventListener('click', () => {
      window.history.back()
    })
  }
})