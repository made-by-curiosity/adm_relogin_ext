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
  currentWomanId: document.querySelectorAll('.woman-id'),
  hideMenuTrigger: document.querySelector('.hide-menu-trigger'),
  madeByLink: document.querySelector('.made-by'),
  sectionsContainer: document.querySelector('.sections-container'),
  menu: document.querySelector('.menu'),
  lettersContainer: document.querySelector('.letters-container'),
  sentInput: document.querySelector('.sent'),
  notSentInput: document.querySelector('.not-sent'),
  leftToSendInput: document.querySelector('.left-to-send'),
  menIds: document.querySelector('.letters-men-ids'),
  letterText: document.querySelector('.letter-text-field'),
  sendLettersBtn: document.querySelector('.letters-send-btn'),
  stopSendLettersBtn: document.querySelector('.letters-stop-btn'),
  lettersSentCounter: document.querySelector('.letters-sent-counter'),
  lettersNotSentCounter: document.querySelector('.letters-not-sent-counter'),
  lettersLeftToSendCounter: document.querySelector('.letters-left-counter'),
  lettersStatuses: document.querySelector('.letter-sending-status'),
  lettersStatusInput: document.querySelector('.letters-send-status-input'),
  lettersStatusSending: document.querySelector('.letters-send-status-sending'),
  lettersStatusStopped: document.querySelector('.letters-send-status-stopped'),
  lettersStatusFinished: document.querySelector('.letters-send-status-finished'),
  allMenNumber: document.querySelector('.all-men-quantity'),
  freePhotosMediaList: document.querySelector('.free-photo-list'),
  paidPhotosMediaList: document.querySelector('.paid-photo-list'),
  videosMediaList: document.querySelector('.videos-list'),
  mediaList: document.querySelector('.media-list'),
  mediaContainer: document.querySelector('.letters-media-wrapper'),
  noManIdMessage: document.querySelector('.no-man-id-input'),
  letterSizeMessage: document.querySelector('.size-letter-message'),
  letterTypes: document.querySelector('.letter-type-wrapper'),
  letterTypeEMF: document.querySelector('.letter-type-emf'),
  letterTypeSayHi: document.querySelector('.letter-type-sayhi'),
  converterSection: document.querySelector('.converter-wrapper'),
  converterBtn: document.querySelector('.converter-btn'),
  converterTypes: document.querySelector('.radiobox-wrapper'),
  converterOpen: document.querySelector('.converter-open'),
  converterBack: document.querySelector('.converter-back'),
  converterInput: document.querySelector('#converter-input'),
  converterOutput: document.querySelector('#converter-output'),
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

// скрыть основное меню
refs.hideMenuTrigger.addEventListener('click', onMenuHide);

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
  // скрываем или рисуем меню
  await setMenuState();
  // показываем выбранное меню
  await setCurrentMenu();
  // обновить меню писем
  await updateLettersMenu();
}

// !-ДОБАВЛЕНИЕ АККАУНТОВ И ПЕРЕЗАХОД-!

async function onMenuHide() {
  const { isMenuHidden = false } = await chrome.storage.local.get();

  if (isMenuHidden) {
    chrome.storage.local.set({ isMenuHidden: false });
  } else {
    chrome.storage.local.set({ isMenuHidden: true });
  }

  refs.sectionsContainer.classList.toggle('is-hidden');
}

async function setMenuState() {
  const { isMenuHidden = false } = await chrome.storage.local.get();

  if (isMenuHidden) {
    refs.sectionsContainer.classList.add('is-hidden');
  } else {
    refs.sectionsContainer.classList.remove('is-hidden');
  }
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

    updateCurrentWomanId(currentId.ladyId);

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
    await loginToAccount(e.target, accounts);
  } catch (error) {
    console.log(error);
  }
}

// редактировать данные аккаунта
async function changeAccountInfo(accountBtn, accounts) {
  refs.converterSection.classList.add('is-hidden');

  chrome.storage.local.set({ currentMenu: 'accounts' });
  setCurrentMenu();

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

      clearAllMediaData();
      return;
    }

    // если есть добавленные аккаунты, то текущим становится первый в списке кнопок
    const firstAccountId = Number(refs.loginsContainer.firstElementChild.id);
    addCurrentBtnClass(firstAccountId);
    chrome.storage.local.set({ currentId: accounts[firstAccountId] });

    await setSavedSelect();

    const { ladyId, agency, staff, pswd } = accounts[firstAccountId];

    const loginRes = await makeLogin(agency, staff, pswd);

    if (loginRes.url === 'http://www.charmdate.com/clagt/login.php') {
      throw new Error('Something went wrong, please try again');
    }

    chrome.storage.local.set({ savedAlbums: {} });
    await updateLettersMenu();
    updateCurrentWomanId(ladyId);
  } catch (error) {
    refs.authError.classList.remove('error-hidden');
    setTimeout(() => {
      refs.authError.classList.add('error-hidden');
    }, 3000);
  }
}

