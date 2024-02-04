// ==UserScript==
// @name            BetterCoub
// @name:ru         BetterCoub
// @namespace       https://github.com/tkachen/better-coub
// @version         0.3.2
// @description     Adds blacklists for users and tags, adds copy tag button on Coub.com
// @description:ru  Добавляет черные списки для пользователей и тегов, добавляет конопку для копирования тега на Coub.com
// @author          tkachen
// @match           https://coub.com/*
// @downloadURL     https://github.com/tkachen/better-coub/raw/master/BetterCoub.user.js
// @require         https://raw.githubusercontent.com/uzairfarooq/arrive/master/minified/arrive.min.js
// @grant           GM_addStyle
// ==/UserScript==

(function() {
  'use strict';

  const blockedTagsField = 'bc_tag_blacklist';
  const blockedUsersField = 'bc_user_blacklist';

  const coubClass = 'coub';
  const tagClass = 'coub__tags-tag';
  const coubTitleClass = 'coub-description__about';
  const userClass = 'coub-description__about__user';
  const coubPlayerButton = 'viewer__click';

  const tagActionsClass = 'tagActions';
  const tagBtnClass = 'tagBtn'
  const blockTagBtnClass = 'blockTagBtn';
  const copyTagBtnClass = 'copyTagBtn';
  const blockUserBtnClass = 'blockUserBtn';

  const strings = {
    'ru': {
      copyTagTooltip: 'Копировать тег в буфер обмена',
      blockTagTooltip: 'Добавить тег в черный список',
      blockUserTooltip: 'Добавить пользователя в черный список',
    },
    'en': {
      copyTagTooltip: 'Copy tag to clipboard',
      blockTagTooltip: 'Add tag to blacklist',
      blockUserTooltip: 'Add user to blacklist',
    },
  }

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

  const customStyles = `
    :root {
      --btn-color: #000000;
      --btn-hover-color: #FFFFFF;
      --copy-btn-hover-bg: #0332FF;
      --block-btn-hover-bg: #E81010;
    }

    .dark-theme {
      --btn-color: #FFFFFF;
      --btn-hover-color: #000000;
      --copy-btn-hover-bg: #0084FF;
      --block-btn-hover-bg: #D0021B;
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
      color: var(--btn-color);
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
      color: var(--btn-hover-color);
    }

    .${copyTagBtnClass}:hover {
      background: var(--copy-btn-hover-bg);
    }

    .${blockUserBtnClass}:hover,
    .${blockTagBtnClass}:hover {
      background: var(--block-btn-hover-bg);
    }
  `;

  const lang = window.eval('I18n.locale');

  let blockedTags = JSON.parse(localStorage.getItem(blockedTagsField)) || [];
  let blockedUsers = JSON.parse(localStorage.getItem(blockedUsersField)) || {};

  function isTagBlocked(tag) {
    return blockedTags.includes(tag);
  }

  function isUserBlocked(userId) {
    return blockedUsers.hasOwnProperty(userId);
  }

  function isCoubActive(coubNode) {
    return coubNode.classList.contains('active');
  }

  function addTagToBlocked(tag) {
    // reload from localStorage to get actual state
    blockedTags = JSON.parse(localStorage.getItem(blockedTagsField)) || [];
    if (!isTagBlocked(tag)) {
      blockedTags.push(tag);
      localStorage.setItem(blockedTagsField, JSON.stringify(blockedTags));
    }
  }

  function addUserToBlocked(userId, userName) {
    // reload from localStorage to get actual state
    blockedUsers = JSON.parse(localStorage.getItem(blockedUsersField)) || {};
    if (!isUserBlocked(userId)) {
      blockedUsers[userId] = userName;
      localStorage.setItem(blockedUsersField, JSON.stringify(blockedUsers));
    }
  }

  function pauseCoub(coubNode) {
    const btn = coubNode.querySelector(`.${coubPlayerButton}`);
    if (btn) btn.click();
  }

  function removeClosestCoub(el) {
    const coub = el.closest(`.${coubClass}`);
    if (!coub) return;
    if (isCoubActive(coub)) pauseCoub(coub);
    coub.remove();
  }

  function removeExistingCoubsByTag(tag) {
    document.querySelectorAll(`.${tagClass}[href="/tags/${tag}"]`).forEach(removeClosestCoub);
  }

  function removeExistingCoubsByUser(userId) {
    document.querySelectorAll(`.${userClass}[href="/${userId}"]`).forEach(removeClosestCoub);
  }

  function handleOnClickBlockUser(e) {
    e.preventDefault();
    const userLink = e.target.closest(`.${coubTitleClass}`).querySelector(`.${userClass}`);
    const userId = userLink.getAttribute('href').substring(1);
    const userName = userLink.getAttribute('title');
    addUserToBlocked(userId, userName);
    removeExistingCoubsByUser(userId);
  }

  function handleOnClickBlockTag(e) {
    e.preventDefault();
    const tagLink = e.target.closest(`.${tagClass}`);
    const tag = tagLink.getAttribute('href').substring(6);
    addTagToBlocked(tag);
    removeExistingCoubsByTag(tag);
  }

  function handleOnClickCopyTag(e) {
    e.preventDefault();
    const tagLink = e.target.closest(`.${tagClass}`);
    const tag = tagLink.getAttribute('href').substring(6);
    navigator.clipboard.writeText(decodeURI(tag));
  }

  function addButtonToTagLink(tagLink) {
    const tagValue = tagLink.getAttribute('href').substring(6);
    if (isTagBlocked(tagValue)) {
      removeClosestCoub(tagLink);
    }

    const actionsContainer = document.createElement('div');
    actionsContainer.className = tagActionsClass;
    tagLink.append(actionsContainer);

    const copyBtn = document.createElement('button');
    copyBtn.classList.add(tagBtnClass, copyTagBtnClass);
    copyBtn.title = strings[lang].copyTagTooltip;
    copyBtn.innerHTML = copySvgIcon;
    actionsContainer.append(copyBtn);

    const blockBtn = document.createElement('button');
    blockBtn.classList.add(tagBtnClass, blockTagBtnClass);
    blockBtn.title = strings[lang].blockTagTooltip;
    blockBtn.innerHTML = blockSvgIcon;
    actionsContainer.append(blockBtn);
  }

  function addButtonToUserLink(userLink) {
    const userId = userLink.getAttribute('href').substring(1);
    if (isUserBlocked(userId)) {
      removeClosestCoub(userLink);
    }

    const blockBtn = document.createElement('button');
    blockBtn.classList.add(blockUserBtnClass);
    blockBtn.title = strings[lang].blockUserTooltip;
    blockBtn.innerHTML = blockSvgIcon;
    userLink.after(blockBtn);
  }

  function initBetterCoub() {
    GM_addStyle(customStyles);

    document.arrive(`.${coubClass}`, {existing: true}, function(coub) {
      const tagLinks = coub.querySelectorAll(`.${tagClass}`);
      tagLinks.forEach(addButtonToTagLink);
      const userLink = coub.querySelector(`.${userClass}`);
      addButtonToUserLink(userLink);
    });

    document.addEventListener('click', function(e) {
      if (e.target.closest(`.${tagBtnClass}`)?.classList.contains(blockTagBtnClass)) {
        handleOnClickBlockTag(e);
      }
      if (e.target.closest(`.${tagBtnClass}`)?.classList.contains(copyTagBtnClass)) {
        handleOnClickCopyTag(e);
      }
      if (e.target.closest(`.${blockUserBtnClass}`)) {
        handleOnClickBlockUser(e);
      }
    });
  }

  initBetterCoub();
})();
