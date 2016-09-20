function saveOptions(e) {
  chrome.storage.local.set({
    publicGateways: document.querySelector("#publicGateways").value
  });
}

function restoreOptions() {
  chrome.storage.local.get("publicGateways", (res) => {
    document.querySelector("#publicGateways").value = res.publicGateways || "ipfs.io gateway.ipfs.io ipfs.pics";
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
