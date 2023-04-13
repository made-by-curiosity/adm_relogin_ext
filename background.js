chrome.runtime.onConnect.addListener(p => {
  if (p.name == 'exchangeData') {
    p.onMessage.addListener(msg => {
      if (msg.method == 'goTo') {
        chrome.tabs.update({ url: msg.url });
      }

      if (msg.method == 'openTab') {
        chrome.tabs.create({ url: msg.url, active: true });
      }
    });
  }
});
