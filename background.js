chrome.runtime.onConnect.addListener(p => {
  if (p.name == 'exchangeData') {
    p.onMessage.addListener(msg => {
      if (msg.method == 'goTo') {
        chrome.tabs.update({ url: msg.url });
      }
    });
  }
});
