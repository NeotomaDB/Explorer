define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/allSearchResults.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dijit/registry","dojo/dom-geometry", "dijit/layout/ContentPane", "dijit/Toolbar", "dijit/form/Button", "neotoma/form/AllSearchResults"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, registry, domGeometry) {
        // define widget
        return declare([Dialog,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            searchesActionBarClick: function (evt) {
                try {
                    switch (evt.currentTarget.name) {
                        case "animate":
                            // open SearchAnimation dialog
                            require(["neotoma/dialog/SearchAnimation"],
                                lang.hitch(this,function (SearchAnimation) {
                                    // see if need to create
                                    var dlg = registry.byId("searchAnimationDialog");
                                    if (dlg == null) {
                                        dlg = new SearchAnimation({ id: "searchAnimationDialog", title: "Animate Search Results", "class": "myDialogs nonModal" });
                                        dlg.startup();
                                        // set initial position
                                        //var mapNode = registry.byId("mapPane").domNode;
                                        //var mapPosition = domGeometry.position(mapNode);
                                        //dlg.set("_top", mapPosition.y + 20);
                                        dlg.set("_top", 45);
                                        dlg.set("_left", 30);
                                    }

                                    // make sure at least one search is selected
                                    // todo: filter out and search result that can't be animated
                                    var selection = this.allSearchResults.allSearchesList.selection;
                                    var ids = [];
                                    for (var searchId in selection) {
                                        if (selection[searchId]) {
                                            ids.push(searchId);
                                        }
                                    }

                                    if (ids.length < 1) {
                                        alert("Please select at least one search to animate.");
                                        return;
                                    }

                                    // set searches
                                    dlg.set("searches", ids);

                                    // show
                                    dlg.show();
                                })
                            );
                            break;
                        case "combine":
                            this.allSearchResults._combineClick();
                            break;
                        case "removeAll":
                            this.allSearchResults._removeAll();
                            break;
                        case "saveAll":
                            this.allSearchResults._saveAllSelected();
                            break;
                        default:
                            alert("Unknown button: '" + evt.currentTarget.name + "'");
                            return;
                            break;
                    }
                } catch (e) {
                    alert("Error in searchesActionBarClick: " + e.message);
                }
            },
            combineActionBarClick: function (evt) {
                try {
                    switch (evt.currentTarget.name) {
                        case "ok":
                            this.allSearchResults._combineSearches();
                            break;
                        case "back":
                            this.allSearchResults._cancelCombineSearches();
                            break;
                        default:
                            alert("Unknown button: '" + evt.currentTarget.name + "'");
                            return;
                            break;
                    }
                } catch (e) {
                    alert("Error in combineActionBarClick: " + e.message);
                }
            },
            cancelClick: function () {
                try {
                    this.hide();
                } catch (e) {
                    alert("Error in cancel click: " + e.message);
                }
            }
        });
});