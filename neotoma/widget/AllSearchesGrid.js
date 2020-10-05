define(["dojo/_base/declare", "dgrid/OnDemandGrid", "dgrid/Selection", "dgrid/selector", "dojo/store/Memory", "dojo/_base/lang", "dijit/form/Button", "dijit/popup", "dijit/Toolbar", "dijit/TooltipDialog", "dojo/topic", "dijit/registry", "dojo/dom-construct", "dojo/on", "dojo/query", "dojo/dom-style", "dojo/mouse", "dojo/_base/array", "neotoma/util/export", "amagimap/util/misc"],
    function (declare, OnDemandGrid, Selection, selector, Memory, lang, Button, popup, Toolbar, TooltipDialog, topic, registry, domConstruct, on, query, domStyle, mouse, array, exExport, miscUtil) {

        var setSearchSymbology = function (search) {
            // get searchid as string
            var searchId = search.id.toString();
            // find the layer
            var layers = dojo.config.map.getLayersByName(searchId);
            if (layers.length === 0) {
                alert("setSearchSymbology() Can't find layer with searchid: " + searchId);
                return;
            }
            var layer = layers[0];

            // get size
            var markerSize = 5;
            switch (search.symbol.size) {
                case "Small":
                    markerSize = 3;
                    break;
                case "Medium":
                    markerSize = 5;
                    break;
                case "Large":
                    markerSize = 7;
                    break;
            }

            // change layer style
            var styleField = new OpenLayers.Style({ fillColor: "#" + search.symbol.color, fillOpacity: 1.0, strokeColor: "#" + search.symbol.color, strokeWidth: 1, pointRadius: markerSize, graphicName: search.symbol.shape.toLowerCase() });
            var styleSelectedField = new OpenLayers.Style({ fillColor: '#fffc00', fillOpacity: 1.0, strokeColor: '#fffc00', strokeWidth: 3, pointRadius: markerSize });
            layer.styleMap = new OpenLayers.StyleMap({ 'default': styleField, 'select': styleSelectedField });
            layer.redraw();
        };

        var openSearchProperties = function (searchName) {
            require(["neotoma/widget/Dialog", "neotoma/dialog/SearchProperties"],
                function (Dialog, SearchProperties) {
                    try {
                        if (dojo.config.app.forms.searchProperties == null) {
                            //var form = new SearchProperties({ style: "height:270px;" });
                            // create dialog to host form
                            var dlg = new SearchProperties({ id: "searchPropertiesForm", title: "Search Properties", "class": "myDialogs nonModal" });
                            //dlg.addChild(form);

                            // get form now
                            var form = dlg.SearchProperties;

                            // place in page and start
                            dlg.placeAt(dojo.body());
                            dlg.startup();

                            // load properties for selected search
                            var store = dojo.config.app.allSearchResults.allSearchesList.get("store");
                            var queryResult = store.query({ name: searchName });
                            var rec = queryResult[0];
                            form.setSearch(rec);

                            // save to access later
                            dojo.config.app.forms.searchProperties = form;

                            // listen for search properties to change
                            topic.subscribe("neotoma/search/SearchPropertiesChanged", function () {
                                try {
                                    var newProperties = arguments[0];
                                    if (newProperties === null) {
                                        return;
                                    }
                                    // save changes to search store record to update list
                                    dojo.config.app.allSearchResults.allSearchesList.updateSearch(newProperties);
                                    // change map layer symbology
                                    setSearchSymbology(newProperties);
                                } catch (e) {
                                    alert("Error in widget/AllSearchesGrid.openSearchProperties:" + e.message);
                                }
                            });

                            // listen for form to be closed
                            topic.subscribe("neotoma/search/SearchPropertiesClosed", function () {
                                dlg.hide();
                            });

                        } else {
                            var dlg = registry.byId("searchPropertiesForm");
                            // update form
                            var form = dojo.config.app.forms.searchProperties;
                            // load properties for selected search
                            var store = dojo.config.app.allSearchResults.allSearchesList.get("store");
                            var queryResult = store.query({ name: searchName });
                            var rec = queryResult[0];
                            form.setSearch(rec);
                        }
                        // show whether new or already existed
                        dlg.show();
                    } catch (e) {
                        alert("Error in widget/AllSearchesGrid.openSearchProperties(): " + e.message);
                    }
                }
            );
        };

        return declare([OnDemandGrid, Selection, selector], {
            showHeader: false,
            _nextSearchId: 0,
            nextSearchId: function () {
                //var returnId = this._nextSearchId;
                this._nextSearchId += 1;
                return this._nextSearchId - 1;
            },
            nextOrderNumber: function () {
                //var returnId = this._nextSearchId;
                var store = this.get("store");
                if (store == null) {
                    return 0;
                } else {
                    return this.get("store").data.length;
                }
                
            },
            selectionMode: "none",
            deselectOnRefresh: false,
            columns: {
                selCol: selector({ label: "Select" }), // name column (selCol) whatever wanted. Then use when specifying style(width)
                id: {
                    label: "ID",
                    renderCell: function (row, value, node, options) {
                        return domConstruct.create("button", {
                            type: 'button',
                            name: row.name,
                            id: row.id,
                            style: 'cursor:pointer;background-color:#' + row.symbol.color + ';width:18px;height:18px;margin:0px;border:none;vertical-align:middle;',
                            click: function (evt) {
                                try {
                                    var event = require("dojo/_base/event");
                                    event.stop(evt);
                                    openSearchProperties(evt.currentTarget.name);
                                } catch (e) {
                                    alert("Error in widget/AllSearchesGrid.cellClick: " + e.message);
                                }
                            }
                        });
                    }
                },
                name: {
                    label: "Name",
                    renderCell: function (row, value, node, options) {
                        var cellDiv = domConstruct.create("div",
                            {
                                "class": "mini"
                            }
                        );

                        // add span for search name
                        var buttonsDiv = domConstruct.create("span",
                           {
                               title: "Site count: " + row.numSites + " Dataset count: " + row.numDatasets,
                               innerHTML: row.name
                           },
                           cellDiv
                       );

                        // add div to contain buttons
                        var buttonsDiv = domConstruct.create("div",
                            {
                                style: "display:none;float:right;"
                            },
                            cellDiv
                        );

                        // add up button
                        domConstruct.create("button", {
                            type: "button",
                            title: "Move Search Result Up",
                            "class": "dsUp",
                            name: "up",
                            click: function () {
                                dojo.config.app.allSearchResults.allSearchesList.moveSearchUp(row.id);
                            }
                        }, buttonsDiv);

                        // add down button
                        domConstruct.create("button", {
                            type: "button",
                            title: "Move Search Result Down",
                            "class": "dsDown",
                            name: "down",
                            click: function() {
                                dojo.config.app.allSearchResults.allSearchesList.moveSearchDown(row.id);
                            }
                                
                        }, buttonsDiv);

                        // add datasets to tray button
                        domConstruct.create("button", {
                            type: "button",
                            title: "Add Datasets to Tray",
                            "class": "dsAdd",
                            name: "add",
                            click: function () {
                                dojo.config.app.allSearchResults.allSearchesList.addAllToTray(row.id);
                            }
                        }, buttonsDiv);

                        // add buttons
                        domConstruct.create("button", {
                            type: "button",
                            title: "Save search",
                            "class": "dsSave",
                            name: "save",
                            click: function () {
                                dojo.config.app.allSearchResults.allSearchesList.saveSearch(row.id);
                            }
                        }, buttonsDiv);

                        // add buttons
                        domConstruct.create("button", {
                            type: "button",
                            title: "Remove search",
                            "class": "dsRemove",
                            name: "remove",
                            click: function () {
                                dojo.config.app.allSearchResults.allSearchesList.deleteSearchClick(row.id);
                            }
                        }, buttonsDiv);


                        // add event handlers
                        on(cellDiv, mouse.enter,lang.hitch(cellDiv,
                            function (evt) {
                                // show toolbar
                                var toolbar = query("div", this)[0];
                                if (toolbar) {
                                    domStyle.set(toolbar, {
                                        display: "block"
                                    });
                                }
                            }
                        ));

                         on(cellDiv, mouse.leave, lang.hitch(cellDiv,
                            function (evt) {
                                // hide toolbar
                                var toolbar = query("div", this)[0];
                                if (toolbar) {
                                    domStyle.set(toolbar, {
                                        display: "none"
                                    });
                                }
                            }
                        ));

                        return cellDiv;
                    }
                } // end of name
            },
            searchClick: function (evt) {
                try {
                    var event = require("dojo/_base/event");
                    event.stop(evt);
                    openSearchProperties(evt.currentTarget.name);
                } catch (e) {
                    alert("Error in widget/AllSearchesGrid.searchClick: " + e.message);
                }
            },
            deleteSearchClick: function (searchId) {
                try {
                    // publish topic
                    topic.publish("neotoma/search/SearchDeleted", searchId);
                } catch (e) {
                    alert("Error in widget/AllSearchesGrid.deleteSearckClick: " + e.message);
                }
            },
            //logSearchOrders: function (allSearches) {
            //    var showData = [];
            //    array.forEach(allSearches,
            //        function (search) {
            //            showData.push({name: search.name, order:search.order});
            //        }
            //    );
            //    console.log(JSON.stringify(showData));
            //},
            addSearch: function (rec) {
                var store = this.get("store");
                //if (store !== null) {
                //    this.logSearchOrders(store.data);
                //}
               
                // add id to record
                rec.id = this.nextSearchId();
                rec.order = this.nextOrderNumber();
                if (store == null) {
                    store = new Memory({
                        idProperty: "id",
                        data: [rec]
                    });
                    this.set("store", store);
                } else {
                    // add record
                    store.add(rec);
                }
                //this.logSearchOrders(store.data);
                // refresh list
                this.refresh();

                // sort so newest on top like the map
                this.set("sort", "order", true);

                // select new row by default because on in map by default
                this.select(rec);

                // publish topic to update table search filtering select
                topic.publish("neotoma/search/NewTable", rec);

                // return id
                return this._nextSearchId - 1;
            },
            removeSearch: function (searchId) {
                // get searches store
                var store = this.get("store");

                // remove record
                store.remove(searchId);

                // remove from selection
                delete this.selection[searchId];
                
                // refresh
                this.refresh();

                // get data in sorted order
                var recOrders = {};
                var sortedRecs = [];
                var numRecs = store.data.length;
                array.forEach(store.data,
                    function (rec) {
                        recOrders[rec.order] = rec;
                    }
                );
                for (var i = 0; i <= numRecs; i++) {
                    if (recOrders.hasOwnProperty(i)) {
                        sortedRecs.push(recOrders[i]);
                    }
                }
                
                // update order
                var order = 0;
                array.forEach(sortedRecs,
                    function(rec) {
                        rec.order = order;
                        order += 1;
                    }
                );

                // update sort
                this.set("sort", "order", true);
                this.refresh();
            },
            updateSearch: function (searchObj) {
                try {
                    var store = this.get("store");
                    // update search
                    store.put(searchObj);
                    // refresh list
                    this.refresh();
                } catch (e) {
                    alert("Error in widget/AllSearchesGrid.updateSearch: " + e.message);
                }
            },
            moveSearchUp: function(searchId) {
                var store = this.get("store");

                // get current order
                var thisSearch = store.get(searchId);
                var thisOrder = thisSearch.order;

                // get search immediately above
                var aboveResult = store.query({ order: thisOrder + 1 });
                var aboveSearch = aboveResult[0];
                if (!aboveSearch) {
                    alert("This layer can't be moved up.");

                    return;
                }
                var aboveOrder = aboveSearch.order;

                // switch order
                aboveSearch.order = thisOrder;
                thisSearch.order = aboveOrder;
                this.set("sort", "order", true);

                // get map layer
                var layers = dojo.config.map.getLayersByName(searchId);
                if (layers.length === 0) {
                    alert("Can't find layer with searchid: " + searchId);
                    return;
                }

                //// log layer info before change index
                //var myLayers = [];
                //var index = 0;
                //array.forEach(dojo.config.map.layers,
                //    function (layer) {
                //        myLayers.push(
                //            {
                //                name: layer.name,
                //                index: index
                //            }
                //        );
                //        index += 1;

                //        // log infor about selectfeaure containers
                //        if (layer.name.indexOf("OpenLayers.Control.SelectFeature_") !== -1) {
                //            console.log(layer);
                //        }
                //    }
                //);

                // see how many layers to move up
                var numToMove = this.getNewLayerIndexDifference(searchId, "up");
                if (numToMove === false) {
                    alert("Couldn't figure out how many layers to move up.");
                    return false;
                }

                // move layer up
                dojo.config.map.raiseLayer(layers[0], numToMove);

                //// log layers aftewards
                //myLayers = [];
                //index = 0;
                //array.forEach(dojo.config.map.layers,
                //    function (layer) {
                //        myLayers.push(
                //            {
                //                name: layer.name,
                //                index: index
                //            }
                //        );
                //        index += 1;
                //    }
                //);
                //console.log(JSON.stringify(myLayers));
            },
            moveSearchDown: function (searchId) {
                var store = this.get("store");

                // get current order
                var thisSearch = store.get(searchId);
                var thisOrder = thisSearch.order;

                // get search immediately below
                var belowResult = store.query({ order: thisOrder - 1 });
                var belowSearch = belowResult[0];
                if (!belowSearch) {
                    alert("This layer can't be moved down.");
                    return;
                }
                var belowOrder = belowSearch.order;

                // switch order
                belowSearch.order = thisOrder;
                thisSearch.order = belowOrder;
                this.set("sort", "order", true);

                // get map layer
                var layers = dojo.config.map.getLayersByName(searchId);
                if (layers.length === 0) {
                    alert("Can't find layer with searchid: " + searchId);
                    return;
                }

                // see how many layers to move down
                var numToMove = this.getNewLayerIndexDifference(searchId, "down");
                if (numToMove === false) {
                    alert("Couldn't figure out how many layers to move down.");
                    return false;
                }

                // move layer down
                dojo.config.map.raiseLayer(layers[0], numToMove);
            },
            getNewLayerIndexDifference: function(layerName,direction) {
                // get the map layers
                var allLayers = dojo.config.map.layers;

                // get index of this layer
                var currentLayerIndex = -1;
                var i = 0;
                array.some(allLayers,
                    function (layer) {
                        if (layer.name === layerName.toString()) {
                            currentLayerIndex = i;
                            return true;
                        }
                        i += 1;
                    }
                );
                if (currentLayerIndex === -1) {
                    alert("Can't find index for layer: " + layerName);
                    return false;
                }

                // look for the index of the next layer with a numeric name in the correct direction
                var nextLayerIndex = -1;
                var tryIndex = currentLayerIndex;
                var nextLayer = null;
                switch (direction) {
                    case "up":
                        while (nextLayerIndex === -1) {
                            tryIndex += 1;
                            nextLayer = allLayers[tryIndex];
                            if (nextLayer == null) {
                                return false;
                            }
                            if (miscUtil.isNumeric(nextLayer.name)) {
                                nextLayerIndex = tryIndex;
                            }
                        }
                        break;
                    case "down":
                        while (nextLayerIndex === -1) {
                            tryIndex -= 1;
                            nextLayer = allLayers[tryIndex];
                            if (nextLayer == null) {
                                return false;
                            }
                            if (miscUtil.isNumeric(nextLayer.name)) {
                                nextLayerIndex = tryIndex;
                            }
                        }
                        break;
                    default:
                        alert("Unknown direction to move layer: " + direction);
                        return false;
                        break;
                }
                if (nextLayerIndex === -1) {
                    alert("Can't find nextLayerIndex " + direction + " for layer: " + layerName);
                    return false;
                }

                // return next index for layer in correct direction
                return nextLayerIndex - currentLayerIndex;
            },
            addAllToTray: function (searchId) {
                var store = this.get("store");
                var search = store.get(searchId);

                // make sure not too many datasets
                var maxDatasets = 100;
                var numDatasets = 0;
                array.forEach(search.sites,
                    function (site) {
                        numDatasets += site.datasets.length;
                    }
                );
                if (numDatasets > maxDatasets) {
                    alert("This search contains " + numDatasets + " datasets. The most you can add automatically is " + maxDatasets + ".");
                    return;
                };

                //alert("# sites: " + search.sites.length);
                array.forEach(search.sites,
                    function (site) {
                        array.forEach(site.datasets,
                            function (dataset) {
                                // add site to dataset if needed
                                if (!dataset.hasOwnProperty("site")) {
                                    dataset["site"] = {
                                        SiteID: site.siteid,
                                        SiteName: site.sitename,
                                        SiteDescription: site.sitedescription,
                                        Latitude: site.latitude, // llchange
                                        Longitude: site.longitude // llchange
                                    };
                                }
                                topic.publish("explorer/dataset/AddToTray", dataset, false);
                            }
                        );
                    }
                );
            },
            saveAll: function() {
                var store = this.get("store");
                
                // save search
                //exExport.save(store.data, search.name.replace(" ", "_") + ".json");
                exExport.save(store.data, "allSearches.json");
            },
            saveSearch: function (id) {
                //var store = this.get("store");
                //var selection = this.selection;
                //var foundASearch = false;
                //// save each selected search
                //for (var searchId in selection) {
                //    if (selection[searchId]) {
                //        foundASearch = true;
                //        var search = store.get(searchId);
                //        // save search
                //        exExport.save(search, search.name.replace(" ", "_") + ".json");
                //    }
                //}
                //// see if a search was found
                //if (!foundASearch) {
                //    alert("Please select at least one search");
                //    return;
                //}

                var store = this.get("store");
                var search = store.get(id);
                if (!search) {
                    alert("No search found with id: " + id);
                    return;
                }
                // save search
                exExport.save(search, search.name.replace(" ", "_") + ".json");

            },
            postCreate: function () {
                this.inherited(arguments);

                // handle select event
                on(this, "dgrid-select",
                    function (evt) {
                        array.forEach(evt.rows,
                         function (row) {
                             topic.publish("neotoma/search/SearchVisibilityChanged", row.data.id, true);
                         }
                     );
                    }
                );

                on(this, "dgrid-deselect",
                   function (evt) {
                       array.forEach(evt.rows,
                           function (row) {
                               topic.publish("neotoma/search/SearchVisibilityChanged", row.data.id, false);
                           }
                       );
                   }
               );
            }
        });
    }
);