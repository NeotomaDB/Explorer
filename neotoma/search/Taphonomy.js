define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/taphonomy.html", "dijit/_WidgetsInTemplateMixin", "dojo/request/script", "dojo/_base/lang", "dojo/topic", "dijit/registry", "dojo/store/Memory", "dojo/keys", "dojo/_base/array", "dijit/form/FilteringSelect", "dojo/dom-style", "dojo/query"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, lang, topic, registry, Memory, keys, array) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            searchResults: null,
            handleEnter: function (evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        this.doSearch();
                        break;
                }
            }
        });
    });