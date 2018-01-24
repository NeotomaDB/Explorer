define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/userSettings.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang",  "dojo/store/Memory", "dojo/topic", "dijit/registry","dojo/dom-geometry", "dijit/form/Button", "dijit/form/RadioButton", "dijit/form/FilteringSelect"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, topic, registry, domGeometry) {
        // define widget
        return declare([Dialog,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            currentSearchFormHeight: 400,
            heightIncrement: 50,
            heightClick: function(evt) {
                switch (evt.currentTarget.name) {
                    case "incHeight":
                        // calculate new height
                        var searchForm = registry.byId("userSearchesNewForm");
                        var currentHeight = searchForm.get("advancedHeight");
                        var newHeight = currentHeight + this.heightIncrement;

                        // get map height
                        var mapNode = registry.byId("mapPane").domNode;
                        var mapPosition = domGeometry.position(mapNode);
                        var mapHeight = mapPosition.h - 70;

                        // stop if new height is greater than adjusted map height
                        if (newHeight >= mapHeight) {
                            return;
                        }

                        this.currentSearchFormHeight = newHeight;
                        topic.publish("neotoma/search/NewFormHeight", newHeight);
                        break;
                    case "decHeight":
                        // calculate new height
                        var searchForm = registry.byId("userSearchesNewForm");
                        var currentHeight = searchForm.get("advancedHeight");
                        var newHeight = currentHeight - this.heightIncrement;

                        // make sure not < 400
                        if (newHeight < 400) {
                            return;
                        }

                        this.currentSearchFormHeight = newHeight;
                        topic.publish("neotoma/search/NewFormHeight", newHeight);
                        break;
                }
            },
            hide: function() {
                this.inherited(arguments);

                // create settings object
                var settings = {
                    defaultSearchForm: "basic",
                    searchFormHeight: this.currentSearchFormHeight
                }
                if (this.rbAdvanced.get("checked")) {
                    settings.defaultSearchForm = "advanced";
                }

                // save settings
                localStorage.setItem("neotomaExplorer", JSON.stringify(settings));
            },
            postCreate: function () {
                this.inherited(arguments);

                //// populate potential sizes
                //this.formHeight.set("store", new Memory(
                //        {
                //            idProperty: "height",
                //            data: [{ height: 400 }, { height: 600 }, {height:800}]
                //        }
                //    )
                //)

                // populate with current values
                var settingsJSON = localStorage.getItem("neotomaExplorer");
                if (settingsJSON !== null) {
                    // parse settings
                    var settings = JSON.parse(settingsJSON);

                    // do form height
                    if (settings.searchFormHeight) {
                        // set in this form
                        this.currentSearchFormHeight = settings.searchFormHeight;

                        // set search form
                        topic.publish("neotoma/search/NewFormHeight", settings.searchFormHeight);
                    } else {
                        this.currentSearchFormHeight = 400;
                    }

                    // do default form
                    if (settings.defaultSearchForm) {
                        if (settings.defaultSearchForm === "advanced") {
                            // set in this form
                            this.rbAdvanced.set("checked", true);

                            // set in search form
                            topic.publish("neotoma/search/SetForm", "advanced");
                        } else {
                            // set in search form
                            topic.publish("neotoma/search/SetForm", "basic");
                        }
                    }
                }

           }
        });
});