const urls = {
  loginPageUrl: 'http://www.charmdate.com/clagt/loginb.htm',
  ladyPageOnLoadPath: '/clagt/woman/women_profiles_allow_edit.php',
  overviewPageUrl: 'http://www.charmdate.com/clagt/overview.php?menu1=1',
  activeChatUrl: 'http://www.charmdate.com/clagt/livechat/index.php?action=live',
};

const refs = {
  agencyIdInput: document.querySelector('input[name="agentid"]'),
  staffIdInput: document.querySelector('input[name="staff_id"]'),
  pswdInput: document.querySelector('input[name="passwd"]'),
  loginBtn: document.querySelector('input[name="agentlogin"]'),
};

const port = chrome.runtime.connect({ name: 'exchangeData' });

chrome.storage.local.get('switcher', r => {
  if (r.switcher) {
    relogin();
  }
});

async function relogin() {
  const pathname = document.location.pathname;

  if (pathname === '/clagt/index.php') {
    port.postMessage({ method: 'goTo', url: await getSavedPageUrl() });
  }
}

async function getSavedPageUrl() {
  const defaultPageUrl = 'http://www.charmdate.com/clagt/woman/women_profiles_allow_edit.php';
  const { pageToLogin = defaultPageUrl } = await chrome.storage.local.get();

  return pageToLogin;
}