// перезайти в выбранный аккаунт
async function loginToAccount(accountBtn, accounts) {
  chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, async tabs => {
    try {
      const isCharmdate = tabs[0].url.includes('charmdate.com');

      if (accountBtn.classList.contains('login-btn')) {
        // ставим выбранный аккаунт текущим
        const clickedBtnId = Number(accountBtn.id);
        const { loginId, ladyId, loginName, agency, staff, pswd } = accounts[clickedBtnId];

        refs.loginsContainer.removeEventListener('click', onLoginBtnClick);
        const loginRes = await makeLogin(agency, staff, pswd);

        if (loginRes.url === 'http://www.charmdate.com/clagt/login.php') {
          refs.loginsContainer.addEventListener('click', onLoginBtnClick);
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

        updateCurrentWomanId(ladyId);

        chrome.storage.local.set({ savedAlbums: {} });
        await updateLettersMenu();

        await setSavedSelect();

        const pageToLoginLink = refs.pageSelect.selectedOptions[0].value;

        chrome.storage.local.set({ pageToLoginLink });

        refs.loginsContainer.addEventListener('click', onLoginBtnClick);
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
    refs.currentWomanId.forEach(woman => {
      woman.innerText = refs.ladyIdInput.value;
    });

    // очищаем все инпуты после добавления кнопки
    clearInputsAfterAdd();
    // обнуляем сохранённые альбомы медиа
    chrome.storage.local.set({ savedAlbums: {} });

    if (refs.loginsContainer.children.length > 0) {
      refs.noAccountsMessage.classList.add('no-accounts-hidden');
    }
  } catch (error) {
    console.log(error);
    console.log('Введены не актуальные данные, уточните правильность введённых паролей для входа');
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

// !-ОТПРАВКА ПИСЕМ-!

refs.menu.addEventListener('click', onMenuItemClick);

refs.lettersContainer.addEventListener('input', onLettersInput);

refs.sendLettersBtn.addEventListener('click', onSendLettersBtn);

refs.mediaContainer.addEventListener('click', onMediaPickerClick);

refs.letterTypes.addEventListener('change', onLetterTypeSwitch);

async function updateLettersMenu() {
  // обновить тип отправляемых писем
  await updateLettersTypeSwitcher();
  // доюавить сохранённую информацию в инпуты
  await populateLettersInputs();
  // показать сколько мужчин для отправки писем
  setAllMenQuantity();
  //показать альбомы для материалов выбранной девушки
  await renderAlbums();
  // показать выбранные альбомы с материалами
  await updateMediaPicker();
  //обновить счетчик сколько осталось отправить писем
  updateLeftToSendLettersCounter();
  // обновить конвертер айди
  updateConverter();
}

function onMenuItemClick(e) {
  if (e.target.classList.contains('menu') || e.target.classList.contains('menu-item')) {
    return;
  }

  [...refs.menu.children].forEach(item => {
    item.classList.remove('menu-current');
  });

  e.target.parentElement.classList.add('menu-current');

  if (e.target.classList.contains('menu-letters')) {
    refs.loginAddForm.classList.add('is-hidden');
    refs.lettersContainer.classList.remove('is-hidden');
    chrome.storage.local.set({ currentMenu: 'letters' });
  }

  if (e.target.classList.contains('menu-accounts')) {
    refs.loginAddForm.classList.remove('is-hidden');
    refs.lettersContainer.classList.add('is-hidden');
    chrome.storage.local.set({ currentMenu: 'accounts' });
  }

  refs.converterSection.classList.add('is-hidden');

  updateLettersMenu();
}

async function setCurrentMenu() {
  const { currentMenu } = await chrome.storage.local.get();

  if (!currentMenu) {
    return;
  }

  if (currentMenu === 'letters') {
    refs.loginAddForm.classList.add('is-hidden');
    refs.lettersContainer.classList.remove('is-hidden');
  }

  if (currentMenu === 'accounts') {
    refs.loginAddForm.classList.remove('is-hidden');
    refs.lettersContainer.classList.add('is-hidden');
  }

  [...refs.menu.children].forEach(item => {
    item.classList.remove('menu-current');

    if (item.children[0].classList.contains(`menu-${currentMenu}`)) {
      item.classList.add('menu-current');
    }
  });
}

function setAllMenQuantity() {
  const allMenIds = refs.menIds.value.trim().split(',');
  if (allMenIds.length === 1 && allMenIds[0] === '') {
    refs.allMenNumber.innerText = 0;
    return;
  }

  const menQuantity = allMenIds.length;
  refs.allMenNumber.innerText = menQuantity;
}

async function onLettersInput(e) {
  hideSendLettersStatuses();
  refs.lettersStatusInput.classList.remove('is-hidden');

  setAllMenQuantity();
  updateLeftToSendLettersCounter();

  saveLettersInputsInfo();
}

function saveLettersInputsInfo() {
  const lettersInputsInfo = {
    sentInput: refs.sentInput.value.trim(),
    notSentInput: refs.notSentInput.value.trim(),
    leftToSendInput: refs.leftToSendInput.value.trim(),
    menIds: refs.menIds.value.trim(),
    letterText: refs.letterText.value.trim(),
  };

  chrome.storage.local.set({ lettersInputsInfo });
}

async function populateLettersInputs() {
  try {
    const { lettersInputsInfo } = await chrome.storage.local.get();

    if (!lettersInputsInfo) {
      return;
    }

    refs.sentInput.value = lettersInputsInfo?.sentInput || '';
    refs.notSentInput.value = lettersInputsInfo?.notSentInput || '';
    refs.menIds.value = lettersInputsInfo?.menIds || '';
    refs.letterText.value = lettersInputsInfo?.letterText || '';
    refs.leftToSendInput.value = lettersInputsInfo?.leftToSendInput || '';
  } catch (error) {
    console.log(error);
  }
}

function onStopSendLettersBtn() {
  hideSendLettersStatuses();
  refs.lettersStatusStopped.classList.remove('is-hidden');

  showSendLettersButton();
  enableInteractionOnLetterSending();
}

function showSendLettersButton() {
  refs.sendLettersBtn.classList.remove('is-hidden');
  refs.stopSendLettersBtn.classList.add('is-hidden');

  refs.stopSendLettersBtn.removeEventListener('click', onStopSendLettersBtn);

  chrome.storage.local.set({ isLettersSendingOff: true });
}

async function onSendLettersBtn(e) {
  const manIdsList = refs.menIds.value.split(',');
  const letter = refs.letterText.value;

  if (manIdsList[0] === '') {
    refs.noManIdMessage.classList.remove('is-hidden');
    setTimeout(() => {
      refs.noManIdMessage.classList.add('is-hidden');
    }, 3000);
    return;
  }

  if (letter.length < 200) {
    refs.letterSizeMessage.classList.remove('is-hidden');
    setTimeout(() => {
      refs.letterSizeMessage.classList.add('is-hidden');
    }, 3000);
    return;
  }

  const { currentId } = await chrome.storage.local.get();

  if (!currentId) {
    return;
  }

  const { ladyId } = currentId;

  disableInteractionOnLetterSending();

  chrome.storage.local.set({ isLettersSendingOff: false });

  refs.sendLettersBtn.classList.toggle('is-hidden');
  refs.stopSendLettersBtn.classList.toggle('is-hidden');

  refs.stopSendLettersBtn.addEventListener('click', onStopSendLettersBtn);

  refs.lettersSentCounter.innerText = 0;
  refs.lettersNotSentCounter.innerText = 0;
  refs.lettersLeftToSendCounter.innerText = 0;

  refs.sentInput.value = '';
  refs.notSentInput.value = '';
  refs.leftToSendInput.value = refs.menIds.value;

  updateLeftToSendLettersCounter();

  saveLettersInputsInfo();

  hideSendLettersStatuses();
  refs.lettersStatusSending.classList.remove('is-hidden');

  const currentLadyId = ladyId;

  console.log(currentLadyId);
  console.log(manIdsList);
  console.log(letter);

  const gotLettersMenList = [];
  const didntGetLettersMenList = [];
  const waitingLettersMenList = [...manIdsList];

  for (let manId of manIdsList) {
    const { isLettersSendingOff } = await chrome.storage.local.get();

    if (isLettersSendingOff) {
      break;
    }

    const res = await sendLetter(manId, currentLadyId, letter);

    const manIdToRemove = waitingLettersMenList.indexOf(manId);
    waitingLettersMenList.splice(manIdToRemove, 1);
    refs.leftToSendInput.value = waitingLettersMenList.join(',');

    // !--от сюда
    console.log(res);

    if (res === 'man deleted profile') {
      didntGetLettersMenList.push(manId);
      refs.notSentInput.value = didntGetLettersMenList.join(',');

      updateLeftToSendLettersCounter();

      saveLettersInputsInfo();

      const menLeftToSend = calculateMenLeftToSend();

      if (!menLeftToSend) {
        onLettersSendingFinish();
        break;
      }
      continue;
    }

    if (
      res.url === 'http://www.charmdate.com/clagt/emf_error.php' ||
      res.url === 'http://www.charmdate.com/clagt/cupidnote/error_msg.php'
    ) {
      console.error(
        `Что-то пошло не так, возможно мужчина ${manId} удалил свой профиль или мужчине уже было недавно отправлено письмо`
      );
      updateNotSentLettersCounter();
      didntGetLettersMenList.push(manId);
      refs.notSentInput.value = didntGetLettersMenList.join(',');

      updateLeftToSendLettersCounter();

      saveLettersInputsInfo();

      const menLeftToSend = calculateMenLeftToSend();

      if (!menLeftToSend) {
        onLettersSendingFinish();
        break;
      }
      continue;
    }

    // !--до сюда

    updateSentLettersCounter();
    gotLettersMenList.push(manId);
    refs.sentInput.value = gotLettersMenList.join(',');

    updateLeftToSendLettersCounter();

    saveLettersInputsInfo();

    const menLeftToSend = calculateMenLeftToSend();

    if (!menLeftToSend) {
      onLettersSendingFinish();
      break;
    }
  }
}

function calculateMenLeftToSend() {
  const allMenQuantity = Number(refs.allMenNumber.innerText);
  const sentMenQuantity = Number(refs.lettersSentCounter.innerText);
  const notSentMenQuantity = Number(refs.lettersNotSentCounter.innerText);
  const menLeftToSend = allMenQuantity - sentMenQuantity - notSentMenQuantity;

  return menLeftToSend;
}

async function sendLetter(originalManId, currentLadyId, originalLetter) {
  const { currentLettersType = 'EMF' } = await chrome.storage.local.get();
  let manId = null;

  if (currentLettersType === 'EMF') {
    manId = originalManId.split('_')[0];
  } else if (currentLettersType === 'SayHi') {
    manId = originalManId.split('-')[0];
  }

  const manInfo = await getManInfoById(manId);

  if (!manInfo) {
    console.error(`Что-то пошло не так, возможно мужчина ${manId} удалил свой профиль`);
    updateLeftToSendLettersCounter();
    return 'man deleted profile';
  }

  let { manName, manLiving } = manInfo;

  const availableFreePhotos = await getFreePhotosByLadyId(currentLadyId);
  const availablePaidPhotos = await getPaidPhotosByManId(manId, currentLadyId);
  const availableVideos = await getVideosByManId(manId, currentLadyId);

  const randomFreePhoto = availableFreePhotos[getRandomNumber(0, availableFreePhotos.length - 1)];
  const randomFirstPaidPhoto = availablePaidPhotos[0];
  const randomSecondPaidPhoto = availablePaidPhotos[1];
  const randomThirdPaidPhoto = availablePaidPhotos[2];
  const randomVideo = availableVideos[getRandomNumber(0, availableVideos.length - 1)];

  const freePhotoName = !randomFreePhoto
    ? ''
    : randomFreePhoto.padEnd(randomFreePhoto.length + 1, '|');
  const firstPaidPhotoName = !randomFirstPaidPhoto
    ? ''
    : randomFirstPaidPhoto.padEnd(randomFirstPaidPhoto.length + 1, '|');
  const secondPaidPhotoName = !randomSecondPaidPhoto
    ? ''
    : randomSecondPaidPhoto.padEnd(randomSecondPaidPhoto.length + 1, '|');
  const thirdPaidPhotoName = !randomThirdPaidPhoto
    ? ''
    : randomThirdPaidPhoto.padEnd(randomThirdPaidPhoto.length + 1, '|');
  const videoName = !randomVideo ? '' : randomVideo.padEnd(randomVideo.length + 1, '|');

  if (originalManId.split('_')[1]) {
    manName = originalManId.split('_')[1];
  }

  const firstCapitalLetter = manName.split('')[0].toUpperCase();
  const slicedName = manName.slice(1, manName.length).toLowerCase();

  manName = firstCapitalLetter + slicedName;

  let letter = originalLetter;

  if (!manLiving || manLiving === '') {
    letter = originalLetter.replaceAll('{name}', manName);
  } else {
    letter = originalLetter.replaceAll('{name}', manName).replaceAll('{living}', manLiving);
  }

  let sendLetterInfo = {};

  if (freePhotoName === '') {
    sendLetterInfo = {
      currentLadyId,
      manId,
      letter,
      freePhotoName,
      firstPaidPhotoName: '',
      secondPaidPhotoName: '',
      thirdPaidPhotoName: '',
      videoName: '',
      originalManId,
    };
  } else {
    sendLetterInfo = {
      currentLadyId,
      manId,
      letter,
      freePhotoName,
      firstPaidPhotoName,
      secondPaidPhotoName,
      thirdPaidPhotoName,
      videoName,
      originalManId,
    };
  }

  console.log(sendLetterInfo);

  if (currentLettersType === 'EMF') {
    return await makeSendLetterRequest(sendLetterInfo);
  } else if (currentLettersType === 'SayHi') {
    return await makeSendSayHiRequest(sendLetterInfo);
  }
}

async function makeSendLetterRequest({
  currentLadyId,
  manId,
  letter,
  freePhotoName,
  firstPaidPhotoName,
  secondPaidPhotoName,
  thirdPaidPhotoName,
  videoName,
}) {
  const queryParams = new URLSearchParams({
    body: letter,
    attachfilephoto: `${freePhotoName}`,
    private_attachfilephoto: `${firstPaidPhotoName}${secondPaidPhotoName}${thirdPaidPhotoName}`,
    short_video_attachfilephoto: `${videoName}`,
    select_vg_id: '',
    agreeLaw: 'Y',
    womanid: `${currentLadyId}`,
    manid: `${manId}`,
    reply_id: '',
    reply_id2: '',
    reply_flag: '',
    lady_tel: '+380662335824',
    checkcomment: 'Y',
    rmethod: '1',
    sendtimes: '0',
    submit_emf_restrictions_action: '',
  }).toString();

  const BASE_LETTERS_URL = 'http://www.charmdate.com/clagt/emf_sender5.php';
  const SEND_LETTER_URL = `${BASE_LETTERS_URL}?${queryParams}`;

  return fetch(SEND_LETTER_URL);
}

async function makeSendSayHiRequest({ originalManId, letter, freePhotoName }) {
  const queryParams = new URLSearchParams({
    noteid: `${originalManId}`,
    replymsg: letter,
    attachfilephoto: `${freePhotoName}`,
  }).toString();

  const BASE_SAY_HI_URL = 'http://www.charmdate.com/clagt/cupidnote/reply3.php';

  const options = {
    method: 'POST',
    body: queryParams,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  return fetch(BASE_SAY_HI_URL, options);
}

async function getFreePhotosByLadyId(currentLadyId) {
  const {
    savedAlbums: { freeAlbums = [] },
  } = await chrome.storage.local.get();

  if (freeAlbums.length === 0) {
    return [];
  }

  const freePhotos = await fetch(
    `http://www.charmdate.com/clagt/get-images.php?action=images&womanid=${currentLadyId}`
  ).then(r => r.json());

  return filterMedia(freeAlbums, freePhotos);
}

async function getPaidPhotosByManId(manId, currentLadyId) {
  const {
    savedAlbums: { paidAlbums = [] },
  } = await chrome.storage.local.get();

  if (paidAlbums.length === 0) {
    return [];
  }

  const paidPhotos = await fetch(
    `http://www.charmdate.com/clagt/get-private-images.php?action=images&womanid=${currentLadyId}&manid=${manId}&_dc=`
  ).then(r => r.json());

  const filteredPhotos = await filterMedia(paidAlbums, paidPhotos);
  const shuffledPhotos = shuffle(filteredPhotos).slice(0, 3);

  return shuffledPhotos;
}

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
  return array;
}

async function getVideosByManId(manId, currentLadyId) {
  const {
    savedAlbums: { videosAlbums = [] },
  } = await chrome.storage.local.get();

  if (videosAlbums.length === 0) {
    return [];
  }

  const videos = await fetch(
    `http://www.charmdate.com/clagt/get-short-video.php?action=images&womanid=${currentLadyId}&manid=${manId}&_dc=`
  ).then(r => r.json());

  return filterMedia(videosAlbums, videos);
}

async function filterMedia(albumsIds, media) {
  const filteredMedia = albumsIds.reduce((acc, albumId) => {
    const matchMedia = media.images.filter(mediaItem => mediaItem.albumid === albumId);
    acc.push(...matchMedia);
    return acc;
  }, []);

  const mediaNames = filteredMedia.map(photo => photo.name);

  return mediaNames;
}

async function getManInfoById(manId) {
  const options = {
    method: 'POST',
    body: `manid=${manId}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const url = 'http://www.charmdate.com/clagt/lovecall/get_info.php?act=getmaninfo';

  return fetch(url, options)
    .then(r => r.text())
    .then(r => {
      const dirtyName = r.split('firstname')[1];
      const manName = dirtyName.slice(1, dirtyName.length - 2);
      const dirtyLiving = r.split('living')[1];
      const manLiving = dirtyLiving.slice(1, dirtyLiving.length - 2);

      return { manName, manLiving };
    })
    .catch(e => {
      updateNotSentLettersCounter();
    });
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateSentLettersCounter() {
  let counter = Number(refs.lettersSentCounter.innerText);
  counter += 1;
  refs.lettersSentCounter.innerText = counter;
}

function updateNotSentLettersCounter() {
  let counter = Number(refs.lettersNotSentCounter.innerText);
  counter += 1;
  refs.lettersNotSentCounter.innerText = counter;
}

function updateLeftToSendLettersCounter() {
  const menWaitingForLetter = refs.leftToSendInput.value.split(',');

  if (menWaitingForLetter[0] === '') {
    refs.lettersLeftToSendCounter.innerText = 0;
    return;
  }

  refs.lettersLeftToSendCounter.innerText = menWaitingForLetter.length;
}

function hideSendLettersStatuses() {
  [...refs.lettersStatuses.children].forEach(sendStatus => {
    sendStatus.classList.add('is-hidden');
  });
}

function onLettersSendingFinish() {
  hideSendLettersStatuses();
  refs.lettersStatusFinished.classList.remove('is-hidden');

  showSendLettersButton();
  enableInteractionOnLetterSending();
}

async function renderAlbums() {
  const { currentId, savedAlbums } = await chrome.storage.local.get();

  if (!currentId) {
    return;
  }

  const { freeAlbums = [] } = savedAlbums;
  const { ladyId: currentLadyId } = currentId;

  const freeAlbumsMarkup = await makeFreeAlbumsMarkup(currentLadyId);
  const paidAlbumsMarkup = await makePaidAlbumsMarkup(currentLadyId);
  const videosAlbumsMarkup = await makeVideoAlbumsMarkup(currentLadyId);

  refs.freePhotosMediaList.innerHTML = freeAlbumsMarkup;
  refs.paidPhotosMediaList.innerHTML = paidAlbumsMarkup;
  refs.videosMediaList.innerHTML = videosAlbumsMarkup;

  if (freeAlbums.length === 0) {
    const checkboxFreeEl = document.querySelectorAll('input.checkbox-free');

    if (!checkboxFreeEl[0]) {
      return;
    }

    checkboxFreeEl[0].click();
  }
}

async function makeFreeAlbumsMarkup(currentLadyId) {
  const freeAlbums = await getAllFreeAlbums(currentLadyId);

  return freeAlbums.thumb.reduce((acc, { albumid, name, num }) => {
    const markup = `<div class="media-item">
                      <label class="media-custom-checkbox" for="${albumid}"
                        ><input type="checkbox" id="${albumid}" class="media-original-checkbox checkbox-free"/><span
                          >${name} <span>(${num})</span></span
                        ></label
                      >
                    </div>`;

    return (acc += markup);
  }, '');
}

async function makePaidAlbumsMarkup(currentLadyId) {
  const paidAlbums = await getAllPaidAlbums(currentLadyId);

  return paidAlbums.thumb.reduce((acc, { albumid, name, num }) => {
    const markup = `<div class="media-item">
                      <label class="media-custom-checkbox" for="${albumid}"
                        ><input type="checkbox" id="${albumid}" class="media-original-checkbox checkbox-paid"/><span
                          >${name} <span>(${num})</span></span
                        ></label
                      >
                    </div>`;

    return (acc += markup);
  }, '');
}

async function makeVideoAlbumsMarkup(currentLadyId) {
  const videosAlbums = await getAllVideoAlbums(currentLadyId);

  return videosAlbums.thumb.reduce((acc, { albumid, name, num }) => {
    const markup = `<div class="media-item">
                      <label class="media-custom-checkbox" for="${albumid}"
                        ><input type="checkbox" id="${albumid}" class="media-original-checkbox checkbox-video"/><span
                          >${name} <span>(${num})</span></span
                        ></label
                      >
                    </div>`;

    return (acc += markup);
  }, '');
}

async function getAllVideoAlbums(currentLadyId) {
  return await fetch(
    `http://www.charmdate.com/clagt/get-short-video.php?womanid=${currentLadyId}&action=thumb`
  ).then(r => r.json());
}

async function getAllPaidAlbums(currentLadyId) {
  return await fetch(
    `http://www.charmdate.com/clagt/get-private-images.php?womanid=${currentLadyId}&action=thumb`
  ).then(r => r.json());
}

async function getAllFreeAlbums(currentLadyId) {
  return await fetch(
    `http://www.charmdate.com/clagt/get-images.php?womanid=${currentLadyId}&action=thumb`
  ).then(r => r.json());
}

async function onMediaPickerClick(e) {
  if (!e.target.classList.contains('media-original-checkbox')) {
    return;
  }

  const mediaType = e.target.parentElement.parentElement.parentElement;

  const { savedAlbums = {} } = await chrome.storage.local.get();

  let albumsToUpdate = {};

  if (mediaType.classList.contains('free-photo-list')) {
    let { freeAlbums = [] } = savedAlbums;

    const freeAlbumsSet = new Set(freeAlbums);

    if (e.target.checked) {
      freeAlbumsSet.add(e.target.id);
    }

    if (!e.target.checked) {
      freeAlbumsSet.delete(e.target.id);
    }

    freeAlbums = [...freeAlbumsSet];

    albumsToUpdate = {
      ...savedAlbums,
      freeAlbums,
    };
  }

  if (mediaType.classList.contains('paid-photo-list')) {
    let paidAlbums = savedAlbums?.paidAlbums || [];

    const paidAlbumsSet = new Set(paidAlbums);

    if (e.target.checked) {
      paidAlbumsSet.add(e.target.id);
    }

    if (!e.target.checked) {
      paidAlbumsSet.delete(e.target.id);
    }

    paidAlbums = [...paidAlbumsSet];

    albumsToUpdate = {
      ...savedAlbums,
      paidAlbums,
    };
  }

  if (mediaType.classList.contains('videos-list')) {
    let videosAlbums = savedAlbums?.videosAlbums || [];

    const videosAlbumsSet = new Set(videosAlbums);

    if (e.target.checked) {
      videosAlbumsSet.add(e.target.id);
    }

    if (!e.target.checked) {
      videosAlbumsSet.delete(e.target.id);
    }

    videosAlbums = [...videosAlbumsSet];

    albumsToUpdate = {
      ...savedAlbums,
      videosAlbums,
    };
  }

  chrome.storage.local.set({ savedAlbums: albumsToUpdate });
}

async function updateMediaPicker() {
  const { savedAlbums } = await chrome.storage.local.get();
  const checkboxFreeEl = document.querySelectorAll('input.checkbox-free');
  const checkboxPaidEl = document.querySelectorAll('.checkbox-paid');
  const checkboxVideoEl = document.querySelectorAll('.checkbox-video');

  checkboxFreeEl.forEach(el => {
    if (!savedAlbums?.freeAlbums) {
      return;
    }
    savedAlbums?.freeAlbums.forEach(id => {
      if (el.id === id) {
        el.checked = true;
      }
    });
  });

  checkboxPaidEl.forEach(el => {
    if (!savedAlbums?.paidAlbums) {
      return;
    }
    savedAlbums?.paidAlbums.forEach(id => {
      if (el.id === id) {
        el.checked = true;
      }
    });
  });

  checkboxVideoEl.forEach(el => {
    if (!savedAlbums?.videosAlbums) {
      return;
    }
    savedAlbums?.videosAlbums.forEach(id => {
      if (el.id === id) {
        el.checked = true;
      }
    });
  });
}

function updateCurrentWomanId(womanId) {
  refs.currentWomanId.forEach(woman => {
    woman.innerText = womanId;
  });
}

function disableInteractionOnLetterSending() {
  refs.menIds.disabled = true;
  refs.letterText.disabled = true;
  refs.letterTypeEMF.disabled = true;
  refs.letterTypeSayHi.disabled = true;

  refs.loginsContainer.classList.add('is-hidden');
  refs.mediaContainer.classList.add('disabled');
}

function enableInteractionOnLetterSending() {
  refs.menIds.disabled = false;
  refs.letterText.disabled = false;
  refs.letterTypeEMF.disabled = false;
  refs.letterTypeSayHi.disabled = false;

  refs.loginsContainer.classList.remove('is-hidden');
  refs.mediaContainer.classList.remove('disabled');
}

function onLetterTypeSwitch(e) {
  chrome.storage.local.set({
    currentLettersType: e.target.value,
  });

  refs.sendLettersBtn.dataset.action = e.target.value;

  if (e.target.value === 'EMF') {
    refs.menIds.placeholder = 'CM55826251,CM17388307_Derek,CM90827940';
  }

  if (e.target.value === 'SayHi') {
    refs.menIds.placeholder =
      'CM67229642-2306020653689,CM48050480-2305311789139,CM99658238-2305310392811';
  }
}

async function updateLettersTypeSwitcher() {
  const { currentLettersType = 'EMF' } = await chrome.storage.local.get();

  refs.sendLettersBtn.dataset.action = currentLettersType;

  if (currentLettersType === 'EMF') {
    refs.letterTypeEMF.checked = true;
    refs.menIds.placeholder = 'CM55826251,CM17388307_Derek,CM90827940';
  }

  if (currentLettersType === 'SayHi') {
    refs.letterTypeSayHi.checked = true;
    refs.menIds.placeholder =
      'CM67229642-2306020653689,CM48050480-2305311789139,CM99658238-2305310392811';
  }
}

// !--- ID converter

refs.converterOpen.addEventListener('click', onConverterShow);
refs.converterBack.addEventListener('click', onConverterReturn);
refs.converterTypes.addEventListener('change', onConverterTypeChange);
refs.converterBtn.addEventListener('click', onConverterBtnClick);
refs.converterInput.addEventListener('input', onConverterIdsInput);

function onConverterShow() {
  refs.converterSection.classList.remove('is-hidden');
  refs.lettersContainer.classList.add('is-hidden');
}

function onConverterReturn() {
  refs.converterSection.classList.add('is-hidden');
  refs.lettersContainer.classList.remove('is-hidden');
}

function onConverterTypeChange(e) {
  const type = e.target.id;

  refs.converterBtn.dataset.action = type;

  chrome.storage.local.set({ converterType: type });

  if (type === 'converter-first')
    refs.converterInput.placeholder =
      'Пример:\nCM99754408(Axel)\nCM763054(atypique)\nCM88775226(Jostein)\nCM26836230(Matthew)\nCM95519223(Tommy)\n';

  if (type === 'converter-norecent')
    refs.converterInput.placeholder =
      'Пример:\nCM49101549 ( Zbynek )\nCM68500997 ( Adil )\nCM10213781 ( John )\nCM88740052 ( JOHN )\nCM48212021 ( John )\n';

  if (type === 'converter-incoming')
    refs.converterInput.placeholder =
      'Пример:\n  Tony CM40844922 -- Yana C130360\n  Paul CM90761760 -- Yana C130360\n  Patrick CM18471299 -- Yana C130360\n  Dale CM99445614 -- Yana C130360 With attachment\n  Kurt CM10580664 -- Yana C130360\n';

  if (type === 'converter-sayhi')
    refs.converterInput.placeholder =
      'Пример:\nCM48050480-2305311789139\nCM99658238-2305310392811\nCM72975675-2305310118770\nCM58287039-2305300797883\nCM53355441-2305290255525\n';

  if (type === 'converter-google')
    refs.converterInput.placeholder =
      'Пример:\nCM17556467\nCM82962910\nCM52460740\nCM88678016\nCM99483657\n';
}

function onConverterBtnClick(e) {
  const type = e.target.dataset.action;
  const idsToConvert = refs.converterInput.value.trim().split('\n');

  const convertedIds = idsToConvert.map(id => {
    if (type === 'converter-first') return id.trim().split('(')[0].trim();
    if (type === 'converter-norecent') return id.trim().split(' ')[0].trim();
    if (type === 'converter-incoming') return id.trim().split(' ')[1].trim();
    if (type === 'converter-sayhi' || type === 'converter-google') return id.trim();
  });
  const filteredIds = new Set(convertedIds);

  refs.converterOutput.value = [...filteredIds].join(',');

  refs.converterInput.value = '';
  chrome.storage.local.set({ converterInput: '' });
}

function onConverterIdsInput(e) {
  chrome.storage.local.set({ converterInput: e.target.value });
}

async function updateConverter() {
  const { converterInput = '', converterType = 'converter-first' } =
    await chrome.storage.local.get();

  refs.converterInput.value = converterInput;
  refs.converterBtn.dataset.action = converterType;

  [...refs.converterTypes.children].forEach(type => {
    const typeOption = type.children[0];
    if (typeOption.id === converterType) {
      typeOption.checked = true;
    }
  });

  if (converterType === 'converter-first')
    refs.converterInput.placeholder =
      'Пример:\nCM99754408(Axel)\nCM763054(atypique)\nCM88775226(Jostein)\nCM26836230(Matthew)\nCM95519223(Tommy)\n';

  if (converterType === 'converter-norecent')
    refs.converterInput.placeholder =
      'Пример:\nCM49101549 ( Zbynek )\nCM68500997 ( Adil )\nCM10213781 ( John )\nCM88740052 ( JOHN )\nCM48212021 ( John )\n';

  if (converterType === 'converter-incoming')
    refs.converterInput.placeholder =
      'Пример:\n  Tony CM40844922 -- Yana C130360\n  Paul CM90761760 -- Yana C130360\n  Patrick CM18471299 -- Yana C130360\n  Dale CM99445614 -- Yana C130360 With attachment\n  Kurt CM10580664 -- Yana C130360\n';

  if (converterType === 'converter-sayhi')
    refs.converterInput.placeholder =
      'Пример:\nCM48050480-2305311789139\nCM99658238-2305310392811\nCM72975675-2305310118770\nCM58287039-2305300797883\nCM53355441-2305290255525\n';

  if (converterType === 'converter-google')
    refs.converterInput.placeholder =
      'Пример:\nCM17556467\nCM82962910\nCM52460740\nCM88678016\nCM99483657\n';
}

function clearAllMediaData() {
  refs.freePhotosMediaList.innerHTML = '';
  refs.paidPhotosMediaList.innerHTML = '';
  refs.videosMediaList.innerHTML = '';

  chrome.storage.local.set({ savedAlbums: {} });
}
