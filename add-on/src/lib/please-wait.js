const messages = [
  'Adding Randomly Mispeled Words Into Text',
  'Creating Randomly Generated Feature',
  'Doing Something You Don\'t Wanna Know About',
  'Doing The Impossible',
  'Don\'t Panic',
  'Generating Plans for Faster-Than-Light Travel',
  'Does Anyone Actually Read This?'
]
exports.pleaseWait = () => messages[Math.floor(Math.random() * messages.length)]
