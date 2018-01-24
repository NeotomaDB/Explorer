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
                            if (site.MaxAge != null) {
                                site.AgeOldest = site.MaxAge;
                            }
                            if (site.MinAge != null) {
                                site.AgeYoungest = site.MinAge;
                            }
                        }
                    );

                    // reformat data for table
                    var tableData = [];
                    var responseData = rec.sites;
                    var newRecord = null;
                    array.forEach(responseData, function (site) {
                        array.forEach(site.Datasets, function (dataset) {
                            newRecord = {
                                SiteID: site.SiteID,
                                SiteName: site.SiteName,
                                Latitude: number.round(site.Latitude, 6), // llchange
                                Longitude: number.round(site.Longitude, 6), // llchange
                                DatasetID: dataset.DatasetID,
                                DatasetType: dataset.DatasetType,
                                AgeOldest: dataset.AgeOldest,
                                AgeYoungest: dataset.AgeYoungest
                            };

                            // check ages
                            if (dataset.MaxAge != null) {
                                newRecord.AgeOldest = dataset.MaxAge;
                            }

                            if (dataset.MinAge != null) {
                                newRecord.AgeYoungest = dataset.MinAge;
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
                            idProperty: "SiteID",
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