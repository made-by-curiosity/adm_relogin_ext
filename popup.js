const refs = {
  switchButton: document.getElementById('switchButton'),
  loginNameInput: document.getElementById('login-name'),
  ladyIdInput: document.getElementById('lady-id'),
  agencyInput: document.getElementById('agency-id'),
  staffInput: document.getElementById('staff-id'),
  pswdInput: document.getElementById('pswd-id'),
  addBtn: document.querySelector('button.addButton'),
  saveBtn: document.querySelector('button.saveButton'),
  loginsContainer: document.querySelector('.logins-container'),
  errorText: document.querySelector('.empty-fields-error'),
  authError: document.querySelector('.auth-error'),
  noAccountsMessage: document.querySelector('.no-accounts-message'),
  loginAddForm: document.querySelector('.add-pswd-container'),
  pageSelect: document.querySelector('.page-select'),
  ladySelectGroup: document.querySelector('.lady-group'),
  defaultSelectGroup: document.querySelector('.default-group'),
  currentWomanId: document.querySelector('.woman-id'),
};

// 90 days (in ms)
const EMF_SEARCH_DAYS_DIFFERENCE = 7776000000;

const port = chrome.runtime.connect({ name: 'exchangeData' });

updatePopup();

// Сохраняем состояние переключателя
refs.switchButton.addEventListener('click', onReloginSwitcherClick);

// Сохраняем вводимые данные в хранилище
refs.loginAddForm.addEventListener('input', onFormInput);

// сохраняем выбранную страницу куда делать логин
refs.pageSelect.addEventListener('change', onSelectChange);

// добавляем новую кнопку логина
refs.addBtn.addEventListener('click', onAddBtnClick);

// обновляем данные аккаунта
refs.saveBtn.addEventListener('click', onSaveBtnClick);

// удалить или перезайти в выбранный аккаунт
refs.loginsContainer.addEventListener('click', onLoginBtnClick);

async function updatePopup() {
  refs.loginsContainer.innerHTML = '';
  // проверяем состояние переключателя
  await setSwitcherState();
  // проверяем выбранный селект
  await setSavedSelect();
  // заполняем инпуты если что-то было введено
  await populateInputs();
  // рисуем кнопки по открытию расширения
  await renderLoginBtns();
}

// проверяем состояние переключателя
async function setSwitcherState() {
  try {
    const switcherState = await chrome.storage.local.get('switcher');
    const isReloginChecked = switcherState.switcher;

    refs.switchButton.checked = isReloginChecked;
  } catch (error) {
    console.log(error);
  }
}

// рисуем общие селекты
function renderPagesSelects() {
  const optionsMarkup = createPagesOptionsMarkup();

  refs.defaultSelectGroup.innerHTML = optionsMarkup;
}

// рисуем селекты с ссылками с леди айди
async function renderLadyPagesSelects() {
  const { currentId } = await chrome.storage.local.get();

  if (!currentId) {
    refs.ladySelectGroup.innerHTML = '';
    return;
  }

  const { ladyId } = currentId;

  const ladySelectMarkup = createPagesLadyOptionsMarkup(ladyId);

  refs.ladySelectGroup.innerHTML = ladySelectMarkup;
}

// проверяем выбранный селект
async function setSavedSelect() {
  // рисуем ощие страницы в селекте
  renderPagesSelects();
  // рисуем селекты с ссылками с леди айди
  await renderLadyPagesSelects();
  // выбираем нужный селект
  const { pageToLogin = 'default' } = await chrome.storage.local.get();
  const selectPages = refs.pageSelect.options;

  [...selectPages].forEach(page => {
    const availablePageName = page.attributes.name.value;
    if (availablePageName === pageToLogin) {
      page.selected = true;
    }
  });
}

