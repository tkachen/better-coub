// ==UserScript==
// @name         BetterCoub
// @namespace    https://github.com/tkachen/better-coub
// @version      0.2.2
// @description  remove promoted stuff and filter content by tags and users
// @author       tkachen
// @match        https://coub.com/*
// @downloadURL  https://github.com/tkachen/better-coub/raw/master/BetterCoub.user.js
// @require      https://raw.githubusercontent.com/uzairfarooq/arrive/master/minified/arrive.min.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    
    const blockedTagsField = 'bc_tag_blacklist'
    const blockedUsersField = 'bc_user_blacklist'
    const settingsField = 'bc_settings'

    var blockedTags = JSON.parse(localStorage.getItem(blockedTagsField)) || [];
    var blockedUsers = JSON.parse(localStorage.getItem(blockedUsersField)) || {};
    var settings = JSON.parse(localStorage.getItem(settingsField)) || {};

    function addStyles () {
        GM_addStyle('.related-tags a, .coub__tags-tag { position:relative; }');

        // fix for related tags block
        GM_addStyle('.related-tags { display: flex; flex-wrap: wrap; }');
        GM_addStyle('.related-tags .related-tags__title { flex: 0 0 100%; }');
        GM_addStyle('.related-tags a { line-height: 30px; padding-top:0; padding-bottom:0; margin-right: 5px; margin-bottom: 5px;}');

        // filter buttons
        GM_addStyle('.filterByTag { display: none; position: absolute; right: 0; line-height: inherit; height: inherit; width: 24px; padding: 0; font-weight: bold; font-size: 16px;border: none; background-color: black; color: white; cursor: pointer; vertical-align: middle; border-radius: inherit; }');
        GM_addStyle('.filterByUser { display: none; line-height: inherit; height: inherit; padding: 0 6px; font-weight: bold; font-size: 16px;border: none; background-color: black; color: white; cursor: pointer; vertical-align: middle; border-radius: 8px; }');
        GM_addStyle('.coub__tags-tag:hover .filterByTag, .related-tags a:hover .filterByTag { display: inline-block; }');
        GM_addStyle('.description__stamp:hover .filterByUser { display: inline-block; }');
        GM_addStyle('.filterByTag:hover, .filterByUser:hover { background-color: red; }');
    }

    function arrayContains (needle, arrhaystack) {
        return (arrhaystack.indexOf(needle) > -1);
    }

    function objectHasProperty (prop, obj) {
        return obj.hasOwnProperty(prop)
    }

    function removeByTag (tag) {
        $('.coub__tags-tag[href="/tags/'+tag+'"]').closest('.coub').remove();
    }

    function removeByUser (userId) {
        $('.description__stamp a[href="/'+userId+'"]').closest('.coub').remove();
    }

    function addButtonToTagLink (link) {
        if (!link.hasAttribute('href')) return;
        
        // remove filtered
        const tagValue = $(link).attr('href').substring(6);
        if (arrayContains(tagValue, blockedTags)) {
            $(link).closest('.coub').remove();
        }

        // add filter button
        $(link).append('<button type="button" class="filterByTag" title="Add tag to Blacklist">&times;</button>');
    }

    function addButtonToUserLink (link) {
        if (!link.hasAttribute('href')) return;

        // remove filtered
        const userId = $(link).attr('href').substring(1);
        if (objectHasProperty(userId, blockedUsers)) {
            $(link).closest('.coub').remove();
        }

        // add filter button
        $(link).parent().append('<button type="button" class="filterByUser" title="Add user to Blacklist">Block</button>');
    }

    function addTagToBlocked (tag) {
        blockedTags = JSON.parse(localStorage.getItem(blockedTagsField)) || [];
        if (!arrayContains(tag, blockedTags)) {
            blockedTags.push(tag);
            localStorage.setItem(blockedTagsField, JSON.stringify(blockedTags));
        }
    }

    function addUserToBlocked (userId, userName) {
        blockedUsers = JSON.parse(localStorage.getItem(blockedUsersField)) || {};
        if (!objectHasProperty(userId, blockedUsers)) {
            blockedUsers[userId] = userName;
            localStorage.setItem(blockedUsersField, JSON.stringify(blockedUsers));
        }
    }

    $(window).bind('load', function() {
        addStyles()

        $(document).arrive('.coub__promoted-badge', function(el) {
            $(el).closest('.coub').remove();
        });

        $('a[href^="/tags/"]').each(function() {
            addButtonToTagLink(this);
        });

        $('.description__stamp a:not([href^="/view/"]):not([href^="http"]):not([href="/apps"])').each(function() {
            addButtonToUserLink(this);
        });

        $(document).arrive('a[href^="/tags/"]', function(el) {
            addButtonToTagLink(el);
        });

        $(document).arrive('.description__stamp a:not([href^="/view/"]):not([href^="http"]):not([href="/apps"])', function(el) {
            console.log('--BETTER_COUB--', 'arrive', el)
            addButtonToUserLink(el);
        });

        $(document).on('click', 'button.filterByTag' , function(e) {
            // TODO: put tag value in button attrs
            e.preventDefault();
            const tagLink = $(e.target).parent();
            const tag = tagLink.attr('href').substring(6);
            addTagToBlocked(tag);
            removeByTag(tag);
        });

        $(document).on('click', 'button.filterByUser' , function(e) {
            // TODO: put user id and name in button attrs
            e.preventDefault();
            const userLink = $(e.target).parent().find('.description__stamp__user')[0];
            const userId = $(userLink).attr('href').substring(1);
            const userName = $(userLink).attr('title');
            addUserToBlocked(userId, userName);
            removeByUser(userId);
        });
    });
})();
