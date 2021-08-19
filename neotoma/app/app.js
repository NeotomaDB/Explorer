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
                                idProperty: "datasettype",
                                data: [
                                    { datasettype: "geochronologic", image: "G.png" },
                                    { datasettype: "loss-on-ignition", image: "L.png" },
                                    { datasettype: "pollen", image: "P.png" },
                                    { datasettype: "plant macrofossil", image: "PM.png" },
                                    { datasettype: "vertebrate fauna", image: "V.png" },
                                    { datasettype: "macroinvertebrate", image: "M.png" },
                                    { datasettype: "pollen surface sample", image: "Ps.png" },
                                    { datasettype: "insect", image: "I.png" },
                                    { datasettype: "ostracode", image: "O.png" },
                                    { datasettype: "water chemistry", image: "W.png" },
                                    { datasettype: "diatom", image: "D.png" },
                                    { datasettype: "ostracode surface sample", image: "OS.png" },
                                    { datasettype: "diatom surface sample", image: "Ds.png" },
                                    { datasettype: "geochemistry", image: "GC.png" },
                                    { datasettype: "physical sedimentology", image: "S.png" },
                                    { datasettype: "charcoal", image: "C.png" },
                                    { datasettype: "testate amoebae", image: "T.png" },
                                    { datasettype: "energy dispersive x-ray spectroscopy (eds/edx)", image: "GC.png" },
                                    { datasettype: "x-ray diffraction (xrd)", image: "GC.png" },
                                    { datasettype: "x-ray fluorescence (xrf)", image: "GC.png" }
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

                            // map view and parameters
                            var mapView = new ol.View({
                              center: ol.proj.fromLonLat([0, 0]),
                              zoom: 2,
                            });
                            
                            var zoom = new ol.control.Zoom();
                            var scaleLine = new ol.control.ScaleLine();
                            var attribution = new ol.control.Attribution();

                            // create map
                            dojo.config.map = new ol.Map({
                              controls: [zoom, scaleLine, attribution],                
                              target: "mapPane",
                              view: mapView,
                              attributionOptions: {
                                collapsible: true
                              }
                            });

                            // basemap layers

                            // OSM standard layer
                            var openStreetMapStandard = new ol.layer.Tile({
                              source: new ol.source.OSM(),
                              visible: true,
                              title: 'OSMStandard',
                              properties: {
                                id: 'OSMStandard'
                              }
                             
                            });
                            // ESRI world TOPO layer
                            var esriWorldTopo = new ol.layer.Tile({
                              source: new ol.source.XYZ({
                                attributions:
                                  ['Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
                                  'rest/services/World_Topo_Map/MapServer">ArcGIS</a>'],
                                url:
                                  'https://server.arcgisonline.com/ArcGIS/rest/services/' +
                                  'World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                              }),
                              visible: false,
                              title: 'ESRIWorldTopo',
                              properties: {
                                id: 'ESRIWorldTopo'
                              }
                            });
                            // ESRI satellite imagery layer
                            var satelliteImagery = new ol.layer.Tile({
                              source: new ol.source.XYZ({
                                attributions: ['Powered by Esri',
                                               'Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'],
                                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                                maxZoom: 23,
                              }),
                              visible: false,
                              title: 'ESRISatellite',
                              properties: {
                                id: 'ESRISatellite'
                              }
                            });

                            dojo.config.map.addLayer(openStreetMapStandard);
                            dojo.config.map.addLayer(esriWorldTopo);
                            dojo.config.map.addLayer(satelliteImagery);

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
                                    

                                    console.log("app.js handle search/NewResult: "+new Date().toLocaleTimeString());
                                    // add a UI for this search
                                    var newId = dojo.config.app.allSearchResults.allSearchesList.addSearch({ name: args.searchName, symbol: { color: thisSymbol.color, size: thisSymbol.size, shape: thisSymbol.shape }, request: args.request, sites: args.data, numDatasets: args.numDatasets, numSites: args.numSites });
                                    console.log("app.js handle search/NewResult after addSearch: "+new Date().toLocaleTimeString());
                                    // show on map
                                    var searchLayer = neotoma.loadSitesOnMap(args.data, newId, thisSymbol);

                                    // fix ages before displaying
                                    var numSites = args.data.length;
                                    for (var i = 0; i < numSites; i++) {
                                        if (args.data[i].maxage != null) {
                                            args.data[i].ageoldest = args.data[i].maxage;
                                        }
                                        if (args.data[i].minage != null) {
                                            args.data[i].ageyoungest = args.data[i].minage;
                                        }
                                    }
                                } catch (e) {
                                    alert("neotoma/search/NewResult subscribe: " + e.message + " desc: " + e.description);
                                }
                            }));


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

                           

                            // switch to gphy
                            setTimeout(
                                function () {
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
            toasterAlert: function () {
                // cache the original alert function
                window._alert = window.alert;

                // override alert to show in toaster
                window.alert = function (message) {
                    try {
                        var toaster = registry.byId("toasterAuto");
                        if (toaster) {
                            console.log(message);
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
