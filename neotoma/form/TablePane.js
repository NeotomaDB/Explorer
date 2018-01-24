define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./template/tablePane.html", "dijit/registry", "dojo/request/script", "dojo/store/Memory", "dojo/_base/lang", "dojo/topic", "dojo/_base/array", "dojo/dom-style", "neotoma/widget/SearchResultsGrid", "dijit/form/FilteringSelect"],
    function (declare, ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin, template, registry, script, Memory, lang, topic, array, domStyle) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            visible: false,
            searchChanged: function(newSearchId) {

            },
            showTab: function (evt) {
                try {
                    this.get("grid").resize();
                } catch (e) {
                    alert("showTab error: " + e.message);
                }
            },
            getSearchTab: function (searchId) {
                var allTabs = this.getChildren();
                var numTabs = allTabs.length;
                var thisTab = null;
                for (var i = 0; i < numTabs; i += 1) {
                    var thisTab = allTabs[i];
                    if (thisTab.get("searchId").toString() === searchId.toString()) {
                        return thisTab;
                    }
                }
            },
            removeTab: function (searchId) {
                var tab = this.getSearchTab(searchId);
                this.removeChild(tab);
            },
            setTabName: function (searchId, searchName) {
                var tab = this.getSearchTab(searchId);
                if (tab) {
                    tab.set("title", searchName);
                } else {
                    alert("can't find tab to set title");
                }
            },
            addTab: function() {

            },
            onShow: function () {
                // resize grid
                var tabsPane = registry.byId("tableTabsPane");
                if (tabsPane) {
                    var selectedPane = tabsPane.selectedChildWidget;
                    if (selectedPane) {
                        selectedPane.get("grid").resize();
                    }
                }
                // set visible
                this.set("visible", true);
            },
            onHide: function () {
                this.set("visible", false);
            },
            postCreate: function () {
                this.inherited(arguments);

                // set data in grid for now

            }
        });
    });