// заполняем инпуты если что-то было введено
async function populateInputs() {
  try {
    const { inputInfo } = await chrome.storage.local.get();

    if (!inputInfo) {
      return;
    }

    refs.ladyIdInput.value = inputInfo?.ladyId || '';
    refs.loginNameInput.value = inputInfo?.name || '';
    refs.agencyInput.value = inputInfo?.agency || '';
    refs.staffInput.value = inputInfo?.staff || '';
    refs.pswdInput.value = inputInfo?.pswd || '';
  } catch (error) {
    console.log(error);
  }
}

// рисуем кнопки по открытию расширения
async function renderLoginBtns() {
  try {
    const { currentId, savedLogins } = await chrome.storage.local.get();

    if (!currentId) {
      return;
    }

    refs.currentWomanId.innerText = currentId.ladyId;

    if (savedLogins) {
      savedLogins.forEach(login => {
        if (login) {
          addAdmLoginButton(login.loginId, login.loginName);
        }
      });
      removeCurrentBtnClass();
      addCurrentBtnClass(currentId.loginId);
    }

    if (refs.loginsContainer.children.length > 0) {
      refs.noAccountsMessage.classList.add('no-accounts-hidden');
    }
  } catch (error) {
    console.log(error);
  }
}

// Сохраняем состояние переключателя
function onReloginSwitcherClick(e) {
  chrome.storage.local.set({ switcher: e.target.checked });
}

// Сохраняем вводимые данные в хранилище
function onFormInput(e) {
  const typingInputInfo = {
    ladyId: refs.ladyIdInput.value.trim(),
    name: refs.loginNameInput.value.trim(),
    agency: refs.agencyInput.value.trim(),
    staff: refs.staffInput.value.trim(),
    pswd: refs.pswdInput.value.trim(),
  };

  chrome.storage.local.set({ inputInfo: typingInputInfo });
}

// сохранить значение выбранного селекта
async function onSelectChange() {
  const pageToLogin = refs.pageSelect.selectedOptions[0].attributes.name.value;
  const pageToLoginLink = refs.pageSelect.selectedOptions[0].value;

  chrome.storage.local.set({ pageToLogin, pageToLoginLink });

  const { currentId } = await chrome.storage.local.get();

  if (!currentId) {
    return;
  }

  changePageForCurrenAccount();
}

// удалить или перезайти в выбранный аккаунт
async function onLoginBtnClick(e) {
  try {
    const logins = await chrome.storage.local.get('savedLogins');
    const accounts = [...logins.savedLogins];

    // удалить выбранный аккаунт
    if (e.target.classList.contains('login-delete')) {
      await deleteAccount(e.target, accounts);
      return;
    }

    // удалить выбранный аккаунт
    if (e.target.classList.contains('login-change')) {
      await changeAccountInfo(e.target, accounts);
      return;
    }

    // перезайти в выбранный аккаунт
    loginToAccount(e.target, accounts);
  } catch (error) {
    console.log(error);
  }
}

// редактировать данные аккаунта
async function changeAccountInfo(accountBtn, accounts) {
  const btnIdToEdit = Number(accountBtn.parentElement.id);
  const { agency, ladyId, loginName, pswd, staff } = accounts[btnIdToEdit];

  refs.saveBtn.dataset.id = btnIdToEdit;

  refs.saveBtn.classList.remove('is-hidden');
  refs.addBtn.classList.add('is-hidden');

  refs.ladyIdInput.value = ladyId;
  refs.loginNameInput.value = loginName;
  refs.agencyInput.value = agency;
  refs.staffInput.value = staff;
  refs.pswdInput.value = pswd;
}

