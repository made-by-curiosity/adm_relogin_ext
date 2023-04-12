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

// проверяем переключатель
refs.switchButton.addEventListener('click', e => {
  chrome.storage.local.set({ switcher: e.target.checked });
});
chrome.storage.local.get('switcher', res => {
  refs.switchButton.checked = res.switcher;
});

// рисуем кнопки по открытию расширения
chrome.storage.local.get(['id', 'currentId', 'savedLogins'], res => {
  if (!res.currentId) {
    return;
  }

  if (res.savedLogins) {
    res.savedLogins.forEach(login => {
      if (login) {
        addAdmLoginButton(login.loginId, login.loginName);
      }
    });
    removeCurrentBtnClass();
    addCurrentBtnClass(res.currentId.loginId);
  }
});

// добавляем новую кнопку логина
refs.addBtn.addEventListener('click', onAddBtnClick);

// перезаходим на выбранный логин и добавляем его в список текущих, чтобы при разлогине заходило в выбранный(текущий) аккаунт
refs.loginsContainer.addEventListener('click', onLoginBtnClick);

function onLoginBtnClick(e) {
  chrome.storage.local.get('savedLogins', res => {
    // если нажали кнопку удалить
    if (e.target.classList.contains('login-delete')) {
      const btnIdToDelete = Number(e.target.parentElement.id);
      const accounts = res.savedLogins;
      // удаляем аккаунт из хранилища
      accounts.splice(btnIdToDelete, 1, null);
      chrome.storage.local.set({ savedLogins: accounts });
      // удаляем аккаунт из дом-дерева
      e.target.parentElement.remove();
      // если добавленных аккаунтов нет, текущий аккаунт обнуляется в хранилище
      if (refs.loginsContainer.children.length === 0) {
        chrome.storage.local.set({ currentId: null });
        return;
      }
      // если есть добавленные аккаунты, то текущим становится первый в списке кнопок
      const firstAccountId = Number(refs.loginsContainer.firstElementChild.id);
      addCurrentBtnClass(firstAccountId);
      chrome.storage.local.set({ currentId: accounts[firstAccountId] });
    }

    // если нажали кнопку выбора аккаунта
    if (e.target.classList.contains('login-btn')) {
      // ставим выбранный аккаунт текущим
      const clickedBtnId = Number(e.target.id);
      const chosenAccount = res.savedLogins[clickedBtnId];
      chrome.storage.local.set({
        currentId: {
          loginId: chosenAccount.loginId,
          loginName: chosenAccount.loginName,
          agency: chosenAccount.agency,
          staff: chosenAccount.staff,
          pswd: chosenAccount.pswd,
        },
      });
      removeCurrentBtnClass();
      addCurrentBtnClass(clickedBtnId);
      // перезаходим под выбранным аккаунтом
      port.postMessage({ method: 'goTo', url: loginPageUrl });
    }
  });
}

function onAddBtnClick() {
  // не даём добавить данные если есть пустые поля
  if (
    refs.loginNameInput.value.trim() === '' ||
    refs.agencyInput.value.trim() === '' ||
    refs.staffInput.value.trim() === '' ||
    refs.pswdInput.value.trim() === ''
  ) {
    return;
  }

  // добавляем данные из инпутов в локальное хранилище
  chrome.storage.local.get(['savedLogins', 'id'], res => {
    let id = Number(res.id) || 0;
    // добавляем общие данные
    chrome.storage.local.set({
      id: id + 1,
      currentId: {
        loginId: id,
        loginName: refs.loginNameInput.value,
        agency: refs.agencyInput.value,
        staff: refs.staffInput.value,
        pswd: refs.pswdInput.value,
      },
    });
    // добавляем данные в объект добавляемого логина
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

    // убираем current-login класс с текущей активной кнопки, чтобы при добавлении новой кнопки, этот класс был у новой кнопки
    removeCurrentBtnClass();

    // добавляем и рисуем кнопку в списке выбора логинов
    addAdmLoginButton(id, refs.loginNameInput.value);

    // очищаем все инпуты после добавления кнопки
    clearInputsAfterAdd();
  });
}

function addAdmLoginButton(id, btnName) {
  const btnMarkup = `<div class="login-btn current-login" id="${id}">
          ${btnName}
          <button type="button" class="login-delete">&#215;</button>
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

function populateInputs(res) {
  if (!res.currentId) {
    return;
  }
  refs.loginNameInput.value = res.currentId?.loginName || '';
  refs.agencyInput.value = res.currentId?.agency || '';
  refs.staffInput.value = res.currentId?.staff || '';
  refs.pswdInput.value = res.currentId?.pswd || '';
}
