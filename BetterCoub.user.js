// ==UserScript==
// @name         BetterCoub
// @namespace    https://github.com/tkachen/better-coub
// @version      0.3.0
// @description  Filter out coubs by tags and users
// @author       tkachen
// @match        https://coub.com/*
// @downloadURL  https://github.com/tkachen/better-coub/raw/master/BetterCoub.user.js
// @require      https://raw.githubusercontent.com/uzairfarooq/arrive/master/minified/arrive.min.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
  'use strict';

  const blockedTagsField = 'bc_tag_blacklist';
  const blockedUsersField = 'bc_user_blacklist';

  const coubClass = 'coub';
  const tagClass = 'coub__tags-tag';

  const tagActionsClass = 'tagActions';
  const tagBtnClass = 'tagBtn'
  const blockTagBtnClass = 'blockTagBtn';
  const copyTagBtnClass = 'copyTagBtn';

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

  let blockedTags = JSON.parse(localStorage.getItem(blockedTagsField)) || [];
  let blockedUsers = JSON.parse(localStorage.getItem(blockedUsersField)) || {};

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
      border-radius: inherit;
    }

    .${tagClass}:hover .${tagActionsClass} {
      display: flex;
    }

    .${tagBtnClass}:hover {
      color: var(--btn-hover-color);
    }

    .${copyTagBtnClass}:hover {
      background: var(--copy-btn-hover-bg);
    }

    .${blockTagBtnClass}:hover {
      background: var(--block-btn-hover-bg);
    }
  `;

  function initBetterCoub() {
    GM_addStyle(customStyles);

    document.arrive(`.${tagClass}[href^="/tags/"]`, {existing: true}, function(tagLink) {
      addButtonToTagLink(tagLink);
    });

    document.addEventListener('click', function(e) {
      if (e.target.closest(`.${tagBtnClass}`)?.classList.contains(blockTagBtnClass)) {
        handleOnClickBlockTag(e);
      }
      if (e.target.closest(`.${tagBtnClass}`)?.classList.contains(copyTagBtnClass)) {
        handleOnClickCopyTag(e);
      }
    });
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

  // function handleOnClickBlockUser(e) {
  //   e.preventDefault();
  //   const userLink = e.target.parentElement.find('.description__stamp__user')[0];
  //   const userId = userLink.getAttribute('href').substring(1);
  //   const userName = userLink.getAttribute('title');
  //   addUserToBlocked(userId, userName);
  //   removeExistingCoubsByUser(userId);
  // }

  function removeClosestCoub(el) {
    el.closest(`.${coubClass}`).remove();
  }

  function removeExistingCoubsByTag(tag) {
    document.querySelectorAll(`.${tagClass}[href="/tags/${tag}"]`).forEach(removeClosestCoub);
  }

  // function removeExistingCoubsByUser(userId) {
  //   document.querySelectorAll('.description__stamp a[href="/' + userId + '"]').forEach(removeClosestCoub);
  // }

  function addButtonToTagLink(tagLink) {
    if (!tagLink.hasAttribute('href')) return;

    const tagValue = tagLink.getAttribute('href').substring(6);
    if (blockedTags.includes(tagValue)) {
      removeClosestCoub(tagLink);
    }

    const actionsContainer = document.createElement('div');
    actionsContainer.className = tagActionsClass;
    tagLink.append(actionsContainer);

    const copyBtn = document.createElement('button');
    copyBtn.classList.add(tagBtnClass, copyTagBtnClass);
    copyBtn.title = 'Copy tag to clipboard';
    copyBtn.innerHTML = copySvgIcon;
    actionsContainer.append(copyBtn);

    const blockBtn = document.createElement('button');
    blockBtn.classList.add(tagBtnClass, blockTagBtnClass);
    blockBtn.title = 'Filter out coubs with this tag';
    blockBtn.innerHTML = blockSvgIcon;
    actionsContainer.append(blockBtn);
  }

  // function addButtonToUserLink (link) {
  //   if (!link.hasAttribute('href')) return;

  //   const userId = $(link).attr('href').substring(1);
  //   if (objectHasProperty(userId, blockedUsers)) {
  //     $(link).closest('.coub').remove();
  //   }

  //   $(link).parent().append('<button type="button" class="filterByUser" title="Add user to Blacklist">Block</button>');
  // }

  function addTagToBlocked (tag) {
    // reload from localStorage to get actual state
    blockedTags = JSON.parse(localStorage.getItem(blockedTagsField)) || [];
    if (!blockedTags.includes(tag)) {
      blockedTags.push(tag);
      localStorage.setItem(blockedTagsField, JSON.stringify(blockedTags));
    }
  }

  // function addUserToBlocked (userId, userName) {
  //   // reload from localStorage to get actual state
  //   blockedUsers = JSON.parse(localStorage.getItem(blockedUsersField)) || {};
  //   if (!blockedUsers.hasOwnProperty(userId)) {
  //     blockedUsers[userId] = userName;
  //     localStorage.setItem(blockedUsersField, JSON.stringify(blockedUsers));
  //   }
  // }

  initBetterCoub();
})();