// сохранить изменённые данные аккаунта
async function onSaveBtnClick(e) {
  try {
    // не даём добавить данные если есть пустые поля
    if (
      refs.ladyIdInput.value.trim() === '' ||
      refs.loginNameInput.value.trim() === '' ||
      refs.agencyInput.value.trim() === '' ||
      refs.staffInput.value.trim() === '' ||
      refs.pswdInput.value.trim() === ''
    ) {
      refs.errorText.classList.remove('error-hidden');
      setTimeout(() => {
        refs.errorText.classList.add('error-hidden');
      }, 3000);
      return;
    }

    refs.saveBtn.removeEventListener('click', onSaveBtnClick);

    const agency = refs.agencyInput.value;
    const staff = refs.staffInput.value;
    const pswd = refs.pswdInput.value;

    const loginRes = await makeLogin(agency, staff, pswd);

    if (loginRes.url === 'http://www.charmdate.com/clagt/login.php') {
      refs.saveBtn.addEventListener('click', onSaveBtnClick);
      throw new Error('Something went wrong, please try again');
    }

    refs.saveBtn.addEventListener('click', onSaveBtnClick);

    // сохраняем кнопку в хранилище
    const { savedLogins, currentId } = await chrome.storage.local.get();
    const accountIdToUpdate = Number(refs.saveBtn.dataset.id);

    const accountToUpdate = {
      agency,
      ladyId: refs.ladyIdInput.value,
      loginId: accountIdToUpdate,
      loginName: refs.loginNameInput.value,
      pswd,
      staff,
    };

    savedLogins.splice(accountIdToUpdate, 1, accountToUpdate);

    chrome.storage.local.set({
      savedLogins,
    });

    refs.saveBtn.classList.add('is-hidden');
    refs.addBtn.classList.remove('is-hidden');

    // очищаем все инпуты после сохранения
    clearInputsAfterAdd();

    if (currentId.loginId === accountIdToUpdate) {
      chrome.storage.local.set({
        currentId: accountToUpdate,
      });

      updatePopup();
    } else {
      const { agency, staff, pswd } = currentId;

      const loginRes = await makeLogin(agency, staff, pswd);

      if (loginRes.url === 'http://www.charmdate.com/clagt/login.php') {
        throw new Error('Something went wrong, please try again');
      }

      updatePopup();
    }
  } catch (error) {
    console.error(error);
    refs.authError.classList.remove('error-hidden');
    setTimeout(() => {
      refs.authError.classList.add('error-hidden');
    }, 3000);
  }
}

// удалить выбранный аккаунт
async function deleteAccount(accountBtn, accounts) {
  try {
    const btnIdToDelete = Number(accountBtn.parentElement.id);

    // удаляем аккаунт из хранилища
    accounts.splice(btnIdToDelete, 1, null);
    chrome.storage.local.set({ savedLogins: accounts });

    // удаляем аккаунт из дом-дерева
    accountBtn.parentElement.remove();

    // если добавленных аккаунтов нет, текущий аккаунт обнуляется в хранилище
    if (refs.loginsContainer.children.length === 0) {
      chrome.storage.local.set({
        id: 0,
        currentId: null,
        savedLogins: [],
      });
      refs.noAccountsMessage.classList.remove('no-accounts-hidden');

      await setSavedSelect();
      return;
    }

    // если есть добавленные аккаунты, то текущим становится первый в списке кнопок
    const firstAccountId = Number(refs.loginsContainer.firstElementChild.id);
    addCurrentBtnClass(firstAccountId);
    chrome.storage.local.set({ currentId: accounts[firstAccountId] });

    await setSavedSelect();

    const { agency, staff, pswd } = accounts[firstAccountId];

    const loginRes = await makeLogin(agency, staff, pswd);

    if (loginRes.url === 'http://www.charmdate.com/clagt/login.php') {
      throw new Error('Something went wrong, please try again');
    }
  } catch (error) {
    refs.authError.classList.remove('error-hidden');
    setTimeout(() => {
      refs.authError.classList.add('error-hidden');
    }, 3000);
  }
}

