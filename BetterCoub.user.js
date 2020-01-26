// ==UserScript==
// @name         BetterCoub
// @namespace    https://coub.com/
// @version      0.1
// @description  remove promoted stuff and filter content by tags and users
// @author       You
// @match        https://coub.com/*
// @require      https://raw.githubusercontent.com/uzairfarooq/arrive/master/minified/arrive.min.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    var restrictedTags = JSON.parse(localStorage.getItem("blacklist")) || [];

    function arrayContains(needle, arrhaystack)
    {
        return (arrhaystack.indexOf(needle) > -1);
    }

    function removeByNewTag(tag)
    {
        $('.coub__tags-tag[href="/tags/'+tag+'"]').closest('.coub').remove();
    }

    function addButtonToTagLink(link)
    {
        if (!link.hasAttribute('href')) return;

        // remove filtered
        let tagLink = $(link).attr('href').substring(6);
        if (arrayContains(tagLink, restrictedTags)) {
            $(link).closest('.coub').remove();
        }

        // add filter button
        $(link).append("<button type='button' class='filterByTag' title='Add tag to Blacklist'>&times;</button>");
    }

    function addTagToRestricted(tag)
    {
        restrictedTags = JSON.parse(localStorage.getItem("blacklist")) || [];
        if (!arrayContains(tag, restrictedTags)) {
            restrictedTags.push(tag);
            localStorage.setItem("blacklist", JSON.stringify(restrictedTags));
        }
    }

    $(window).bind("load", function() {
        GM_addStyle('.related-tags a, .coub__tags-tag { position:relative; }');

        // fix for related tags block
        GM_addStyle('.related-tags { display: flex; flex-wrap: wrap; }');
        GM_addStyle('.related-tags .related-tags__title { flex: 0 0 100%; }');
        GM_addStyle('.related-tags a { line-height: 30px; padding-top:0; padding-bottom:0; margin-right: 5px; margin-bottom: 5px;}');

        GM_addStyle('.filterByTag { display: none; position: absolute; right: 0; line-height: inherit; height: inherit; width: 24px; padding: 0; font-weight: bold; font-size: 16px;border: none; background-color: black; color: white; cursor: pointer; vertical-align: middle; border-radius: inherit; }');
        GM_addStyle('.coub__tags-tag:hover .filterByTag, .related-tags a:hover .filterByTag { display: inline-block; }');
        GM_addStyle('.filterByTag:hover { background-color: red; }');

        $(document).arrive(".coub__promoted-badge", function(el) {
            $(el).closest('.coub').remove();
        });

        //$(".related-tags a").each(function() {
        $("a[href^='/tags/']").each(function() {
            addButtonToTagLink(this);
        });

        //$(document).arrive(".coub__tags-tag:not(.tags-community)", function(newElem) {
        $(document).arrive("a[href^='/tags/']", function(el) {
            addButtonToTagLink(el);
        });

        $(document).on("click", "button.filterByTag" , function(e) {
            e.preventDefault();
            let tag = $(e.target).parent().attr('href').substring(6);
            addTagToRestricted(tag);
            removeByNewTag(tag);
        });
    });
})();