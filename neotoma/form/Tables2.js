define(["dojo/_base/declare", "dijit/layout/ContentPane", "dojo/text!./template/tables.html","dijit/registry", "dojo/store/Memory", "dojo/_base/array", "dojo/number", "dijit/form/FilteringSelect", "neotoma/widget/SearchResultsGrid"],
    function (declare, ContentPane, template, registry, Memory, array, number) {
        // define widget
        return declare([ContentPane], {
            searchChanged: function(searchId) {
                try {
                    if (searchId === "") {
                        return;
                    }
                    // get data for search
                    var rec = registry.byId("tableSearches").get("store").get(searchId);

                    // fix ages before displaying
                    array.forEach(rec.sites,
                        function (site) {
                            if (site.maxage != null) {
                                site.ageoldest = site.maxage;
                            }
                            if (site.minage != null) {
                                site.ageyoungest = site.minage;
                            }
                        }
                    );

                    // reformat data for table
                    var tableData = [];
                    var responseData = rec.sites;
                    var newRecord = null;
                    array.forEach(responseData, function (site) {
                        array.forEach(site.datasets, function (dataset) {
                            newRecord = {
                                siteid: site.siteid,
                                sitename: site.sitename,
                                latitude: number.round(site.latitude, 6), // llchange
                                longitude: number.round(site.longitude, 6), // llchange
                                datasetid: dataset.datasetid,
                                datasettype: dataset.datasettype,
                                ageoldest: dataset.ageoldest,
                                ageyoungest: dataset.ageyoungest
                            };

                            // check ages
                            if (dataset.MaxAge != null) {
                                newRecord.ageOodest = dataset.MaxAge;
                            }

                            if (dataset.MinAge != null) {
                                newRecord.ageyoungest = dataset.MinAge;
                            }

                            // add record
                            tableData.push(newRecord);
                        });
                    });

                    // show in grid
                    //var grid = registry.byId("resultsGrid");
                    searchResultsGrid.refresh();
                    //searchResultsGrid.renderArray(tableData);
                    searchResultsGrid.set("store",
                        new Memory({
                            idProperty: "siteid",
                            data: tableData
                        })
                    );
                    searchResultsGrid.resize();
                } catch (e) {
                    alert("Error loading tabular results: " + e.message);
                }
            },
            showGrid: function() {
                // resize grid
                searchResultsGrid.resize();
            },
            postCreate: function () {
                this.inherited(arguments);
                
                this.set("content", template);

                // set onChange handler
                var searchesFS = registry.byId("tableSearches");
                searchesFS.onChange = this.searchChanged;

                // set resize handler
                searchResultsGrid.onShow = this.showGrid;
            }
        });
    });