// перезайти в выбранный аккаунт
function loginToAccount(accountBtn, accounts) {
  chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, async tabs => {
    try {
      const isCharmdate = tabs[0].url.includes('charmdate.com');

      if (accountBtn.classList.contains('login-btn')) {
        // ставим выбранный аккаунт текущим
        const clickedBtnId = Number(accountBtn.id);
        const { loginId, ladyId, loginName, agency, staff, pswd } = accounts[clickedBtnId];

        const loginRes = await makeLogin(agency, staff, pswd);

        if (loginRes.url === 'http://www.charmdate.com/clagt/login.php') {
          throw new Error('Something went wrong, please try again');
        }

        chrome.storage.local.set({
          currentId: {
            loginId,
            ladyId,
            loginName,
            agency,
            staff,
            pswd,
          },
        });

        removeCurrentBtnClass();
        addCurrentBtnClass(clickedBtnId);

        refs.currentWomanId.innerText = ladyId;

        await setSavedSelect();

        const pageToLoginLink = refs.pageSelect.selectedOptions[0].value;

        chrome.storage.local.set({ pageToLoginLink });
        // перезаходим под выбранным аккаунтом
        if (isCharmdate) {
          port.postMessage({ method: 'goTo', url: pageToLoginLink });
        } else {
          port.postMessage({ method: 'openTab', url: pageToLoginLink });
        }
      }
    } catch (error) {
      refs.authError.classList.remove('error-hidden');
      setTimeout(() => {
        refs.authError.classList.add('error-hidden');
      }, 3000);
    }
  });
}

// зайти на страницу по выбору селекта для текущего аккаунта
function changePageForCurrenAccount() {
  chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, async tabs => {
    try {
      const isCharmdate = tabs[0].url.includes('charmdate.com');

      const pageToLogin = refs.pageSelect.selectedOptions[0].value;
      // перезаходим под выбранным аккаунтом
      if (isCharmdate) {
        port.postMessage({ method: 'goTo', url: pageToLogin });
      } else {
        port.postMessage({ method: 'openTab', url: pageToLogin });
      }
    } catch (error) {
      console.log(error);
    }
  });
}

