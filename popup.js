const urls = {
  loginPageUrl: 'http://www.charmdate.com/clagt/loginb.htm',
  ladyPageOnLoadPath: '/clagt/woman/women_profiles_allow_edit.php',
  overviewPageUrl: 'http://www.charmdate.com/clagt/overview.php?menu1=1',
  activeChatUrl: 'http://www.charmdate.com/clagt/livechat/index.php?action=live',
};

const refs = {
  switchButton: document.getElementById('switchButton'),
  loginNameInput: document.getElementById('login-name'),
  ladyIdInput: document.getElementById('lady-id'),
  agencyInput: document.getElementById('agency-id'),
  staffInput: document.getElementById('staff-id'),
  pswdInput: document.getElementById('pswd-id'),
  addBtn: document.querySelector('button.addButton'),
  loginsContainer: document.querySelector('.logins-container'),
  errorText: document.querySelector('.empty-fields-error'),
  authError: document.querySelector('.auth-error'),
  noAccountsMessage: document.querySelector('.no-accounts-message'),
  loginAddForm: document.querySelector('.add-pswd-container'),
  pageSelect: document.querySelector('.page-select'),
  ladySelectGroup: document.querySelector('.lady-group'),
  currentWomanId: document.querySelector('.woman-id'),
};

// 90 days (in ms)
const EMF_SEARCH_DAYS_DIFFERENCE = 7776000000;

const port = chrome.runtime.connect({ name: 'exchangeData' });

// проверяем состояние переключателя
setSwitcherState();

// проверяем выбранный селект
setSavedSelect();
// заполняем инпуты если что-то было введено
populateInputs();
// рисуем кнопки по открытию расширения
renderLoginBtns();

// Сохраняем состояние переключателя
refs.switchButton.addEventListener('click', onReloginSwitcherClick);

// Сохраняем вводимые данные в хранилище
refs.loginAddForm.addEventListener('input', onFormInput);

// сохраняем выбранную страницу куда делать логин
refs.pageSelect.addEventListener('change', onSelectChange);

// добавляем новую кнопку логина
refs.addBtn.addEventListener('click', onAddBtnClick);

// удалить или перезайти в выбранный аккаунт
refs.loginsContainer.addEventListener('click', onLoginBtnClick);

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

// рисуем селекты с ссылками с леди айди
async function renderLadyPagesSelects() {
  const {
    currentId: { ladyId },
  } = await chrome.storage.local.get();

  const res = await chrome.storage.local.get();
  console.log(res);

  const ladySelectMarkup = createPagesLadyOptionsMarkup(ladyId);

  refs.ladySelectGroup.innerHTML = ladySelectMarkup;
}

// проверяем выбранный селект
async function setSavedSelect() {
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

  chrome.storage.local.set({ pageToLogin });
}

// удалить или перезайти в выбранный аккаунт
async function onLoginBtnClick(e) {
  try {
    const logins = await chrome.storage.local.get('savedLogins');
    const accounts = [...logins.savedLogins];

    // удалить выбранный аккаунт
    if (e.target.classList.contains('login-delete')) {
      deleteAccount(e.target, accounts);
    }

    // перезайти в выбранный аккаунт
    loginToAccount(e.target, accounts);
  } catch (error) {
    console.log(error);
  }
}

// удалить выбранный аккаунт
function deleteAccount(accountBtn, accounts) {
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

    return;
  }

  // если есть добавленные аккаунты, то текущим становится первый в списке кнопок
  const firstAccountId = Number(refs.loginsContainer.firstElementChild.id);
  addCurrentBtnClass(firstAccountId);
  chrome.storage.local.set({ currentId: accounts[firstAccountId] });
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

        const pageToLogin = refs.pageSelect.selectedOptions[0].value;
        // перезаходим под выбранным аккаунтом
        if (isCharmdate) {
          port.postMessage({ method: 'goTo', url: pageToLogin });
        } else {
          port.postMessage({ method: 'openTab', url: pageToLogin });
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

    // сохраняем кнопку в хранилище
    const { savedLogins = [], id = 0 } = await chrome.storage.local.get();
    const accountToAdd = {
      loginId: id,
      ladyId: refs.ladyIdInput.value,
      loginName: refs.loginNameInput.value,
      agency: refs.agencyInput.value,
      staff: refs.staffInput.value,
      pswd: refs.pswdInput.value,
    };

    savedLogins.push(accountToAdd);

    // обновляем данные в хранилище
    chrome.storage.local.set({
      id: id + 1,
      currentId: accountToAdd,
      savedLogins,
    });

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
  }
}

// добавляем и рисуем кнопку в списке выбора логинов
function addAdmLoginButton(id, btnName) {
  const btnMarkup = `<div class="login-btn current-login" id="${id}">
          ${btnName}
          <button type="button" class="login-delete">&#215;</button>
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
                Фёсты (ещё можно)
              </option>
							<option name="videoshowlady" value="http://www.charmdate.com/clagt/videoshow/access_key_request_new.php?groupshow=4&searchManId=&searchWomanId=${ladyId}&date1=&date2=&agtstaff=&Submit=Search">
                Видеошоу входящие
              </option>
	`;
}

function createPagesOptionsMarkup() {
  const { currentDay, currentMonth, currentYear, startDay, startMonth, startYear } =
    getCalculatedTime();

  // сюда разметку пропущеных с изменёнными датами
}
