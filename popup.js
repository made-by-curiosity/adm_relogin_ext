const refs = {
  switchButton: document.getElementById('switchButton'),
  loginNameInput: document.getElementById('login-name'),
  agencyInput: document.getElementById('agency-id'),
  staffInput: document.getElementById('staff-id'),
  pswdInput: document.getElementById('pswd-id'),
  addBtn: document.querySelector('button.addButton'),
  loginsContainer: document.querySelector('.logins-container'),
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

  chrome.storage.local.get(['id', 'currentId', 'savedLogins'], res => {
    console.log(res, res.id, res.currentId, res.savedLogins);
    refs.loginNameInput.value = res.currentId?.loginName || '';
    refs.agencyInput.value = res.currentId?.agency || '';
    refs.staffInput.value = res.currentId?.staff || '';
    refs.pswdInput.value = res.currentId?.pswd || '';

    res.savedLogins.forEach(login => {
      addAdmLoginButton(login.loginId, login.loginName);
    });
    removeCurrentBtnClass();
    addCurrentBtnClass(res.currentId.loginId);
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

    chrome.storage.local.get('savedLogins', res => {
      chrome.storage.local.set({
        id: id,
        currentId: {
          loginId: id,
          loginName: refs.loginNameInput.value,
          agency: refs.agencyInput.value,
          staff: refs.staffInput.value,
          pswd: refs.pswdInput.value,
        },
      });
      if (!res.savedLogins) {
        // если добавленных логинов нет
        chrome.storage.local.set({
          savedLogins: [
            {
              loginId: id,
              loginName: refs.loginNameInput.value,
              agency: refs.agencyInput.value,
              staff: refs.staffInput.value,
              pswd: refs.pswdInput.value,
            },
          ],
        });
      } else {
        // если добавленные логины есть
        chrome.storage.local.set({
          savedLogins: [
            ...res.savedLogins,
            {
              loginId: id,
              loginName: refs.loginNameInput.value,
              agency: refs.agencyInput.value,
              staff: refs.staffInput.value,
              pswd: refs.pswdInput.value,
            },
          ],
        });
      }

      // убрать current-login класс с текущей активной кнопки, чтобы при добавлении новой, этот класс был у новой
      removeCurrentBtnClass();

      // добавить кнопку в список выбора логинов
      addAdmLoginButton(id, refs.loginNameInput.value);
      // очистить все инпуты
      clearInputsAfterAdd();

      id += 1;
      loginNumber = `login-${id}`;
    });
  }
});

function addAdmLoginButton(id, btnName) {
  const btnMarkup = `<div class="login-btn current-login" id="${id}">
          <p class="login-name">${btnName}</p>
          <button type="button" class="login-delete">x</button>
        </div>`;

  refs.loginsContainer.insertAdjacentHTML('beforeend', btnMarkup);
}

function removeCurrentBtnClass() {
  [...refs.loginsContainer.children].forEach(btn => {
    if (btn.classList.contains('current-login')) {
      btn.classList.remove('current-login');
    }
  });
}

function clearInputsAfterAdd() {
  refs.loginNameInput.value = '';
  refs.agencyInput.value = '';
  refs.staffInput.value = '';
  refs.pswdInput.value = '';
}

function addCurrentBtnClass(currentId) {
  [...refs.loginsContainer.children].forEach(btn => {
    if (Number(btn.id) === currentId) {
      btn.classList.add('current-login');
    }
  });
}

// function deleteAdmLoginButton(id) {
//   [...refs.loginsContainer.children].forEach(btn => {
//     if (Number(btn.id) === id) {
//       btn.remove();
//     }
//   });
// }