async function makeLogin(agencyId, staffId, admPswd) {
  const options = {
    method: 'POST',
    body: `agentid=${agencyId}&staff_id=${staffId}&passwd=${admPswd}&agentlogin=Login`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const url = `http://www.charmdate.com/clagt/login.php`;

  return await fetch(url, options);
}

// добавляем новую кнопку логина
async function onAddBtnClick() {
  try {
    // не даём добавить данные если есть пустые поля
    if (
      refs.ladyIdInput.value.trim() === '' ||
      refs.loginNameInput.value.trim() === '' ||
      refs.agencyInput.value.trim() === '' ||
      refs.staffInput.value.trim() === '' ||
      refs.pswdInput.value.trim() === ''
    ) {
      refs.errorText.classList.remove('error-hidden');
      setTimeout(() => {
        refs.errorText.classList.add('error-hidden');
      }, 3000);
      return;
    }

    refs.addBtn.removeEventListener('click', onAddBtnClick);

    const agency = refs.agencyInput.value;
    const staff = refs.staffInput.value;
    const pswd = refs.pswdInput.value;

    const loginRes = await makeLogin(agency, staff, pswd);

    if (loginRes.url === 'http://www.charmdate.com/clagt/login.php') {
      refs.addBtn.addEventListener('click', onAddBtnClick);
      throw new Error('Something went wrong, please try again');
    }

    refs.addBtn.addEventListener('click', onAddBtnClick);

    // сохраняем кнопку в хранилище
    const { savedLogins = [], id = 0 } = await chrome.storage.local.get();
    const accountToAdd = {
      loginId: id,
      ladyId: refs.ladyIdInput.value,
      loginName: refs.loginNameInput.value,
      agency,
      staff,
      pswd,
    };

    savedLogins.push(accountToAdd);

    // обновляем данные в хранилище
    chrome.storage.local.set({
      id: id + 1,
      currentId: accountToAdd,
      savedLogins,
    });

    // обновляем страницы в селектах под новый аккаунт
    await setSavedSelect();
    // убираем current-login класс с текущей активной кнопки, чтобы при добавлении новой кнопки, этот класс был у новой кнопки
    removeCurrentBtnClass();

    // добавляем и рисуем кнопку в списке выбора логинов
    addAdmLoginButton(id, refs.loginNameInput.value);

    // рисуем текущий айди девушки
    refs.currentWomanId.innerText = refs.ladyIdInput.value;

    // очищаем все инпуты после добавления кнопки
    clearInputsAfterAdd();

    if (refs.loginsContainer.children.length > 0) {
      refs.noAccountsMessage.classList.add('no-accounts-hidden');
    }
  } catch (error) {
    console.log(error);
    refs.authError.classList.remove('error-hidden');
    setTimeout(() => {
      refs.authError.classList.add('error-hidden');
    }, 3000);
  }
}

// добавляем и рисуем кнопку в списке выбора логинов
function addAdmLoginButton(id, btnName) {
  const btnMarkup = `<div class="login-btn current-login" id="${id}">
          ${btnName}
          <button type="button" class="login-delete">&#215;</button>
					<button type="button" class="login-change">&#9998;</button>
        </div>`;

  refs.loginsContainer.insertAdjacentHTML('beforeend', btnMarkup);
}

// очищаем все инпуты после добавления кнопки
function clearInputsAfterAdd() {
  const typingInputInfo = {
    ladyId: '',
    name: '',
    agency: '',
    staff: '',
    pswd: '',
  };

  chrome.storage.local.set({ inputInfo: typingInputInfo });

  refs.ladyIdInput.value = '';
  refs.loginNameInput.value = '';
  refs.agencyInput.value = '';
  refs.staffInput.value = '';
  refs.pswdInput.value = '';
}

// добавляем класс текущей кнопки
function addCurrentBtnClass(currentId) {
  [...refs.loginsContainer.children].forEach(btn => {
    if (Number(btn.id) === currentId) {
      btn.classList.add('current-login');
    }
  });
}

// удаляем класс текущей кнопки
function removeCurrentBtnClass() {
  [...refs.loginsContainer.children].forEach(btn => {
    if (btn.classList.contains('current-login')) {
      btn.classList.remove('current-login');
    }
  });
}

// считаем даты и время
function getCalculatedTime() {
  const currentDay = new Date().getUTCDate();
  const currentMonth = new Date().getUTCMonth() + 1;
  const currentYear = new Date().getUTCFullYear();

  const dateNow = new Date().getTime();

  const dateStart = dateNow - EMF_SEARCH_DAYS_DIFFERENCE;

  const startDay = new Date(dateStart).getUTCDate();
  const startMonth = new Date(dateStart).getUTCMonth() + 1;
  const startYear = new Date(dateStart).getUTCFullYear();

  const dates = {
    currentDay,
    currentMonth,
    currentYear,
    startDay,
    startMonth,
    startYear,
  };

  return dates;
}

// разметка вариантов страниц куда логиниться для селекта
function createPagesLadyOptionsMarkup(ladyId) {
  const { currentDay, currentMonth, currentYear, startDay, startMonth, startYear } =
    getCalculatedTime();

  return `
	<option name="endedchatsladyid" value="http://www.charmdate.com/clagt/livechat/index.php?service_type=&womanid=${ladyId}&action=close">
                Законченные чаты
              </option>
							<option name="emfman" value="http://www.charmdate.com/clagt/emf_search_result.php?adddate_s_m=${startMonth}&adddate_s_d=${startDay}&adddate_s_y=${startYear}&adddate_e_m=${currentMonth}&adddate_e_d=${currentDay}&adddate_e_y=${currentYear}&pflag=&forward=&manid=&womanid=${ladyId}&Submit2=+Search+">
                Входящие письма М
              </option>
							<option name="emfwoman" value="http://www.charmdate.com/clagt/emf_wm_result.php?adddate_s_m=${startMonth}&adddate_s_d=${startDay}&adddate_s_y=${startYear}&adddate_e_m=${currentMonth}&adddate_e_d=${currentDay}&adddate_e_y=${currentYear}&flag=&manid=&womanid=${ladyId}&Submit3=+Search+">
                Исходящие письма Ж
              </option>
							<option name="emfsearchall" value="http://www.charmdate.com/clagt/emf_frequent_result.php?adddate_s_m=${startMonth}&adddate_s_d=${startDay}&adddate_s_y=${startYear}&adddate_e_m=${currentMonth}&adddate_e_d=${currentDay}&adddate_e_y=${currentYear}&manid=&womanid=${ladyId}&Submit2=+Search+">
                Все письма All
              </option>
							<option name="admire" value="http://www.charmdate.com/clagt/admire/admir_search_result.php?sendflag=Y&senddate=1m&readflag=&manid=&womanid=${ladyId}&Submit=+Search+">
                Admirer Mail Seach
              </option>
							<option name="callreqest" value="http://www.charmdate.com/clagt/lovecall/search_result_call.php?act=callsearch&formno=&subdate1=${currentYear}-${currentMonth}-${currentDay}&subdate2=${currentYear}-${currentMonth}-${currentDay}&calldate1=&calldate2=&staffid=&translator=&manid=&womanid=${ladyId}&callflag=&Submit22=+Search+Now+">
                Запросы на звонки
              </option>
							<option name="firstemfall" value="http://www.charmdate.com/clagt/first_emf.php?first_emf_type=&groupshow=4&womanid=${ladyId}&manid=&sentMail=&agtstaff=">
                Фёсты (все)
              </option>
							<option name="firstemfnotfull" value="http://www.charmdate.com/clagt/first_emf.php?first_emf_type=&groupshow=4&womanid=${ladyId}&manid=&sentMail=quota_not_full&agtstaff=">
                Фёсты (нет лимита)
              </option>
							<option name="videoshowlady" value="http://www.charmdate.com/clagt/videoshow/access_key_request_new.php?groupshow=4&searchManId=&searchWomanId=${ladyId}&date1=&date2=&agtstaff=&Submit=Search">
                Видеошоу входящие
              </option>
							<option name="norecent" value="http://www.charmdate.com/clagt/relation/relation_focus.php?manid=&act=s&groupshow=4&womanid=${ladyId}">
                No recent activity
              </option>
	`;
}

function createPagesOptionsMarkup() {
  const { currentDay, currentMonth, currentYear } = getCalculatedTime();

  return `
	<option
                name="default"
                value="http://www.charmdate.com/clagt/woman/women_profiles_allow_edit.php"
                selected
              >
                Default Page
              </option>
              <option name="overview" value="http://www.charmdate.com/clagt/overview.php?menu1=1">
                Overview
              </option>
              <option
                name="activechats"
                value="http://www.charmdate.com/clagt/livechat/index.php?action=live"
              >
                Текущие чаты
              </option>
              <option
                name="endedchats"
                value="http://www.charmdate.com/clagt/livechat/index.php?action=close"
              >
                Законченные чаты
              </option>
              <option
                name="paidletters"
                value="http://www.charmdate.com/clagt/emf_men_women_unprinted.php"
              >
                Платные письма
              </option>
              <option
                name="searchletters"
                value="http://www.charmdate.com/clagt/agent_search_mw.php"
              >
                Поиск по письмам
              </option>
              <option name="firstemf" value="http://www.charmdate.com/clagt/first_emf.php">
                Фёсты
              </option>
              <option name="sayhi" value="http://www.charmdate.com/clagt/cupidnote/index.php">
                Say hi
              </option>
              <option
                name="videoshow"
                value="http://www.charmdate.com/clagt/videoshow/access_key_request_new.php"
              >
                Видеошоу
              </option>
	<option name="missedchats" value="http://www.charmdate.com/clagt/livechat/chat_invite_miss_detail.php?toflag=0&sdate=${currentYear}-${currentMonth}-01&edate=${currentYear}-${currentMonth}-${currentDay}&datetxt=${currentYear}-${currentMonth}">
Пропуски чатов
</option>
	`;
}
