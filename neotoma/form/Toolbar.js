define(["dojo/_base/declare", "dijit/Toolbar", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
 "dojo/text!./template/toolbar.html", "dojo/_base/lang", "dojo/topic", "dojo/_base/array",
  "dijit/registry", "dojo/dom-class", "dojo/dom-geometry", "dojo/request/script", "dojo/dom-construct",
   "neotoma/util/export", "neotoma/app/neotoma", "dojo/on", "dojo/_base/config", "dijit/popup",
    "dojo/has","dojo/request/xhr", "dijit/form/Button", "dijit/Toolbar", "neotoma/widget/BaseLayerButton",
     "neotoma/form/UserSettings", "neotoma/form/Tokens", "dijit/form/DropDownButton", "dijit/TooltipDialog"],
    function (declare, Toolbar, _TemplatedMixin, _WidgetsInTemplateMixin,
     template, lang, topic, array,
      registry, domClass, domGeometry, script, domConstruct,
       exExport, neotoma, on, config, popup,
        has, xhr) {
        // define function for when modern range loads
        var modernRangeLoaded = function (response) {
            try {
                // first, extract geom in well known text (wkt) format
                var wkt = response.data[0].geom.slice(10);
                // definte wkt and geojson formaters
                var wktFormat = new ol.format.WKT();
                var geoJSONFormat = new ol.format.GeoJSON();
                // read geom
                var geom = wktFormat.readFeature(wkt);
                // write geojson
                var geoJSON = geoJSONFormat.writeFeatureObject(geom);
                // integrate properties object with sciname field
                geoJSON.properties = {};
                geoJSON.properties.sciname = response.data[0].sciname[0];
                // define range features
                var features = geoJSONFormat.readFeatures(geoJSON, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: dojo.config.map.getView().getProjection()
                });

                // make sure layer is on map. If it is already, remove all features before loading new ones
                var modernRangeSource = new ol.source.Vector({});
                // define layer style
                var modernRangeStyle = new ol.style.Style({
                  stroke: new ol.style.Stroke({
                    color: 'red',
                    width: 1
                  }),
                  fill: new ol.style.Fill({
                    color: 'rgba(203, 24, 29, 0.1)'
                  })
                });
                
                dojo.config.map.getLayers().forEach(function (layer) {
                  if (layer.get("id") == "ModernRange") {
                    layer.getSource().clear();
                    dojo.config.map.removeLayer(layer);
                  } else {
                    var modernRangeLayer = new ol.layer.Vector({
                      source: modernRangeSource,
                      style: modernRangeStyle,
                      properties: {
                        id: "ModernRange"
                      }
                    });
                    dojo.config.map.addLayer(modernRangeLayer);
                  }
                });

                // add new range
                modernRangeSource.addFeatures(features);
                var modernRangeLayerExtent = modernRangeSource.getExtent();
                dojo.config.map.getView().fit(modernRangeLayerExtent, { duration: 1000 });
                //modernRangeStandby.hide();

                // make sure checkbox is checked.
                this.display.set("checked", true);
            } catch (e) {
                alert("Error in form/Toolbar.modernRangeLoaded: " + e.message);
            }
        };

        var removeLayer = function (searchId) {
            try {
              dojo.config.map.getLayers().forEach(function (layer) {
                if (layer.get("id") == searchId) {
                  dojo.config.map.removeLayer(layer);
                }
              });
            } catch (e) {
                if ((e.message.indexOf("this.div.style") === -1) && (e.message !== "this.div is null") && (e.message.indexOf("property 'style'") === -1)) {
                    alert("Error in form/Toolbar.removeLayer: " + e.message);
                }
            }
        };

        // define widget
        return declare([Toolbar, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            toolbarClick: function (evt) {
                //console.log("evt.currentTarget.name: " + evt.currentTarget.name);
                switch (evt.currentTarget.name) {
                    case "toolbar.showTime":
                        this.openShowTime();
                        break;
                    case "toolbar.search":
                        this.openUserSearches();
                        break;
                    case "toolbar.searchNew":
                        this.openSearchNew();
                        break;
                    case "toolbar.spatialSearch":
                        this.openSpatialSearch();
                        break;
                    case "toolbar.searchesList":
                        this.openSearchResults();
                        break;
                    case "toolbar.datasetTray":
                        this.openDatasetTray();
                        break;
                    case "toolbar.modernRanges":
                        this.openModernRanges();
                        break;
                    case "toolbar.glacial":
                        this.openGlacial();
                        break;
                    case "toolbar.table":
                        this.toggleMapAndTable("table");
                        break;
                    case "toolbar.map":
                        this.toggleMapAndTable("mapPane");
                        break;
                    case "toolbar.about":
                        this.closeAllDialogs();
                        registry.byId("aboutView").show();
                        break;
                    //case "toolbar.settings":
                    //    this.openUserSettings();
                    //    break;
                }
            },
            openGlacial: function (hide) {
                require(["neotoma/dialog/Glacial"],
                    lang.hitch(this, function (Glacial) {
                        try {
                            if (!hide) { //  if hide = true am just initialializing for, not showing it. So don't need to hide others.
                                // close all dialogs
                                this.closeAllDialogs();
                            }

                            // see if need to create
                            var dlg = registry.byId("glacialLayerDialog");
                            if (dlg == null) {
                                dlg = new Glacial({ id: "glacialLayerDialog", title: "Ice Sheets", "class": "myDialogs nonModal" });
                                dlg.startup();
                                // position
                                var mapNode = registry.byId("mapPane").domNode;
                                var mapPosition = domGeometry.position(mapNode);
                                dlg.set("_top", mapPosition.y + 10);
                                dlg.set("_left", 10);
                            }

                            // show if needed
                            if (!hide) {
                                dlg.show();
                            }
                        } catch (e) {
                            alert("Error in form/Toolbar.openGlacial: " + e.message);
                        }
                    })
                );
            },
            openUserSettings: function (hide) {
                require(["neotoma/dialog/UserSettings"],
                    lang.hitch(this, function (UserSettings) {
                        try {
                            if (!hide) { //  if hide = true am just initialializing for, not showing it. So don't need to hide others.
                                // close all dialogs
                                this.closeAllDialogs();
                            }

                            // see if need to create
                            var dlg = registry.byId("userSettingsDialog");
                            if (dlg == null) {
                                dlg = new UserSettings({ id: "userSettingsDialog", title: "Preferences", "class": "myDialogs nonModal" });
                                dlg.startup();
                                // position
                                var mapNode = registry.byId("mapPane").domNode;
                                var mapPosition = domGeometry.position(mapNode);
                                dlg.set("_top", mapPosition.y + 10);
                                dlg.set("_left", 10);
                            }

                            // show if needed
                            if (!hide) {
                                dlg.show();
                            }
                        } catch (e) {
                            alert("Error in form/Toolbar.openUserSettings: " + e.message);
                        }
                    })
                );
            },
            openDatasetTray: function (hide) {
                require(["neotoma/dialog/DatasetTray"],
                    lang.hitch(this,function (DatasetTray) {
                        try {
                            if (!hide) { //  if hide = true am just initialializing for, not showing it. So don't need to hide others.
                                // close all dialogs
                                this.closeAllDialogs();
                            }
                
                            // see if need to create
                            var dlg = registry.byId("datasetTrayDialog");
                            if (dlg == null) {
                                dlg = new DatasetTray({ id: "datasetTrayDialog", title: "Datasets", "class": "myDialogs nonModal" });
                                dlg.startup();
                                dojo.config.app.datasetTrayForm = dlg.datasetTrayForm;
                            }

                            // show if needed
                            if (!hide) {
                                dlg.show();
                            }
                        } catch (e) {
                            alert("Error in form/Toolbar.OpenDatasetTray: " + e.message);
                        }
                    })
                );
            },
            openSearchNew: function (hide) {
                require(["neotoma/search/All"],
                    lang.hitch(this,function (All) {
                        try {
                            if (!hide) { //  if hide = true am just initializing for, not showing it. So don't need to hide others.
                                // close all dialogs
                                this.closeAllDialogs();
                            }

                            // create if needed
                            if (dojo.config.app.userSearchesNew == null) {
                                // create dialog
                                dojo.config.app.userSearchesNew = new All({ id: "userSearchesNewForm", title: "Search", class: "myDialogs nonModal" });

                                // start
                                dojo.config.app.userSearchesNew.startup();

                                // set initial position
                                var mapNode = registry.byId("mapPane").domNode;
                                var mapPosition = domGeometry.position(mapNode);
                                dojo.config.app.userSearchesNew.set("_top", mapPosition.y + 20);
                                dojo.config.app.userSearchesNew.set("_left", mapPosition.w - 460);  //TODO: remove hardcoded dialog width
                            }

                            // show if needed
                            if (!hide) {
                                dojo.config.app.userSearchesNew.show();
                            }
                        } catch (e) {
                            alert("error in form/Toolbar.openSearchesNew: " + e.message);
                        }
                    })
                );
            },
            openSearchResults: function (hide) {
                require(["neotoma/dialog/AllSearchResultsDialog"],
                    lang.hitch(this,function (AllSearchResultsDialog) {
                        try {
                            if (!hide) { //  if hide = true am just initialializing for, not showing it. So don't need to hide others.
                                // close all dialogs
                                this.closeAllDialogs();
                            }
                            var dlg = registry.byId("allSearchResultsForm");

                            if (dlg == null) {
                                // try new dialog
                                //dlg = new AllSearchResultsDialog({ id: "allSearchResultsForm", title: "Current Searches", style: "margin:0px;padding:0px;border-radius:5px 5px 8px 8px;" });
                                dlg = new AllSearchResultsDialog({ id: "allSearchResultsForm", title: "Current Searches", "class":"myDialogs nonModal"});
                                dojo.config.app.allSearchResults = dlg.allSearchResults;

                                // listen for a search to be turned on/off on the map
                            
                                topic.subscribe("neotoma/search/SearchVisibilityChanged", function () {
                                    var layerName = arguments[0];
                                    var visible = arguments[1];
                                    dojo.config.map.getLayers().forEach(function (layer) {
                                      if (layer.get("id") == layerName) {
                                        layer.setVisible(visible);
                                      } else {
                                        // alert('No layer named: "' + layerName + '" found on the map.');
                                        // return;
                                      }
                                  });
                                });
                              
                                // listen for a search to be deleted
                                topic.subscribe("neotoma/search/SearchDeleted", function (searchId) {
                                    try {
                                        // remove from searches list
                                        dojo.config.app.allSearchResults.allSearchesList.removeSearch(searchId);

                                        // remove from map
                                        removeLayer(searchId);

                                        // update select control to remove layer
                                        //neotoma.setSelectControl(searchId, true);
                                        //neotoma.updateSelectControl();

                                        // remove from grid if is currently displayed
                                        var tableSearches = registry.byId("tableSearches");
                                        if (tableSearches.get("value") === searchId.toString()) {
                                            // clear grid
                                            searchResultsGrid.set("store", null);
                                            // remove from filtering select
                                            tableSearches.set({
                                                value: "",
                                                displayedValue: ""
                                            });
                                        }

                                        // remove from tableSearches store
                                        tableSearches.get("store").remove(searchId);    
                                    } catch (e) {
                                        alert("Error in form/Toolbar.OpenSearchResults: " + e.message);
                                    }
                                });
                            }
                            if (!hide) {
                                dlg.show();
                            }
                        } catch (e) {
                            alert("Error in form/Toolbar.openSearchResults: " + e.message);
                        }
                    })
                );
            },
            openModernRanges: function () {
                require(["neotoma/widget/Dialog", "neotoma/form/ModernRanges"],
                    function (Dialog, ModernRanges) {
                        try {
                            // create dialog if needed
                            var dlg = registry.byId("modernRangesForm");
                            if (dlg == null) {
                                var form = new ModernRanges();

                                // create dialog to host form
                                var dlg = new Dialog({ id: "modernRangesForm", title: "Modern Ranges", "class": "myDialogs nonModal" });
                                dlg.addChild(form);

                                // place in page and start
                                dlg.placeAt(dojo.body());
                                dlg.startup();

                                // listen for new modern ranges
                                topic.subscribe("neotoma/ModernRange/SpeciesChanged", function () {
                                    var speciesName = arguments[0];
                                    var scope = arguments[1];

                                    // draw on map
                                    //modernRangeStandby.show();
                                    var params = {
                                        sciname: speciesName
                                    };

                                    xhr.get(config.wfsEndPoint,{
                                        handleAs: "json",
                                        headers: {
                                            'content-type': 'application/json'
                                        }, 
                                        query: params 
                                        }).then(lang.hitch(scope, modernRangeLoaded));
                                    //script.get(config.wfsEndPoint, { jsonp: "callback", query: params }).then(lang.hitch(scope, modernRangeLoaded));
                                });

                                // listen for modern ranges to be shown and hidden
                                topic.subscribe("neotoma/ModernRange/DisplayChanged", function () {
                                    var display = arguments[0];
                                    var modernRangeLayer = null;
                                    dojo.config.map.getLayers().forEach(function (layer) {
                                      if (layer.get("id") == "ModernRange") {
                                        modernRangeLayer = layer;
                                        modernRangeLayer.setVisible(display);
                                      }
                                    });
                                });
                            }
                            dlg.show();
                        } catch (e) {
                            alert("Error in form/Toolbar.openModernRanges: " + e.message);
                        }
                    }
                );
            },
            showDatasetExplorer: function (datasetId, datasetType, databaseName, responseWithSite) {
                require(["neotoma/dialog/DatasetExplorer"],
                    function (DatasetExplorer) {
                        try {
                            // see if dialog needs created
                            var dlg = dijit.registry.byId("datasetExplorerPopup");
                            if (dlg == null) {
                                // create a dialog 
                                var dlg = new DatasetExplorer({
                                    title: "Dataset Explorer",
                                    id: "datasetExplorerPopup",
                                    "class": "myDialogs nonModal"
                                });

                                // set dataset
                                dlg.datasetExplorer.loadDataset(datasetId, datasetType, databaseName, responseWithSite);

                                // place in page and start
                                dlg.placeAt(dojo.body());
                                dlg.startup();

                                // add buttonbar
                                var buttonBar = domConstruct.create("div", {
                                    "class":"mini",
                                    style:"position:absolute;top:35px;right:7px;"
                                },
                                    dlg.domNode
                                );
                    
                                // add buttons
                                // save
                                domConstruct.create("button", {
                                    type: "button",
                                    title: "Save dataset as csv file",
                                    "class": "dsSave",
                                    click: function () {
                                        var datasetId = dlg.datasetExplorer.currentDatasetId;
                                        var currentSiteObj = dojo.config.app.forms.sitePopup.sites[dojo.config.app.forms.sitePopup.siteIndex];
                                        var siteId = currentSiteObj.attributes.siteid;
                                        var fileName = "dataset" + datasetId + "_site" + siteId + ".csv";
                                        exExport.save(dlg.datasetExplorer.downloadData(), fileName);
                                    }
                                }, buttonBar);

                                // add to tray
                                domConstruct.create("button", {
                                    type: "button",
                                    "class": "dsAdd",
                                    title: "Add dataset to tray",
                                    click: function () {
                                        var datasetId = dlg.datasetExplorer.currentDatasetId;
                                        // get dataset id
                                        neotoma.addDatasetToTray(datasetId);
                                    }
                                }, buttonBar);

                                // email
                                domConstruct.create("button", {
                                    type: "button",
                                    title: "Email link to dataset",
                                    "class": "dsEmail",
                                    click: function () {
                                        var datasetId = dlg.datasetExplorer.currentDatasetId;
                                        var url = "mailto:?subject=Link%20to%20Neotoma%20dataset%20" + datasetId + "&body=https://apps.neotomadb.org/explorer/?datasetids=" + datasetId;
                                        window.open(url);
                                    }
                                }, buttonBar);

                                // doi or landing page
                                if (datasetType !== "geochronologic") {

                                  domConstruct.create("button", {
                                    type: "button",
                                    title: "Visit DOI page",
                                    "class": "dsDOI",
                                    click: function () {
                                        var datasetDOI = dlg.datasetExplorer._datasetResponse.site.collectionunit.dataset.doi[0];
                                        if (!datasetDOI) {
                                          alert("A DOI does not yet exist for this dataset.");
                                        } else {
                                          var url = "https://doi.org/" + datasetDOI;
                                          window.open(url);
                                        }
                                    }
                                  }, buttonBar);

                                } else if (datasetType === "geochronologic") {

                                  domConstruct.create("button", {
                                    type: "button",
                                    title: "Visit dataset landing page",
                                    "class": "dsLP",
                                    click: function () {
                                      var datasetId = dlg.datasetExplorer.currentDatasetId;
                                      var url = "https://data.neotomadb.org/" + datasetId;
                                      window.open(url);
                                    }
                                  }, buttonBar);
    
                                }

                                // will load data so show busy
                                dlg.datasetExplorer.toggleStandby(true);
                            } else {
                                var dlg = dijit.registry.byId("datasetExplorerPopup");
                                // update the grid if a new dataset id
                                //if (dlg.datasetExplorer.currentDatasetId != datasetId) {
                                    //var currentSiteObj = dojo.config.app.forms.sitePopup.sites[dojo.config.app.forms.sitePopup.siteIndex];
                                    //var site = {
                                    //    SiteID: currentSiteObj.data.SiteID,
                                    //    SiteName: currentSiteObj.data.SiteName,
                                    //    SiteDescription: currentSiteObj.data.SiteDescription,
                                    //    Latitude: currentSiteObj.data.Latitude,
                                    //    Longitude: currentSiteObj.data.Longitude
                                    //};

                                    //dlg.datasetExplorer.loadDataset(datasetId, datasetType, databaseName, site);
                                    dlg.datasetExplorer.loadDataset(datasetId, datasetType, databaseName, responseWithSite);
                                    dlg.datasetExplorer.toggleStandby(true);
                                //}
                            }

                            // show dialog
                            dlg.show();
                        } catch (e) {
                            alert("error in form/Toolbar.showDatasetExplorer: " + e.message);
                        }

                    }
                );
            },
            closeAllDialogs: function () {
                //var dlg = null;
                //var dialogs = ["simpleSearchForm", "modernRangesForm", "allSearchResultsForm", "aboutView", "searchPropertiesForm", "advancedTaxaForm", "userSearchesForm", "datasetExplorerPopup"];
                //array.forEach(dialogs, function (dialogId) {
                //    dlg = registry.byId(dialogId);
                //    if (dlg != null) {
                //        if (dlg.visible) {
                //            //alert("hide: " + dialogId);
                //            dlg.hide();
                //        }
                //    }
                //});
            },
            setBaseLayer: function (evt) {
                console.log(evt);
                alert("evt.currentTarget.name: " + evt.currentTarget.name);
                
                return;
                // var lyrs = dojo.config.map.getLayers(menuItem.get("label"));
                // // make sure a layer was found
                // if (lyrs.length === 0) {
                //     alert("No layer named: '" + menuItem.get("label") + "' was found.");
                //     return;
                // }
                // // set new base layer
                // dojo.config.map.setBaseLayer(lyrs[0]);
            },
            print: function () {
                try {
                    // see whether to print map or table
                    var stack = registry.byId("mapTableStack");
                    switch (stack.selectedChildWidget.get("id")) {
                        case "mapPane":
                            //var win = window.open("print.html", "_blank");
                            //// hide nav control;
                            //dojo.config.map.removeControl(dojo.config.app.navControl);

                           
                            //on(win, "load",
                            //    function () {
                            //        win.initPrint("", lang.clone(registry.byId("mapPane")));
                            //        //// show nav control;
                            //        dojo.config.app.navControl = new OpenLayers.Control.PanZoomBar();
                            //        dojo.config.map.addControl(dojo.config.app.navControl);
                            //    }
                            //);

                            // see if IE
                            if (has("ie") || has("trident")) {
                                alert("Internet Explorer does not support printing the map. Please use Chrome or Firefox if you need to print a map.");
                                return;
                            }

                            // hide nav control;
                            dojo.config.map.removeControl(dojo.config.app.navControl);

                            // cache map
                            window.mapData = lang.clone(registry.byId("mapPane"));

                            // restore nav control
                            dojo.config.map.addControl(dojo.config.app.navControl);

                            // open print page
                            window.open("print.html", "_blank");
                            break;
                        case "table":
                            // get data from current table
                            if (!searchResultsGrid) {
                                alert("There is no table to print.");
                                return;
                            }

                            // create sort object from grid
                            var sort = { sort: searchResultsGrid.get("_sort") };
                            var store = searchResultsGrid.get("store");
                            if (!store) {
                                alert("Please select a table before printing.");
                                return;
                            }

                            // cache data and open print window
                            window.printData = store.query({}, sort);
                            var win = window.open("printTable.html", "_blank");
                           
                            break;
                    }
                } catch (e) {
                    alert("error in form/Toolbar.print: " + e.message);
                }
            },
            toggleMapAndTable: function (showPane) { 
                try {
                    var container = registry.byId("mapTableStack");
                    if (!container.selectedChildWidget) {
                        alert("no widget");
                        return;
                    }
                    var selectedContainerId = container.selectedChildWidget.get("id");
                    if (selectedContainerId.toLowerCase() !== showPane.toLowerCase()) {
                        if (container.forward) {
                            container.forward();
                        }
                    }

                    //// try to get value from table form
                    //if (showPane === "table") {
                    //    console.log(container.selectedChildWidget);
                    //    alert("table testTb value: " + container.selectedChildWidget.testTb.value);
                    //    alert("table testTb value: " + container.selectedChildWidget.testTb.get("value"));
                    //}
                } catch (e) {
                    alert("Error in form/Toolbar.toggleMapAndTable: " + e.message);
                }
            },
            settingsShow: function () {
                //alert("settingsShow");
                this.settingsForm.show();

            },
            settingsHide: function () {
                //alert("settingsHide");
                this.settingsForm.hide();
            },
            settingsCloseClick: function () {
                popup.close(this.settingsTTDialog);
            },
            tokensShow: function () {
                //alert("settingsShow");
                this.settingsForm.show();

            },
            tokensHide: function () {
                //alert("settingsHide");
                this.settingsForm.hide();
            },
            tokensCloseClick: function () {
                popup.close(this.settingsTTDialog);
            }
        });
    });
    