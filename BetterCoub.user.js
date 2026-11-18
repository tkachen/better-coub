// ==UserScript==
// @name            BetterCoub
// @name:ru         BetterCoub
// @namespace       https://github.com/tkachen/better-coub
// @version         0.4.1
// @description     Adds blacklists for users and tags, adds copy tag button on Coub.com
// @description:ru  Добавляет черные списки для пользователей и тегов, добавляет кнопку для копирования тега на Coub.com
// @author          tkachen
// @match           https://coub.com/*
// @homepageURL     https://github.com/tkachen/better-coub
// @downloadURL     https://github.com/tkachen/better-coub/raw/master/BetterCoub.user.js
// @require         https://raw.githubusercontent.com/uzairfarooq/arrive/master/minified/arrive.min.js
// @grant           none
// ==/UserScript==

(function() {
  'use strict';

  // ===========================================================================
  // Config
  // ===========================================================================

  const blockedTagsField = 'bc_tag_blacklist';
  const blockedUsersField = 'bc_user_blacklist';

  // Site markup
  const coubClass = 'coub';
  const coubPromoClass = 'coub--promoted';
  const tagClass = 'coub__tags-tag';
  const coubTitleClass = 'coub-description__about';
  const userClass = 'coub-description__about__user';
  const coubPlayerButton = 'viewer__click';
  const headerButtonsSlot = '.header-channel__notify-badge';
  const siteSkinSelector = '.coub-skin';
  const tagHrefPrefix = '/tags/';

  // Our markup
  // Data attribute (not a class): the site's framework may overwrite the class attribute
  const hiddenCoubSelector = '[data-bc-hiding]';
  const tagActionsClass = 'tagActions';
  const tagBtnClass = 'tagBtn';
  const blockTagBtnClass = 'blockTagBtn';
  const copyTagBtnClass = 'copyTagBtn';
  const blockUserBtnClass = 'blockUserBtn';
  const headerBtnClass = 'bc-header-btn';
  const overlayClass = 'bc-overlay';

  // Timings (ms)
  const WATCH_INTERVAL_MS = 500;
  const PAUSE_LOCK_MS = 500;
  const OBJECT_URL_LIFETIME_MS = 1000;

  const strings = {
    ru: {
      copyTagTooltip: 'Копировать тег в буфер обмена',
      blockTagTooltip: 'Добавить тег в черный список',
      blockUserTooltip: 'Добавить пользователя в черный список',
      manage: 'Черные списки BetterCoub',
      tags: 'Теги',
      users: 'Пользователи',
      remove: 'Удалить из списка',
      empty: 'Список пуст',
      exportBtn: 'Экспорт',
      importBtn: 'Импорт',
      exportTooltip: 'Экспортировать оба списка (теги и пользователи) в один файл',
      importTooltip: 'Импортировать оба списка (теги и пользователи) из файла и добавить к текущим',
      close: 'Закрыть',
      filterPlaceholder: 'Фильтр...',
      importDone: 'Импорт завершён. Добавлено тегов: {t}, пользователей: {u}',
      importError: 'Не удалось прочитать файл',
      reloadHint: 'Изменения применятся к ленте после перезагрузки страницы',
    },
    en: {
      copyTagTooltip: 'Copy tag to clipboard',
      blockTagTooltip: 'Add tag to blacklist',
      blockUserTooltip: 'Add user to blacklist',
      manage: 'BetterCoub blacklists',
      tags: 'Tags',
      users: 'Users',
      remove: 'Remove from list',
      empty: 'List is empty',
      exportBtn: 'Export',
      importBtn: 'Import',
      exportTooltip: 'Export both lists (tags and users) to one file',
      importTooltip: 'Import both lists (tags and users) from a file and merge them with the current ones',
      close: 'Close',
      filterPlaceholder: 'Filter...',
      importDone: 'Import done. Tags added: {t}, users added: {u}',
      importError: 'Failed to read file',
      reloadHint: 'Changes will apply to the feed after page reload',
    },
  };

  const lang = (document.documentElement.lang || 'en').slice(0, 2);
  const T = () => strings[lang] || strings.en;

  // ===========================================================================
  // Icons
  // ===========================================================================

  const listSvgIcon = `
    <svg width="24" height="24" viewBox="0 0 1000 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M648 983q-91 0-169-46-76-44-121-120-46-79-46-170t46-169q45-76 121-120 78-46 169-46t169 46q76 44 121 120 46 78 46 169t-46 170q-45 76-121 120-78 46-169 46zM515 847q60 41 133 41 65 0 120.5-32.5T856 768t32-121q1-72-40-132zm133-440q-65 0-120.5 32.5T440 527t-32 120q-1 73 40 133l333-333q-60-40-133-40zM47 43h553q10 0 16.5 7t6.5 16v29q0 9-6.5 16t-16.5 7H47q-10 0-17-7t-7-16V66q0-9 7-16t17-7zm0 139h553q10 0 16.5 7t6.5 17v28q0 10-6.5 16.5T600 257H47q-10 0-17-6.5T23 234v-28q0-10 7-17t17-7zm0 140h246q10 0 16.5 6.5T316 345v28q0 10-6.5 17t-16.5 7H47q-10 0-17-7t-7-17v-28q0-10 7-16.5t17-6.5zm0 139h153q10 0 16.5 7t6.5 16v29q0 9-6.5 16t-16.5 7H47q-10 0-17-7t-7-16v-29q0-9 7-16t17-7z"/>
    </svg>
  `;

  const blockSvgIcon = `
    <svg width="24" height="24" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.75827 17.2426L12.0009 12M17.2435 6.75736L12.0009 12M12.0009 12L6.75827 6.75736M12.0009 12L17.2435 17.2426" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  const copySvgIcon = `
    <svg width="24" height="24" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.4 20H9.6C9.26863 20 9 19.7314 9 19.4V9.6C9 9.26863 9.26863 9 9.6 9H19.4C19.7314 9 20 9.26863 20 9.6V19.4C20 19.7314 19.7314 20 19.4 20Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 9V4.6C15 4.26863 14.7314 4 14.4 4H4.6C4.26863 4 4 4.26863 4 4.6V14.4C4 14.7314 4.26863 15 4.6 15H9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // ===========================================================================
  // Styles
  // ===========================================================================

  const customStyles = `
    ${hiddenCoubSelector} {
      display: none !important;
    }

    .${tagClass} {
      min-width: 90px;
      position: relative;
    }

    .${tagActionsClass} {
      display: none;
      position: absolute;
      right: 0;
      top: 0;
      flex-direction: row;
      height: inherit;
      background: inherit;
      border-radius: inherit;
    }

    .${blockUserBtnClass},
    .${tagBtnClass} {
      display: flex;
      justify-content: center;
      align-items: center;
      height: inherit;
      aspect-ratio: 1;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--coub-neutral, #767676);
      cursor: pointer;
      border-radius: 50%;
    }

    .${blockUserBtnClass} {
      display: none;
    }

    .${coubTitleClass}:hover .${blockUserBtnClass},
    .${tagClass}:hover .${tagActionsClass} {
      display: flex;
    }

    .${tagBtnClass}:hover {
      color: #fff;
    }

    .${copyTagBtnClass}:hover {
      background: var(--coub-blue, #0332FF);
    }

    .${blockUserBtnClass}:hover,
    .${blockTagBtnClass}:hover {
      background: var(--coub-alert, #E81010);
    }
  `;

  const managerStyles = `
    /* "html button" raises specificity above the site's ".coub-skin button" reset */
    html button.${headerBtnClass} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 32px;
      height: 32px;
      margin-right: 20px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--coub-neutral, #767676);
      cursor: pointer;
      transition: color .1s;
    }

    html button.${headerBtnClass}:hover {
      color: var(--coub-blue, #0332FF);
    }

    .${headerBtnClass} svg {
      width: 24px;
      height: 24px;
    }

    .${overlayClass} {
      --bc-bg: var(--coub-primary, #FFFFFF);
      --bc-fg: var(--coub-secondary, #000000);
      --bc-muted: var(--coub-hover-primary, #F0F0F0);
      --bc-border: var(--coub-1-primary, #CCCCCC);
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, .6);
    }

    .bc-modal {
      display: flex;
      flex-direction: column;
      width: min(560px, 94vw);
      max-height: 85vh;
      border: 1px solid var(--bc-border);
      border-radius: 8px;
      background: var(--bc-bg);
      color: var(--bc-fg);
      font-size: 14px;
    }

    .bc-head,
    .bc-foot {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
    }

    .bc-head {
      justify-content: space-between;
      border-bottom: 1px solid var(--bc-border);
      font-size: 16px;
      font-weight: bold;
    }

    .bc-foot {
      border-top: 1px solid var(--bc-border);
    }

    .bc-foot small {
      margin-left: auto;
      opacity: .6;
      text-align: right;
    }

    .bc-tabs {
      display: flex;
      gap: 4px;
      padding: 8px 16px 0;
    }

    .${overlayClass} .bc-tab,
    .${overlayClass} .bc-btn {
      padding: 6px 12px;
      border: 1px solid var(--bc-border);
      border-radius: 6px;
      background: var(--bc-muted);
      color: var(--bc-fg);
      cursor: pointer;
    }

    .${overlayClass} .bc-tab.bc-active {
      border-color: transparent;
      background: var(--coub-blue, #0332FF);
      color: #fff;
    }

    .bc-filter {
      margin: 8px 16px 0;
      padding: 6px 10px;
      border: 1px solid var(--bc-border);
      border-radius: 6px;
      background: var(--bc-muted);
      color: var(--bc-fg);
    }

    /* The site styles focus rings on inputs (outline and possibly box-shadow),
       so use a higher specificity and cover both :focus and :focus-visible */
    .${overlayClass} input.bc-filter:focus,
    .${overlayClass} input.bc-filter:focus-visible {
      border-color: var(--coub-blue, #0332FF);
      outline: none;
      box-shadow: none;
    }

    .bc-list {
      flex: 1;
      min-height: 120px;
      padding: 8px 16px;
      overflow-y: auto;
    }

    .bc-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
    }

    .bc-item:hover {
      background: var(--bc-muted);
    }

    .bc-item a {
      overflow: hidden;
      color: inherit;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .${overlayClass} .bc-item button {
      flex: none;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--bc-fg);
      cursor: pointer;
    }

    .${overlayClass} .bc-item button:hover {
      background: var(--coub-alert, #E81010);
      color: #fff;
    }

    .bc-empty {
      padding: 16px 8px;
      opacity: .6;
    }
  `;

  // ===========================================================================
  // Storage
  // ===========================================================================
  // Tags are stored as an array of strings, users as an array of {id, name}.
  // Both are ordered from oldest to newest.

  let blockedTags = [];
  let blockedUsers = [];

  function readStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (_) {
      return null;
    }
  }

  // Legacy localStorage format for users was an object {id: name}; it is migrated on load.
  // This function accepts it for that purpose only, file import requires an array.
  function normalizeUsers(raw) {
    if (!raw) return [];
    const entries = Array.isArray(raw)
      ? raw.map(u => [u?.id, u?.name])
      : Object.entries(raw);
    const seen = new Set();
    const result = [];
    entries.forEach(([id, name]) => {
      if (typeof id !== 'string' || !id || seen.has(id)) return;
      seen.add(id);
      result.push({ id, name: String(name ?? id) });
    });
    return result;
  }

  function loadUsers() {
    const raw = readStorage(blockedUsersField);
    const users = normalizeUsers(raw);
    if (raw && !Array.isArray(raw)) {
      localStorage.setItem(blockedUsersField, JSON.stringify(users));
    }
    return users;
  }

  // Reload from localStorage to get the actual state (it is shared between tabs)
  function reloadBlacklists() {
    blockedTags = readStorage(blockedTagsField) || [];
    blockedUsers = loadUsers();
  }

  function saveBlacklists() {
    localStorage.setItem(blockedTagsField, JSON.stringify(blockedTags));
    localStorage.setItem(blockedUsersField, JSON.stringify(blockedUsers));
  }

  function isTagBlocked(tag) {
    return blockedTags.includes(tag);
  }

  function isUserBlocked(userId) {
    return blockedUsers.some(u => u.id === userId);
  }

  function addTagToBlocked(tag) {
    reloadBlacklists();
    if (isTagBlocked(tag)) return;
    blockedTags.push(tag);
    saveBlacklists();
  }

  function addUserToBlocked(userId, userName) {
    reloadBlacklists();
    if (isUserBlocked(userId)) return;
    blockedUsers.push({ id: userId, name: userName || userId });
    saveBlacklists();
  }

  // ===========================================================================
  // Hiding coubs
  // ===========================================================================

  function pauseCoub(coub) {
    const btn = coub.querySelector(`.${coubPlayerButton}`);
    if (btn) btn.click();
  }

  function muteAllMedia(coub) {
    coub.querySelectorAll('video, audio').forEach(m => { m.muted = true; });
  }

  function isCoubPlaying(coub) {
    return [...coub.querySelectorAll('video, audio')].some(m => !m.paused);
  }

  // Silence a hidden coub without touching media elements' play state directly
  // (forcing pause() fights with the player's audio/video sync and distorts sound).
  // Mute immediately, then let the player pause itself via its own button.
  function silenceCoub(coub) {
    muteAllMedia(coub);
    // The button is a toggle: click only when something is really playing, and only once at a time
    if (coub.dataset.bcPausing || !isCoubPlaying(coub)) return;
    coub.dataset.bcPausing = '1';
    pauseCoub(coub);
    setTimeout(() => { delete coub.dataset.bcPausing; }, PAUSE_LOCK_MS);
  }

  // Coubs are hidden, not removed: removing React-managed nodes breaks React
  // reconciliation (insertBefore errors). The 'coub' class is dropped, though, because
  // the site finds coubs by '.page .coub' for hotkeys (j/k), scroll detection and layout,
  // so it will simply not see the hidden ones.
  function hideCoub(coub) {
    coub.dataset.bcHiding = '1';
    coub.classList.remove(coubClass);
    silenceCoub(coub);
  }

  function hideClosestCoub(el) {
    const coub = el.closest(`.${coubClass}`);
    if (coub) hideCoub(coub);
  }

  function hideExistingCoubsByTag(tag) {
    document.querySelectorAll(`.${tagClass}[href="${tagHrefPrefix}${tag}"]`).forEach(hideClosestCoub);
  }

  function hideExistingCoubsByUser(userId) {
    document.querySelectorAll(`.${userClass}[href="/${userId}"]`).forEach(hideClosestCoub);
  }

  // Safety net: events can be missed (media started before it was attached, player
  // unmuting itself), so periodically silence playing media inside hidden coubs.
  // Cost depends on the number of media elements, not on the number of hidden coubs.
  function silenceHiddenPlayingCoubs() {
    const coubs = new Set();
    document.querySelectorAll('video, audio').forEach(m => {
      if (m.paused) return;
      const coub = m.closest(hiddenCoubSelector);
      if (coub) coubs.add(coub);
    });
    coubs.forEach(silenceCoub);
  }

  // ===========================================================================
  // Buttons on coubs
  // ===========================================================================

  function getTagFromLink(tagLink) {
    return tagLink.getAttribute('href').slice(tagHrefPrefix.length);
  }

  function getUserIdFromLink(userLink) {
    return userLink.getAttribute('href').slice(1);
  }

  function createButton(title, icon, ...classes) {
    const btn = document.createElement('button');
    btn.classList.add(...classes);
    btn.title = title;
    btn.innerHTML = icon;
    return btn;
  }

  function addButtonToTagLink(tagLink) {
    if (isTagBlocked(getTagFromLink(tagLink))) {
      hideClosestCoub(tagLink);
      return;
    }

    if (tagLink.querySelector(`.${tagActionsClass}`)) return;

    const actionsContainer = document.createElement('div');
    actionsContainer.className = tagActionsClass;
    actionsContainer.append(
      createButton(T().copyTagTooltip, copySvgIcon, tagBtnClass, copyTagBtnClass),
      createButton(T().blockTagTooltip, blockSvgIcon, tagBtnClass, blockTagBtnClass),
    );
    tagLink.append(actionsContainer);
  }

  function addButtonToUserLink(userLink) {
    if (isUserBlocked(getUserIdFromLink(userLink))) {
      hideClosestCoub(userLink);
      return;
    }

    if (userLink.nextElementSibling?.classList.contains(blockUserBtnClass)) return;

    userLink.after(createButton(T().blockUserTooltip, blockSvgIcon, blockUserBtnClass));
  }

  function handleOnClickBlockUser(e) {
    e.preventDefault();
    const userLink = e.target.closest(`.${coubTitleClass}`).querySelector(`.${userClass}`);
    const userId = getUserIdFromLink(userLink);
    addUserToBlocked(userId, userLink.textContent.trim());
    hideExistingCoubsByUser(userId);
  }

  function handleOnClickBlockTag(e) {
    e.preventDefault();
    const tag = getTagFromLink(e.target.closest(`.${tagClass}`));
    addTagToBlocked(tag);
    hideExistingCoubsByTag(tag);
  }

  function handleOnClickCopyTag(e) {
    e.preventDefault();
    const tag = getTagFromLink(e.target.closest(`.${tagClass}`));
    navigator.clipboard.writeText(decodeURI(tag));
  }

  // ===========================================================================
  // Blacklist manager UI
  // ===========================================================================

  function safeDecode(str) {
    try {
      return decodeURI(str);
    } catch (_) {
      return str;
    }
  }

  function exportBlacklists() {
    reloadBlacklists();
    const data = JSON.stringify({ tags: blockedTags, users: blockedUsers }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = 'bettercoub-blacklist.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), OBJECT_URL_LIFETIME_MS);
  }

  function importBlacklists(file, onDone) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.users !== undefined && !Array.isArray(data.users)) {
          throw new Error('users must be an array');
        }

        reloadBlacklists();
        let addedTags = 0;
        let addedUsers = 0;

        if (Array.isArray(data.tags)) {
          data.tags.forEach(tag => {
            if (typeof tag === 'string' && tag && !isTagBlocked(tag)) {
              blockedTags.push(tag);
              addedTags++;
            }
          });
        }

        normalizeUsers(data.users).forEach(user => {
          if (!isUserBlocked(user.id)) {
            blockedUsers.push(user);
            addedUsers++;
          }
        });

        saveBlacklists();
        alert(T().importDone.replace('{t}', addedTags).replace('{u}', addedUsers));
        onDone();
      } catch (_) {
        alert(T().importError);
      }
    };
    reader.readAsText(file);
  }

  // Site colour variables live on .coub-skin, so our UI must be inside it
  function getThemeRoot() {
    return document.querySelector(siteSkinSelector) || document.body;
  }

  // Items of the active tab, newest first
  function getListItems(tab) {
    if (tab === 'tags') {
      return blockedTags
        .map(tag => ({ key: tag, label: safeDecode(tag), href: `${tagHrefPrefix}${tag}` }))
        .reverse();
    }
    return blockedUsers
      .map(({ id, name }) => ({
        key: id,
        label: name && name !== id ? `${name} (${id})` : id,
        href: `/${id}`,
      }))
      .reverse();
  }

  function openManager() {
    if (document.querySelector(`.${overlayClass}`)) return;
    let tab = 'tags';

    const overlay = document.createElement('div');
    overlay.className = overlayClass;
    overlay.innerHTML = `
      <div class="bc-modal">
        <div class="bc-head"><span></span><button class="bc-btn bc-close"></button></div>
        <div class="bc-tabs">
          <button class="bc-tab" data-tab="tags"></button>
          <button class="bc-tab" data-tab="users"></button>
        </div>
        <input type="text" class="bc-filter">
        <div class="bc-list"></div>
        <div class="bc-foot">
          <button class="bc-btn bc-export"></button>
          <button class="bc-btn bc-import"></button>
          <input type="file" accept="application/json,.json" hidden>
          <small></small>
        </div>
      </div>`;
    const $ = sel => overlay.querySelector(sel);
    const tabButtons = overlay.querySelectorAll('.bc-tab');
    const filterInput = $('.bc-filter');
    const fileInput = $('input[type=file]');

    $('.bc-head span').textContent = T().manage;
    $('.bc-close').textContent = T().close;
    $('.bc-export').textContent = T().exportBtn;
    $('.bc-import').textContent = T().importBtn;
    $('.bc-export').title = T().exportTooltip;
    $('.bc-import').title = T().importTooltip;
    $('.bc-foot small').textContent = T().reloadHint;
    filterInput.placeholder = T().filterPlaceholder;

    function renderTabs() {
      tabButtons.forEach(btn => {
        const count = btn.dataset.tab === 'tags' ? blockedTags.length : blockedUsers.length;
        btn.textContent = `${T()[btn.dataset.tab]} (${count})`;
        btn.classList.toggle('bc-active', btn.dataset.tab === tab);
      });
    }

    function createListRow(item) {
      const row = document.createElement('div');
      row.className = 'bc-item';

      const link = document.createElement('a');
      link.href = item.href;
      link.target = '_blank';
      link.textContent = item.label;

      const removeBtn = createButton(T().remove, blockSvgIcon);
      removeBtn.addEventListener('click', () => {
        reloadBlacklists();
        if (tab === 'tags') {
          blockedTags = blockedTags.filter(t => t !== item.key);
        } else {
          blockedUsers = blockedUsers.filter(u => u.id !== item.key);
        }
        saveBlacklists();
        render();
      });

      row.append(link, removeBtn);
      return row;
    }

    function render() {
      reloadBlacklists();
      renderTabs();

      const query = filterInput.value.trim().toLowerCase();
      const items = getListItems(tab).filter(item =>
        !query ||
        item.label.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query)
      );

      const list = $('.bc-list');
      list.textContent = '';
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'bc-empty';
        empty.textContent = T().empty;
        list.append(empty);
        return;
      }
      list.append(...items.map(createListRow));
    }

    const onKeydown = e => { if (e.key === 'Escape') close(); };
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKeydown);
    }

    document.addEventListener('keydown', onKeydown);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
    $('.bc-close').addEventListener('click', close);
    tabButtons.forEach(btn => btn.addEventListener('click', () => {
      tab = btn.dataset.tab;
      filterInput.value = '';
      render();
    }));
    filterInput.addEventListener('input', render);
    $('.bc-export').addEventListener('click', exportBlacklists);
    $('.bc-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) importBlacklists(fileInput.files[0], render);
      fileInput.value = '';
    });

    render();
    getThemeRoot().append(overlay);
    filterInput.focus();
  }

  // ===========================================================================
  // Init
  // ===========================================================================

  function initPageWatcher(style, managerBtn) {
    // The site re-renders and may drop foreign nodes, so keep re-attaching ours
    function watchPage() {
      if (!style.isConnected) document.head.appendChild(style);

      const slot = document.querySelector(headerButtonsSlot);
      if (slot && slot.firstElementChild !== managerBtn) slot.prepend(managerBtn);

      silenceHiddenPlayingCoubs();
    }

    watchPage();
    setInterval(watchPage, WATCH_INTERVAL_MS);
  }

  function initCoubObserver() {
    document.arrive(`.${coubClass}`, { existing: true }, function(coub) {
      if (coub.classList.contains(coubPromoClass)) {
        hideCoub(coub);
        return;
      }
      // Coubs can reappear without inner content, so tags and user links existence is not guaranteed
      coub.querySelectorAll(`.${tagClass}`).forEach(addButtonToTagLink);
      coub.querySelectorAll(`.${userClass}`).forEach(addButtonToUserLink);
    });
  }

  function initMediaGuards() {
    // Hidden coubs must stay silent even if the player autoplays later (e.g. after page load)
    document.addEventListener('play', function(e) {
      const hiddenCoub = e.target.closest?.(hiddenCoubSelector);
      if (hiddenCoub) silenceCoub(hiddenCoub);
    }, true);

    // The player may unmute its media again after load
    document.addEventListener('volumechange', function(e) {
      if (!e.target.muted && e.target.closest?.(hiddenCoubSelector)) e.target.muted = true;
    }, true);
  }

  function initClickHandlers() {
    document.addEventListener('click', function(e) {
      const tagBtn = e.target.closest(`.${tagBtnClass}`);
      if (tagBtn?.classList.contains(blockTagBtnClass)) {
        handleOnClickBlockTag(e);
      } else if (tagBtn?.classList.contains(copyTagBtnClass)) {
        handleOnClickCopyTag(e);
      } else if (e.target.closest(`.${blockUserBtnClass}`)) {
        handleOnClickBlockUser(e);
      }
    });
  }

  function initBetterCoub() {
    reloadBlacklists();

    const style = document.createElement('style');
    style.textContent = customStyles + managerStyles;
    document.head.appendChild(style);

    const managerBtn = createButton(T().manage, listSvgIcon, headerBtnClass);
    managerBtn.addEventListener('click', openManager);

    initPageWatcher(style, managerBtn);
    initCoubObserver();
    initMediaGuards();
    initClickHandlers();
  }

  initBetterCoub();
})();
