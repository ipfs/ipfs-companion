// Search for items with data-i18n attribute and replace them with values from current locale
let items = document.querySelectorAll("[data-i18n]");
for (let item of items) {
  let translation = chrome.i18n.getMessage(item.getAttribute("data-i18n"));
  if (typeof item.value !== "undefined" && item.value === "i18n") {
    // things like inputs can trigger translation with value equal "i18n"
    item.value = translation;
  } else {
    item.innerText = translation;
  }
}
