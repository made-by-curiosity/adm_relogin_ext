const refs = {
  agencyIdInput: document.querySelector('input[name="agentid"]'),
  staffIdInput: document.querySelector('input[name="staff_id"]'),
  pswdInput: document.querySelector('input[name="passwd"]'),
  loginBtn: document.querySelector('input[name="agentlogin"]'),
};

const port = chrome.runtime.connect({ name: 'exchangeData' });
const loginPageUrl = 'http://www.charmdate.com/clagt/loginb.htm';
const overviewPageUrl = 'http://www.charmdate.com/clagt/overview.php?menu1=1';

chrome.storage.local.get('switcher', v => {
  if (v.switcher) {
    relogin();
  }
});

function relogin() {
  const pathname = document.location.pathname;
  console.log('скрипт работает');

  if (pathname === '/clagt/index.php') {
    port.postMessage({ method: 'goTo', url: loginPageUrl });
  }

  if (pathname === '/clagt/loginb.htm') {
    chrome.storage.local.get('id', res => {
      let id = Number(res.id) || 0;

      let loginNumber = `login-${id}`;
      console.log(loginNumber);
      chrome.storage.local.get(['id', 'currentId'], res => {
        console.log(res.currentId);
        refs.agencyIdInput.value = res.currentId.agency;
        refs.staffIdInput.value = res.currentId.staff;
        refs.pswdInput.value = res.currentId.pswd;
        refs.loginBtn.click();
      });
    });
  }

  if (pathname === '/clagt/woman/women_profiles_allow_edit.php') {
    port.postMessage({ method: 'goTo', url: overviewPageUrl });
  }
}
