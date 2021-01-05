define(["dojo/request/script", "dojo/_base/lang", "dojo/topic", "dojo/_base/array", "dijit/registry", "dijit/popup", "dojo/_base/config", "dojo/store/Memory", "amagimap/util/misc", "neotoma/util/map"],
    function (script, lang, topic, array, registry, popup, config, Memory, miscUtil, mapUtil) {
        var onSiteSelect = function (site, isMap) {
            require(["neotoma/dialog/SitePopup"],
                function (SitePopup) {
                    try {
                        // see if table is visible don't show popup
                        var stack = registry.byId("mapTableStack");
                        var selectedChild = stack.selectedChildWidget;
                        if (!isMap) { 
                            if (selectedChild.get("id") === "table") {
                                return true; // return true to select feature
                            }
                        }

                        if (site) {
                            // close any popup
                            popup.close();

                            // see if dialog needs created
                            var dlg = registry.byId("sitePopup");
                            if (dlg == null) {
                                // create a dialog 
                                var dlg = new SitePopup({ title: "Site", id: "sitePopup", class: "myDialogs nonModal" });

                                // place in page and start
                                dlg.placeAt(dojo.body());
                                dlg.startup();
                            }

                            // need to see if there are any other sites at the location
                            var thisSiteId = site.attributes.siteid;
                            var sites = [site];
                            var siteGeom = site.geometry;
                            //alert("thisSiteId: " + thisSiteId);
                            array.forEach(site.layer.features, function (feature) {
                                if (thisSiteId !== feature.attributes.siteid) { // see if the same
                                    if (siteGeom.distanceTo(feature.geometry, { edge: false, details: false }) === 0) {
                                        sites.push(feature);
                                        //alert("add site");
                                    }
                                }
                            });

                            // set site(s)
                            dlg.set("sites", sites);

                            // hide other dialogs
                            mainToolbar.closeAllDialogs();

                            // show dialog
                            dlg.show();
                        }
                    } catch (e) {
                        alert("Error in app/neotoma.onSiteSelect: " + e.message + "\n" + e.description);
                    }
                }
            );
        };


        return {
            loadDataset: function (datasetId) { // loads a dataset passed in url
                try {
                    // make request to data/datasets
                    script.get(config.dataServicesLocation + "/datasets/" + datasetId,
                            { jsonp: "callback" }
                        ).then(lang.hitch(this, function (response) {
                            try {
                                if (response.success) {
                                    // make sure data was returned
                                    if (response.data.length === 0) {
                                        alert("No dataset with id = " + datasetId + " was found.");
                                        return;
                                    }

                                    // format into standard response
                                    var obj = response.data[0];
                                    var standardResponse = {
                                        siteid: obj.site.siteid,
                                        sitename: obj.site.sitename,
                                        sitedescription: obj.site.sitedescription,
                                        sitenotes: obj.site.sitenotes,
                                        latitudesouth: obj.site.latitudesouth,
                                        latitudenorth: obj.site.latitudenorth,
                                        longitudewest: obj.site.longitudewest, 
                                        longitudeeast: obj.site.longitudeeast,
                                        latitude: (obj.site.latitudesouth + obj.site.latitudenorth) / 2,
                                        longitude: (obj.site.longitudewest + obj.site.longitudeeast) / 2,
                                        ageoldest: obj.site.ageoldest,
                                        ageyoungest: obj.site.ageyoungest
                                    };
                                    // add the one dataset
                                    standardResponse.datasets = [{
                                        datasetid: obj.datasetid,
                                        //databasename: obj.databasename,
                                        ageyoungest: obj.ageyoungest,
                                        ageoldest: obj.ageoldest,
                                        datasettype: obj.datasettype,
                                        collunithandle: obj.collunithandle,
                                        collunitname: obj.collunitname,
                                        databasename: obj.databasename
                                    }];

                                    // convert response to Explorer Search response
                                    var searchResponse = this.datasetsToExplorerSearchResponse([response.data[0]]);

                                    // publish topic with new response
                                    topic.publish("neotoma/search/NewResult", {
                                        data: searchResponse,
                                        searchName: "datasetid: " + datasetId,
                                        request: { datasetid: datasetId },
                                        symbol: { "color": "ff0000", "shape": "Square", "size": "Large" }
                                    }
                                    );

                                    // load dataset explorer
                                    // mainToolbar.showDatasetExplorer(datasetId, obj.datasettype, obj.databasename, standardResponse);
                                    //showDatasetExplorer(datasetid, obj.datasettype);
                                } else {
                                    alert(response.message);
                                }
                            } catch (e) {
                                alert("Error in app/neotoma.loadDataset:" + e.message);
                            }
                        }
                    ));
                } catch (e) {
                    alert("error in app/neotoma.loadDataset: " + e.message);
                }
            },
            loadDatasets: function (datasetIds) {
                try {
                    // make request to data/datasets
                    script.get(config.dataServicesLocation + "/datasets/?datasetids=" + datasetIds,
                            { jsonp: "callback" }
                        ).then(lang.hitch(this, function (response) {
                            try {
                                if (response.success) {
                                    // make sure data was returned
                                    if (response.data.length === 0) {
                                        alert("No datasets found with ids in " + datasetIds + ".");
                                        return;
                                    }
                                    
                                    // remove duplicate dataset entries from the response 
                                    var result = response.data.reduce((unique, o) => {
                                        if(!unique.some(obj => obj.datasetid === o.datasetid)) {
                                          unique.push(o);
                                        }
                                        return unique;
                                    },[]);

                                    // convert response to Explorer Search response
                                    var searchResponse = this.datasetsToExplorerSearchResponse(result);

                                    // publish topic with new response
                                    topic.publish("neotoma/search/NewResult", {
                                        //data: reformattedSites,
                                        data: searchResponse,
                                        searchName: "DatasetIDs: " + datasetIds,
                                        request: { datasetids: datasetIds },
                                        symbol: { "color": "ff0000", "shape": "Square", "size": "Large" }
                                    }
                                    );
                                } else {
                                    alert(response.message);
                                }
                            } catch (e) {
                                alert("Error in app/neotoma.loadDatasets:" + e.message);
                            }
                        }
                    ));
                } catch (e) {
                    alert("error in app/neotoma.loadDatasets: " + e.message);
                }
            },
            loadSites: function (siteIds) {
                try {
                    // make request to data/datasets
                    script.get(config.dataServicesLocation + "/datasets/?siteids=" + siteIds,
                            { jsonp: "callback" }
                        ).then(lang.hitch(this, function (response) {
                            try {
                                if (response.success) {
                                    // make sure data was returned
                                    if (response.data.length === 0) {
                                        alert("No sites found with ids in " + siteIds + ".");
                                        return;
                                    }

                                    // convert response to Explorer Search response
                                    var searchResponse = this.datasetsToExplorerSearchResponse(response.data);

                                    // publish topic with new response
                                    topic.publish("neotoma/search/NewResult", {
                                        data: searchResponse,
                                        searchName: "SiteIds: " + siteIds,
                                        request: { siteids: siteIds },
                                        symbol: { "color": "ff0000", "shape": "Square", "size": "Large" }
                                    }
                                    );
                                } else {
                                    // success = 0
                                    alert(response.message);
                                }
                            } catch (e) {
                                alert("Error in app/neotoma.loadSites:" + e.message);
                            }
                        }
                    ));
                } catch (e) {
                    alert("error in app/neotoma.loadSites: " + e.message);
                }
            },
            selectedSite: null,
            selectSite: function (siteid) {
                try {
                    // get the search layer
                    var searchId = registry.byId("tableSearches").get("value");
                    var layers = dojo.config.map.getLayersByName(searchId);
                    if (layers.length === 0) {
                        alert("Can't find map layer to select site.");
                        return;
                    }
                    var searchLayer = layers[0];

                    // get site
                    var sites = searchLayer.getFeaturesByAttribute("siteid", siteid);
                    if (sites.length === 0) {
                        alert("Can't find site to select.");
                        return;
                    }
                    var site = sites[0];

                    // get the select control
                    var controls = dojo.config.map.getControlsBy("name", "selectSite");
                    if (controls.length === 0) {
                        alert("Can't select site on map.");
                        return;
                    }
                    var control = controls[0];

                    // clear any current selected site
                    if (control.handlers.feature.lastFeature) {
                        control.unselect(control.handlers.feature.lastFeature);
                        // make the feature handler believe it unselected the feature
                        control.handlers.feature.lastFeature = null;
                    }

                    // select site
                    control.select(site);
                    // make the feature handler believe it selected the feature
                    control.handlers.feature.lastFeature = site;
                } catch (e) {
                    alert("Error in app/neotoma.selectSite: " + e.message);
                } 
            },
            onSiteSelect: function (site, isMap) {
                onSiteSelect(site, isMap);
            },
            loadSitesOnMap: function (data, searchId, symbol) {
                try {
                    // see if any sites
                    var features = [];

                    // make the id a string for the name
                    searchId = searchId.toString();

                    // get markersize
                    var markerSize = 5;
                    switch (symbol.size) {
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
                    
                    // set styles
                    var styleField = new OpenLayers.Style({ fillColor: "#" + symbol.color, fillOpacity: 1.0, strokeColor: "#" + symbol.color, strokeWidth: 1, pointRadius: markerSize, graphicName: symbol.shape.toLowerCase() });
                    //var styleField = new OpenLayers.Style({ fillColor: symbol.color, fillOpacity: 1.0, strokeColor: symbol.color, strokeWidth: 1, pointRadius: markerSize, graphicName: symbol.shape.toLowerCase() });
                    var styleSelectedField = new OpenLayers.Style({ fillColor: '#fffc00', fillOpacity: 1.0, strokeColor: '#fffc00', strokeWidth: 3, pointRadius: markerSize });
                    var styleMapField = new OpenLayers.StyleMap({ 'default': styleField, 'select': styleSelectedField, 'temporary': styleField, 'delete': styleField });
   
                    // create and add layer
                    var layer = new OpenLayers.Layer.Vector(searchId, { visibility: true, styleMap: styleMapField, displayInLayerSwitcher: false });
                    dojo.config.map.addLayers([layer]);

                    // update or create SelectFeature control
                    this.setSelectControl(layer);

                    // clear out existing features
                    layer.destroyFeatures();

                    // add each site to features array
                    var numSites = data.length;
                    for (var i = 0; i < numSites; i++) {
                        var rec = data[i];
                        // make feature and add to features
                        var atts = {
                            siteid: rec.siteid,
                            sitename: rec.sitename,
                            sitedescription: rec.sitedescription,
                            sitenotes: rec.sitenotes,
                            longitude: rec.longitude,
                            latitude: rec.latitude,
                            latitudesouth: rec.latitudesouth,
                            longitudewest: rec.longitudewest,
                            latitudenorth: rec.latitudenorth,
                            longitudeeast: rec.longitudeeast,
                            ageoldest: rec.ageoldest || rec.maxage,
                            ageyoungest: rec.ageyoungest || rec.minage,
                            datasets: rec.datasets
                        };
                        var pt = new OpenLayers.Geometry.Point(rec.longitude, rec.latitude).transform(dojo.config.app.llProj, dojo.config.app.wmProj);
                        //console.log("(x,y): (" + pt.x + "," + pt.y + ")");
                        features.push(new OpenLayers.Feature.Vector(pt, atts));
                    }

                    // add features to layer
                    if (features.length > 0) {
                        layer.addFeatures(features);
                    }
                    return layer;
                } catch (e) {
                    alert("Error in neotoma/app/neotoma.loadSitesOnMap: " + e.message);
                } 
            },
            updateSelectControl: function() {
                var selectLayers = [];
                // get all search layers on map
                for (var i = 0; i < dojo.config.map.getNumLayers() ; i++) {
                    if (dojo.config.map.layers) {
                        var lyr = dojo.config.map.layers[i];
                        // make sure a vector layer with a numeric name
                        if ((lyr.CLASS_NAME === "OpenLayers.Layer.Vector") && (miscUtil.isNumeric(lyr.name))) {
                            if (!lyr.isBaseLayer) {
                                selectLayers.push(lyr);
                            }
                        }
                    }
                }

                dojo.config.app.layersSelectControl.setLayer(selectLayers);
            },
            setSelectControl: function (layer, reset) {
                var selectLayers = [];
                if (dojo.config.app.layersSelectControl) {
                    // get all search layers except the one removing
                    for (var i = 0; i < dojo.config.map.getNumLayers() ; i++) {
                        if (dojo.config.map.layers) {
                            var lyr = dojo.config.map.layers[i];
                            // make sure a vector layer with a numeric name
                            if ((lyr.CLASS_NAME === "OpenLayers.Layer.Vector") && (miscUtil.isNumeric(lyr.name))) {
                                if (reset) {
                                    if ((!lyr.isBaseLayer) && (lyr.name !== layer.name) && (lyr.features.length !== 0)) {
                                        selectLayers.push(lyr);
                                    }
                                } else {
                                    if (!lyr.isBaseLayer) {
                                        selectLayers.push(lyr);
                                    }
                                }
                            }
                        }
                    }

                    // try setting control's layers
                    dojo.config.app.layersSelectControl.setLayer(selectLayers);

                    //// try removing control and creating another
                    //dojo.config.map.removeControl(dojo.config.app.layersSelectControl);
                    //dojo.config.app.layersSelectControl = null;

                    //// remove all SelectFeature controls from map
                    //mapUtil.removeAllSelectFeatureControls(dojo.config.map);
                    ////mapUtil.removeSelectFeatureContainerLayers(dojo.config.map);

                    //// create new control
                    //if (selectLayers.length > 0) {
                    //    var selectControl = new OpenLayers.Control.SelectFeature(selectLayers, {
                    //        autoActivate: true,
                    //        onSelect: onSiteSelect,
                    //        name: "selectSite",
                    //        hover: false
                    //    });
                    //    dojo.config.map.addControl(selectControl);
                    //    // store control to reuse
                    //    dojo.config.app.layersSelectControl = selectControl;
                    //}
                } else { // need to create
                    if (layer != null) {
                        var selectControl = new OpenLayers.Control.SelectFeature(layer, {
                            autoActivate: true,
                            onSelect: onSiteSelect,
                            name: "selectSite",
                            hover: false
                        });
                        dojo.config.map.addControl(selectControl);
                        // store control to reuse
                        dojo.config.app.layersSelectControl = selectControl;
                    }
                }
            },
            addAllToTray: function () {
                try {
                    array.forEach(dojo.config.app.forms.sitePopup.siteDatasetsGrid.get("store").data,
                        lang.hitch(this,function (dataset) {
                            this.addDatasetToTray(dataset.datasetid);
                        })
                    );
                    //alert("All datasets added to tray");
                } catch (e) {
                    alert("error in app/neotoma.addAllToTray: " + e.message);
                }
            },
            addDatasetToTray: function (datasetId, suppressMessages) {
                // make sure dataset tray exists
                // todo: get rid of this. Open from subscriber if not already open
                if (!dojo.config.app.datasetTrayForm) {
                    alert("Can't open dataset tray.");
                    return;
                }

                var store = dojo.config.app.forms.sitePopup.siteDatasetsGrid.get("store");
                var dataset = store.get(datasetId);
                if (!dataset) {
                    alert("Can't find dataset with id: " + datasetId);
                    return;
                }

                // add site
                dataset.site = dojo.config.app.forms.sitePopup.siteDatasetsGrid.site;

                // publish a topic to insert into datasets store. 
                topic.publish("explorer/dataset/AddToTray", dataset, suppressMessages);
            },

            subscribeToTopics: function () {
                // listen for rows in search tables to be selected
                topic.subscribe("neotoma/searchTable/RowSelected",
                    lang.hitch(this, function (row) {
                        this.selectSite(row.data.siteid);
                    })
                );

                // listen for new searches to update table filtering select
                topic.subscribe("neotoma/search/NewTable",
                    function (rec) {
                        //alert("rec logged to console");
                        var tableSearch = registry.byId("tableSearches");
                        var store = tableSearch.get("store");
                        if (store == null) {
                            store = new Memory({
                                idProperty: "id",
                                data: [rec]
                            });
                            tableSearch.set("store", store);
                        } else {
                            // add record
                            store.add(rec);
                        }
                    }
                );

                // listen for searches to be edited
                topic.subscribe("neotoma/search/SearchPropertiesChanged",
                    function (newProperties) {
                        try {
                            if (newProperties === null) {
                                return;
                            }
                            // rename search in tableSearches and update
                            var tableSearches = registry.byId("tableSearches");
                            var store = tableSearches.get("store");
                            var rec = store.get(newProperties.id);
                            rec.name = newProperties.name;
                            tableSearches.set(
                                {
                                    displayedValue: newProperties.name
                                }
                                
                            );
                        } catch (e) {
                            alert("Error in widget/AllSearchesGrid.openSearchProperties:" + e.message);
                        }
                    }
                );
            },
            
            checkIntegers: function(integerString) {
                var allValid = true;
                array.forEach(integerString.split(","),
                    lang.hitch(this,function(intStr) {
                        if (!this.isInt(intStr)) {
                            allValid = false;
                        }
                    })
                );

                return allValid;
            },
            isInt: function (value) {
              if (isNaN(value)) {
                return false;
                }
              var x = parseFloat(value);
                return (x | 0) === x;
            },

            datasetsToExplorerSearchResponse: function (datasetsDataResponse) {
                // need to keep track of sites because the datasets may be at the same site
                var siteIds = [];
                var minx = null;
                var miny = null;
                var maxx = null;
                var maxy = null;

                // format into standard responses
                var reformattedSite = null;
                var reformattedSites = [];
                array.forEach(datasetsDataResponse,
                    function (datasetObj) {
                        // see if it expands the extent
                        if (miny === null) {
                            miny = datasetObj.site.latitudesouth;
                            maxy = datasetObj.site.latitudenorth;
                            minx = datasetObj.site.longitudewest;
                            maxx = datasetObj.site.longitudeeast;
                        } else {
                            if (datasetObj.site.latitudesouth < miny) {
                                miny = datasetObj.site.latitudesouth;
                            }
                            if (datasetObj.site.latitudenorth > maxy) {
                                maxy = datasetObj.site.latitudenorth;
                            }
                            if (datasetObj.site.longitudewest < minx) {
                                minx = datasetObj.site.longitudewest;
                            }
                            if (datasetObj.site.longitudeeast > maxx) {
                                maxx = datasetObj.site.longitudeeast;
                            }
                        }

                        // see if already have site or need to create
                        if (siteIds.indexOf(datasetObj.site.siteid) !== -1) {
                            // already created site, just add dataset
                            var result = array.filter(reformattedSites,
                                function (item, index, ary) {
                                    if (item.siteid === datasetObj.site.siteid) {
                                        return true;
                                    }
                                }
                            );
                            reformattedSite = result[0];
                        } else {
                            // add new siteid to siteIds
                            siteIds.push(datasetObj.site.siteid);

                            // create site with empty datasets
                            reformattedSite = {
                                siteid: datasetObj.site.siteid,
                                sitename: datasetObj.site.sitename,
                                sitedescription: datasetObj.site.sitedescription,
                                sitenotes: datasetObj.site.sitenotes,
                                latitudesouth: datasetObj.site.latitudesouth,
                                latitudenorth: datasetObj.site.latitudenorth,
                                longitudewest: datasetObj.site.longitudewest,
                                longitudeeast: datasetObj.site.longitudeeast,
                                latitude: (datasetObj.site.latitudesouth + datasetObj.site.latitudenorth) / 2,
                                longitude: (datasetObj.site.longitudewest + datasetObj.site.longitudeeast) / 2,
                                ageoldest: datasetObj.site.ageoldest,
                                ageyoungest: datasetObj.site.ageyoungest,
                                datasets: []
                            };
                        }

                        // add dataset
                        reformattedSite.datasets.push(
                            {
                                datasetid: datasetObj.datasetid,
                                ageyoungest: datasetObj.ageyoungest,
                                ageoldest: datasetObj.ageoldest,
                                datasettype: datasetObj.datasettype,
                                collunithandle: datasetObj.collunithandle,
                                collunitname: datasetObj.collunitname,
                                databasename: datasetObj.databasename
                            }
                        );

                        // add to reformattedSites
                        reformattedSites.push(reformattedSite);
                    }
                );


                // check that there is a width and a height
                var buf = 0.125;//0.00004;
                if (miny === maxy) {
                    miny -= buf;
                    maxy += buf;
                }
                if (minx === maxx) {
                    minx -= buf;
                    maxx += buf;
                }


                // get projected extent coordinates
                var minpt = new OpenLayers.Geometry.Point(minx, miny).transform(dojo.config.app.llProj, dojo.config.app.wmProj);
                var maxpt = new OpenLayers.Geometry.Point(maxx, maxy).transform(dojo.config.app.llProj, dojo.config.app.wmProj);

                // zoom map
                dojo.config.map.zoomToExtent([minpt.x, minpt.y, maxpt.x, maxpt.y]);

                // return sites
                return reformattedSites;
            }
        }; // end of return object
    }
);
