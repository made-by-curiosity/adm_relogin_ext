const refs = {
  switchButton: document.getElementById('switchButton'),
  loginNameInput: document.getElementById('login-name'),
  agencyInput: document.getElementById('agency-id'),
  staffInput: document.getElementById('staff-id'),
  pswdInput: document.getElementById('pswd-id'),
  addBtn: document.querySelector('button.addButton'),
};

const port = chrome.runtime.connect({ name: 'exchangeData' });
const loginPageUrl = 'http://www.charmdate.com/clagt/loginb.htm';

refs.switchButton.addEventListener('click', e => {
  chrome.storage.local.set({ switcher: e.target.checked });
});
chrome.storage.local.get('switcher', res => {
  refs.switchButton.checked = res.switcher;
});

chrome.storage.local.get('id', res => {
  let id = Number(res.id) || 0;

  let loginNumber = `login-${id}`;

  chrome.storage.local.get(['id', 'currentId'], res => {
    console.log(res, res.id, res.currentId);
    refs.loginNameInput.value = res.currentId.loginName || '';
    refs.agencyInput.value = res.currentId.agency || '';
    refs.staffInput.value = res.currentId.staff || '';
    refs.pswdInput.value = res.currentId.pswd || '';
  });

  refs.addBtn.addEventListener('click', onAddBtnClick);

  function onAddBtnClick() {
    if (
      refs.loginNameInput.value.trim() === '' ||
      refs.agencyInput.value.trim() === '' ||
      refs.staffInput.value.trim() === '' ||
      refs.pswdInput.value.trim() === ''
    ) {
      return;
    }

    id += 1;

    loginNumber = `login-${id}`;

    chrome.storage.local.set({
      id: id,
      currentId: {
        loginId: id,
        loginName: refs.loginNameInput.value,
        agency: refs.agencyInput.value,
        staff: refs.staffInput.value,
        pswd: refs.pswdInput.value,
      },
      [loginNumber]: {
        loginId: id,
        loginName: refs.loginNameInput.value,
        agency: refs.agencyInput.value,
        staff: refs.staffInput.value,
        pswd: refs.pswdInput.value,
      },
    });
    refs.loginNameInput.value = '';
    refs.agencyInput.value = '';
    refs.staffInput.value = '';
    refs.pswdInput.value = '';

    // addAdmLoginButton(id, refs.loginNameInput.value);
  }
});

// function addAdmLoginButton(id, btnName) {
//   const btnMarkup = `<div class="login-btn" id="${id}">
//           <p class="login-name current-login">${btnName}</p>
//           <button type="button" class="login-delete">x</button>
//         </div>`;
// }
