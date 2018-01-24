define(["dojo/_base/lang", "dojo/topic", "dijit/registry","neotoma/app/neotoma", "amagimap/util/url", "dojo/_base/array", "dojo/_base/Color", "dojo/colors"],
    function (lang, topic, registry, neotoma, urlUtil, array, Color, colors) {
        var dropCancel = function (e) {
            if (e.preventDefault) e.preventDefault(); // required by FF + Safari
            e.dataTransfer.dropEffect = 'copy'; // tells the browser what drop effect is allowed here
            return false; // required by IE
        };

        var loadSearch = function (search) {
            // see if it's an array
            if (search.length !== undefined) {
                // is an array
                array.forEach(search,
                    function (searchObj) {
                        topic.publish("neotoma/search/NewResult", {
                            data: searchObj.sites,
                            searchName: searchObj.name,
                            request: searchObj.request,
                            symbol: searchObj.symbol
                        });
                    }
                );
            } else {
                // load just like got back from server
                topic.publish("neotoma/search/NewResult", {
                    data: search.sites,
                    searchName: search.name,
                    request: search.request,
                    symbol: search.symbol
                });
            }
        };

        var handleSearchFile = function (file) {
            //console.log("Processing Search file: ", file, ", ", file.name, ", ", file.type, ", ", file.size);
            var search = null;
            if (file.data) {
                //var decoded = bytesToString(base64.decode(file.data));
                search = JSON.parse(file.data);
                // load the search
                loadSearch(search);
            }
            else {
                try {
                    var reader = new FileReader();
                    reader.onload = function () {
                        search = JSON.parse(reader.result);
                        // load the search
                        //alert("wait");
                        loadSearch(search);
                    };
                    reader.readAsText(file);
                } catch (e) {
                    alert("Error in app/app.handleSearchFile: " + e.message);
                }
            }
        };

        return {
            userCenterPoint: null,
            pageReady: function (){
                //alert("in pageReady()");
                require(["dojo/dom", "dojo/_base/fx", "dojo/dom-construct", "dojo/request/script", "dojo/store/Memory", "dojo/_base/array", "dojo/number", "dojo/aspect", "dijit/registry", "neotoma/util/export", "neotoma/dialog/AllSearchResultsDialog", "dojo/has", "dijit/TooltipDialog", "dijit/form/DropDownButton", "dijit/popup"],
                    lang.hitch(this,function (dom, fx, domConstruct, script, Memory, array, number, aspect, registry, exExport, AllSearchResultsDialog, has, TooltipDialog, DropDownButton, popup, SpatialSearch) {
                        // show GUI
                        try {
                            //alert("in pageReady() require function");

                            // create icon store
                            dojo.config.app.iconStore = new Memory({
                                idProperty: "DatasetType",
                                data: [
                                    { DatasetType: "geochronologic", image: "G.png" },
                                    { DatasetType: "loss-on-ignition", image: "L.png" },
                                    { DatasetType: "pollen", image: "P.png" },
                                    { DatasetType: "plant macrofossil", image: "PM.png" },
                                    { DatasetType: "vertebrate fauna", image: "V.png" },
                                    { DatasetType: "macroinvertebrate", image: "M.png" },
                                    { DatasetType: "pollen surface sample", image: "Ps.png" },
                                    { DatasetType: "insect", image: "I.png" },
                                    { DatasetType: "ostracode", image: "O.png" },
                                    { DatasetType: "water chemistry", image: "W.png" },
                                    { DatasetType: "diatom", image: "D.png" },
                                    { DatasetType: "ostracode surface sample", image: "Os.png" },
                                    { DatasetType: "diatom surface sample", image: "Ds.png" },
                                    { DatasetType: "geochemistry", image: "GC.png" },
                                    { DatasetType: "physical sedimentology", image: "S.png" },
                                    { DatasetType: "charcoal", image: "C.png" },
                                    { DatasetType: "testate amoebae", image: "T.png" },
                                    { DatasetType: "Energy dispersive X-ray spectroscopy (EDS/EDX)", image: "GC.png" },
                                    { DatasetType: "X-ray diffraction (XRD)", image: "GC.png" },
                                    { DatasetType: "X-ray fluorescence (XRF)", image: "GC.png" }
                                ]
                            });
                            //// get overlay div. quit if it doesn't exist
                            //var overlayDiv = dom.byId('loader');
                            //if (overlayDiv !== null) {
                            //    // remove the overlay node so it doesn't cover the map. use animation to look better
                            //    fx.fadeOut({
                            //        node: overlayDiv,
                            //        onEnd: function (node) {
                            //            try {
                            //                domConstruct.destroy(node);
                            //            } catch (e) {
                            //                alert("Error in app/app.fxFadeOut:" + e.message);
                            //            }
                            //        }
                            //    }).play();
                            //}

                            // project geographic coords to Web Mercator. Default for world
                            //var centerPoint = new OpenLayers.LonLat(0, 3515100); //world
                            var centerPoint = new OpenLayers.LonLat(-10309900, 4215100); //US

                            // create map
                            dojo.config.map = new OpenLayers.Map({
                                div: "mapPane",
                                theme: null,
                                projection: new OpenLayers.Projection("EPSG:900913"),
                                units: "m",
                                numZoomLevels: 22,
                                zoomMethod: null,
                                /*,
                                maxExtent: new OpenLayers.Bounds(
                                    -20037508.34, -20037508.34, 20037508.34, 20037508.34
                                ),
                                */
                                controls: [],
                                center: this.userCenterPoint || centerPoint // user
                            });

                            // define google layers
                            var gstreet = new OpenLayers.Layer.Google(
                                "Google Streets",
                                { numZoomLevels: 20, wrapDateLine: false, animationEnabled: false }
                            );

                            var gphy = new OpenLayers.Layer.Google(
                                "Google Terrain",
                                { type: google.maps.MapTypeId.TERRAIN, numZoomLevels: 20, wrapDateLine: true, animationEnabled: false }
                            );

                            var ghyb = new OpenLayers.Layer.Google(
                                "Google Hybrid",
                                { type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20, wrapDateLine: true, animationEnabled: false }
                            );

                            //dojo.config.map.addLayers([gphy, gstreet, ghyb]);
                            dojo.config.map.addLayers([ghyb, gphy, gstreet]);

                            // set zoom level
                            //map.zoomTo(4); // US
                            //map.zoomTo(2); // world
                            
                            if (this.userCenterPoint) {
                                var zoom = this.minimumZoom(4, true);
                            } else {
                                var zoom = this.minimumZoom(2, true); // world
                            }

                            //zoom = this.minimumZoom(0,true);
                            //dojo.config.map.zoomTo(zoom); // set according to user's screen size.
                            dojo.config.map.zoomTo(2);

                            // add other controls
                            dojo.config.app.navControl = new OpenLayers.Control.PanZoomBar();
                            dojo.config.map.addControl(dojo.config.app.navControl);
                            dojo.config.map.addControl(new OpenLayers.Control.Navigation());
                            dojo.config.map.addControl(new OpenLayers.Control.ScaleLine());
                            dojo.config.map.addControl(new OpenLayers.Control.ZoomBox());

                            // make map into a drop zone
                            var mapNode = dom.byId("mapPane");
                            dojo.connect(mapNode, 'dragover', dropCancel);
                            dojo.connect(mapNode, 'dragenter', dropCancel);
                            dojo.connect(mapNode, 'drop', function (e) {
                                // prevent default browser behavior
                                if (e.preventDefault) e.preventDefault();
                                //// handle the file
                                var files = e.dataTransfer.files;
                                array.forEach(files, function (file) {
                                    handleSearchFile(file);
                                });
                                return false;
                            }
                            );

                            // listen for new search results.
                            topic.subscribe("neotoma/search/NewResult", lang.hitch(this, function () {
                                var args = arguments[0];
                                //alert("searchName: " + args.searchName);
                                try {
                                    // create search view if needed 
                                    var newId = null;
                                    if (dojo.config.app.allSearchResults == null) {
                                        mainToolbar.openSearchResults(true);
                                    }

                                    // get symbol parameters
                                    var thisSymbol = {};
                                    if (args.symbol) {
                                        thisSymbol.color = args.symbol.color;
                                        thisSymbol.size = args.symbol.size;
                                        thisSymbol.shape = args.symbol.shape;
                                    } else { // use default
                                        var searchColors = dojo.config.app.searchColors;
                                        //searchColors.colors[index].replace("#", "")
                                        var nextColor = searchColors.colors[searchColors.currentIndex];
                                        if (nextColor == null) {
                                            alert("Can't find next search color at index: " + searchColors.currentIndex);
                                            return;
                                        }
                                        var newColor = searchColors.colors[searchColors.currentIndex].replace("#", "");

                                        // convert color to rgb
                                        newColor = new Color(newColor).toHex();

                                        //thisSymbol.color = searchColors.colors[index].replace("#", "");
                                        if (newColor == null) {
                                            alert("newColor is null");
                                        }
                                        thisSymbol.color = newColor.replace("#", "");
                                        thisSymbol.size = "Medium";
                                        thisSymbol.shape = "Circle";
                                        // set next color. Do here because the color is used by both map and searches list
                                        if (searchColors.currentIndex === searchColors.maxIndex) {
                                            searchColors.currentIndex = 0;
                                        }
                                        else {
                                            searchColors.currentIndex += 1;
                                        }
                                    }
                                    

                                    // add a UI for this search
                                    var newId = dojo.config.app.allSearchResults.allSearchesList.addSearch({ name: args.searchName, symbol: { color: thisSymbol.color, size: thisSymbol.size, shape: thisSymbol.shape }, request: args.request, sites: args.data, numDatasets: args.numDatasets, numSites: args.numSites });

                                    // show on map
                                    var searchLayer = neotoma.loadSitesOnMap(args.data, newId, thisSymbol);

                                    // fix ages before displaying
                                    var numSites = args.data.length;
                                    for (var i = 0; i < numSites; i++) {
                                        if (args.data[i].MaxAge != null) {
                                            args.data[i].AgeOldest = args.data[i].MaxAge;
                                        }
                                        if (args.data[i].MinAge != null) {
                                            args.data[i].AgeYoungest = args.data[i].MinAge;
                                        }
                                    }
                                } catch (e) {
                                    alert("neotoma/search/NewResult subscribe: " + e.message + " desc: " + e.description);
                                }
                            }));

                            // see if a dataset id was passed
                            var datasetId = urlUtil.getParameterByName("datasetid") || urlUtil.getParameterByName("datasetId") || urlUtil.getParameterByName("datasetID");
                            if (datasetId) {
                                neotoma.loadDataset(datasetId);
                            }

                            // see if datasetids were passed
                            var idsPassed = false;
                            var datasetIds = urlUtil.getParameterByName("datasetids") || urlUtil.getParameterByName("datasetIds") || urlUtil.getParameterByName("datasetIDs");
                            if (datasetIds) {
                                idsPassed = true;
                                // make sure integers are valid
                                var allValid = neotoma.checkIntegers(datasetIds);
                                if (!allValid) {
                                    alert("At least one of the dataset ids is invalid.");
                                } else {
                                    neotoma.loadDatasets(datasetIds);
                                } 
                            }

                            // see if site ids were passed
                            var siteIds = urlUtil.getParameterByName("siteids") || urlUtil.getParameterByName("siteIds") || urlUtil.getParameterByName("siteIDs");
                            if (siteIds) {
                                idsPassed = true;
                                // make sure integers are valid
                                var allValid = neotoma.checkIntegers(siteIds);
                                if (!allValid) {
                                    alert("At least one of the site ids is invalid.");
                                } else {
                                    neotoma.loadSites(siteIds);
                                }
                            }

                            // start tray so is ready when the first dataset is loaded.
                            mainToolbar.openDatasetTray(true);

                            // open search form by default
                            mainToolbar.openSearchNew();

                            try {
                                // add buttonbar to table view
                                var buttonBar = domConstruct.create("div", {
                                    "class": "mini",
                                    style: "position:absolute;top:15px;right:10px;"
                                },
                                    registry.byId("table").domNode
                                );

                                // add buttons
                                // save
                                domConstruct.create("button", {
                                    type: "button",
                                    title: "Save results as csv file",
                                    "class": "dsSave",
                                    click: function () {
                                        try {
                                            // get the grid
                                            var grid = searchResultsGrid;

                                            // get search name
                                            var tableSearches = registry.byId("tableSearches");
                                            var searchName = tableSearches.get("store").get(tableSearches.get("value")).name;

                                            //  get data in sorted order
                                            var sort = { sort: grid.get("_sort") };
                                            var data = grid.get("store").query({}, sort);

                                            // convert to csv
                                            var csv = exExport.csv(data);

                                            // save
                                            exExport.save(csv, searchName + ".csv");

                                            // HACK: if chrome, switch to map to prevent map from getting messed up
                                            if (has("chrome")) {
                                                if (!dojo.config.app.gaveChromeMapBugMessage) {
                                                    _alert("There is a bug in Chrome that breaks the map when you close the file download status bar. To prevent this bug, return to the map view before closing the download bar. If the map does break, resize your browser window slightly to fix.");
                                                    dojo.config.app.gaveChromeMapBugMessage = true;
                                                }
                                            }
                                        } catch (e) {
                                            alert("Error exporting table to csv: " + e.message);
                                        }
                                    }
                                }, buttonBar);
                            } catch(e) {
                                alert("new error: " + e.message);
                            } 

                            // try to get IP location
                            if (idsPassed === false) {
                                script.get("//freegeoip.net/json/", { jsonp: "callback" }).then(
                                   lang.hitch(this, function (response) {
                                       try {
                                           var pt = null;
                                           if ((response.latitude) && (response.longitude)) {
                                               pt = { latitude: response.latitude, longitude: response.longitude };

                                               if (dojo.config.map !== null) {
                                                   this.centerMap(pt);
                                               }
                                           }
                                       } catch (e) {
                                           // do nothing
                                           alert("Error handling freegeoip response: " + e.message);
                                       }
                                   })
                               );
                            }
                           

                            // switch to gphy
                            setTimeout(
                                function () {
                                    dojo.config.map.setBaseLayer(gphy);
                                    setTimeout(
                                        function () {
                                            // get overlay div. quit if it doesn't exist
                                            var overlayDiv = dom.byId('loader');
                                            if (overlayDiv !== null) {
                                                // remove the overlay node so it doesn't cover the map. use animation to look better
                                                fx.fadeOut({
                                                    node: overlayDiv,
                                                    onEnd: function (node) {
                                                        try {
                                                            domConstruct.destroy(node);
                                                        } catch (e) {
                                                            alert("Error in app/app.fxFadeOut:" + e.message);
                                                        }
                                                    }
                                                }).play();
                                            }
                                        },
                                        500
                                    );
                                    
                                },
                                1000
                            );
                                
                            
                            // subscribe to topics
                            neotoma.subscribeToTopics();
                        } catch (e) {
                            alert("error in app/app.pageReady: " + e.message);
                        }
                    })
                );
            },
            centerMap: function(coords) {
                if (coords) {
                    this.userCenterPoint = new OpenLayers.LonLat(coords.longitude, coords.latitude).transform(dojo.config.app.llProj, dojo.config.app.wmProj);
                    dojo.config.map.setCenter(this.userCenterPoint, this.minimumZoom(4, true));
                }
            },
            minimumZoom: function (minZoom, init) {
                var newZoom = null;
                var curZoom = dojo.config.map.getZoom();
	
                // calculate minimum zoom level for current map width
                var wLog2 = Math.log(dojo.config.map.getSize().w) * Math.LOG2E;
                if (wLog2 >= 8) {
                    newZoom = (wLog2 - 8);
                }
                else {
                    newZoom = 0;
                }

                // return minimum zoom
                if (init) { // initializing map
                    if (newZoom > minZoom) {
                        return Math.floor(newZoom);
                    } else {
                        return Math.floor(minZoom);
                    }
                } else { // maybe updating extent
                    if (newZoom > curZoom) {
                        return Math.floor(newZoom);
                    } else {
                        return Math.floor(curZoom);
                    }
                }
            },

            toasterAlert: function () {
                // cache the original alert function
                window._alert = window.alert;

                // override alert to show in toaster
                window.alert = function (message) {
                    try {
                        var toaster = registry.byId("toasterAuto");
                        if (toaster) {
                            toaster.setContent(message, "message");
                            toaster.show();
                        } else {
                            _alert(message);
                        }
                    } catch (e) {
                        _alert("error in app/neotoma.toasterAlert: " + e.message + "\noriginal message: " + message);
                    }
                };
            }
        };
    }
);