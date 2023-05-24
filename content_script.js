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
  try {
    const pathname = document.location.pathname;
    const pageLink = await getSavedPageUrl();

    if (pathname === '/clagt/index.php') {
      const loginRes = await makeLogin();

      if (loginRes.url === 'http://www.charmdate.com/clagt/login.php') {
        throw new Error('Something went wrong, please try again');
      }

      port.postMessage({ method: 'goTo', url: pageLink });
    }
  } catch (error) {
    alert(
      'Перезайти не удалось. Возможно пароль был изменён. Обновите пароль и попробуйте еще раз'
    );
  }
}

async function getSavedPageUrl() {
  const defaultPageUrl = 'http://www.charmdate.com/clagt/woman/women_profiles_allow_edit.php';
  const { pageToLoginLink = defaultPageUrl } = await chrome.storage.local.get();

  return pageToLoginLink;
}

async function makeLogin() {
  const {
    currentId: { agency, staff, pswd },
  } = await chrome.storage.local.get();

  const options = {
    method: 'POST',
    body: `agentid=${agency}&staff_id=${staff}&passwd=${pswd}&agentlogin=Login`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const url = `http://www.charmdate.com/clagt/login.php`;

  return await fetch(url, options);
}
