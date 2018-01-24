define(["dojo/_base/declare", "dijit/layout/StackContainer", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/allSearchResults.html", "dijit/_WidgetsInTemplateMixin", "dojo/store/Memory", "dojo/_base/array", "dojo/_base/lang", "dojo/topic", "neotoma/util/export", "neotoma/widget/AllSearchesGrid", "dijit/layout/BorderContainer", "dijit/form/RadioButton"],
    function (declare, StackContainer, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, Memory, array, lang, topic, exExport) {
        // define widget
        return declare([StackContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            _combineClick: function () {
                try {
                    // make sure at least two are selected
                    var selection = this.allSearchesList.selection;
                    var numSel = 0;
                    for (var searchId in selection) {
                        if (selection[searchId]) {
                            numSel += 1;
                        }
                    }

                    // make sure at least two selected
                    if (numSel < 2) {
                        alert("Please select at least two searches to combine.");
                        return;
                    }

                    // swap actionbars
                    //var actionBar = dijit.registry.byId("searchesActionBar");
                    var actionBar = this.getParent().searchesActionBar;
                    actionBar.set("style", "display:none;");
                    //var cActionBar = dijit.registry.byId("combineActionBar");
                    var cActionBar = this.getParent().combineActionBar;
                    cActionBar.set("style", "display:block;");

                    // show second view
                    this.forward();
                    return true;
                } catch (e) {
                    alert("error in AllSearchResults._combineClick(): " + e.message);
                }
                
            },
            _cancelCombineSearches: function () {
                try {
                    // swap actionbars
                    var cActionBar = this.getParent().combineActionBar;
                    cActionBar.set("style", "display:none;");
                    var actionBar = this.getParent().searchesActionBar;
                    actionBar.set("style", "display:block;");

                    // show list
                    this.back();
                } catch (e) {
                    alert("error in AllSearchResults._cancelCombineSearches(): " + e.message);
                }

            },
            _combineSearches: function () {
                try {
                    // get search name
                    var searchName = this.searchName.get("value");
                    if (searchName === "") {
                        alert("Please enter a search name.");
                        return;
                    }

                    // get operator
                    var rbOR = this.rbOR.get("value");
                    var operator = "AND";
                    if (rbOR) {
                        operator = "OR";
                    }

                    // get sites for selected searches
                    var sites = [];
                    var selection = this.allSearchesList.selection;
                    var thisSitesArray = null;
                    //var shortestArray = null;
                    var allSearchesStore = this.allSearchesList.get("store");
                    for (var searchId in selection) {
                        if (selection[searchId]) {
                            thisSitesArray = allSearchesStore.get(searchId).sites;
                            //if (shortestArray === null) {
                            //    shortestArray = thisSitesArray;
                            //} else {
                            //    if (thisSitesArray.length < shortestArray.length) {
                            //        shortestArray = thisSitesArray;
                            //    }
                            //}
                            sites.push(thisSitesArray);
                        }
                    }

                    // make sure at least two selected
                    if (sites.length < 2) {
                        alert("Please select at least two searches to combine.");
                        // swap actionbars
                        var cActionBar = this.getParent().combineActionBar;
                        cActionBar.set("style", "display:none;");
                        var actionBar = this.getParent().searchesActionBar;
                        actionBar.set("style", "display:block;");

                        this.back();
                        return;
                    }

                    // combine
                    switch (operator) {
                        case "AND":
                            var searchSites = [];
                            var numSiteArrays = sites.length;
                            var combinedStore = new Memory({
                                data: lang.clone(sites[0]),
                                idProperty: "SiteID"
                            }
                            );

                            var removeIds = [];
                            var combinedRec = null;
                            var newRec = null;
                            for (var i = 1; i < numSiteArrays; i++) {
                                // create a store with this search's sites
                                var newStore = new Memory({
                                    data: lang.clone(sites[i]),
                                    idProperty: "SiteID"
                                }
                                );

                                // loop through records in combined store and look in new store. add to remove ids if not found
                                removeIds = [];
                                array.forEach(combinedStore.data,
                                    function (combinedRec) {
                                        // get the record for the search being added
                                        newRec = newStore.get(combinedRec.SiteID);
                                        // see if should be kept. If kept, make sure and new datasets are added
                                        if (newRec == null) {
                                            removeIds.push(combinedRec.SiteID);
                                        }
                                        else { // make sure datasets are merged
                                            lang.mixin(combinedRec.Datasets, newRec.Datasets);
                                        }
                                    }
                                );

                                // remove records
                                array.forEach(removeIds, function (id, i) {
                                    combinedStore.remove(id);
                                });
                            }
                            break;
                        case "OR":
                            var searchSites = [];
                            var numSiteArrays = sites.length;
                            var combinedStore = new Memory({
                                data: lang.clone(sites[0]),
                                idProperty: "SiteID"
                            }
                            );

                            var addObjects = [];
                            var combinedRec = null;
                            var newStore = null;

                            // remove first search because already in combinedStore
                            sites = sites.slice(1, sites.length);

                            // add each search
                            array.forEach(sites,
                                function (site) {
                                    // create a store with the next search's sites
                                    newStore = new Memory({
                                        data: lang.clone(site),
                                        idProperty: "SiteID"
                                    });

                                    // loop through records in new store and look in combined store.
                                    array.forEach(newStore.data,
                                        function (newRec) {
                                            combinedRec = combinedStore.get(newRec.SiteID);
                                            if (combinedRec == null) { // add to combined store
                                                combinedStore.put(lang.clone(newRec));
                                            } else { // update datasets in combined store
                                                lang.mixin(combinedRec, newRec);
                                            }
                                        }
                                    );
                                }
                            );

                            break;
                    }

                    // make sure at least one found
                    if (combinedStore.data.length === 0) {
                        alert("No combined sites found.");
                        return;
                    }

                    // swap actionbars
                    this.getParent().combineActionBar.set("style", "display:none;");
                    this.getParent().searchesActionBar.set("style", "display:block;");

                    // show searches list
                    this.back();

                    // create new search result from combined results
                    topic.publish("neotoma/search/NewResult", {
                        data: combinedStore.data,
                        searchName: searchName,
                        request: {type:"combined"}
                    });
                } catch (e) {
                    alert("error in AllSearchResults._combineSearches: " + e.message);
                }
               
            },
            _removeAll: function () {
                // delete each search
                var store = this.allSearchesList.get("store");

                // make sure the store is initialized
                if (!store) {
                    alert("There are no searches to remove.");
                    return;
                }

                // publish SearchDeleted topic for each search
                var ids = [];
                array.forEach(store.data, function (search) {
                    ids.push(search.id);
                });
                array.forEach(ids, function (id) {
                    topic.publish("neotoma/search/SearchDeleted", id);
                });
            },
            _saveAllSelected: function () {
                this.allSearchesList.saveAll();
            }
        });
    });