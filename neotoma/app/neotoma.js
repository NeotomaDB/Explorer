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

                            var sites = [];
                            var control = null; 
                            dojo.config.map.getInteractions().forEach((interaction) => {
                              if (interaction instanceof ol.interaction.Select) {
                                control = interaction;
                              }
                            });
                            var selectedFeatures = control.getFeatures().getArray();

                            selectedFeatures.forEach((f) => {
                              sites.push(f.j)
                            });
                           
                            var uniqueSites = [];
                            sites.map(x => uniqueSites.filter(a => a.attributes.siteid == x.attributes.siteid).length > 0 ? null : uniqueSites.push(x));

                            // set site(s)
                            dlg.set("sites", uniqueSites);

                            // hide other dialogs
                            mainToolbar.closeAllDialogs();

                            // show dialog
                            dlg.show();
                        }
                    } catch (e) {
                        //alert("Error in app/neotoma.onSiteSelect: " + e.message + "\n" + e.description);
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
                                        symbol: { "shape": "Square", "size": "Large", "color": "#5D5B61" }
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
                                        symbol: { "shape": "Circle", "size": "Large", "color": "#5D5B61" }
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
            loadDataByDBId: function (databaseId) {
              try {
                  // make request to data/datasets
                  script.get(config.appServicesLocation + '/Search?search={"metadata":{"databaseId":"' + databaseId + '"}}',
                          { jsonp: "callback" }
                      ).then(lang.hitch(this, function (response) {
                          try {
                              if (response.success) {
                                  // make sure data was returned
                                  if (response.data.length === 0) {
                                      alert("No datasets found with ids in " + databaseId + ".");
                                      return;
                                  }

                                  // convert response to Explorer Search response
                                  var searchResponse = this.databasesToExplorerSearchResponse(response.data);

                                  // publish topic with new response
                                  topic.publish("neotoma/search/NewResult", {
                                      //data: reformattedSites,
                                      data: searchResponse,
                                      searchName: "databaseId: " + databaseId,
                                      request: { databaseid: databaseId },
                                      symbol: { "shape": "Circle", "size": "medium", "color": "#238b45" }
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
                                        data: searchResponse,
                                        searchName: "SiteIds: " + siteIds,
                                        request: { siteids: siteIds },
                                        symbol: { "shape": "Square", "size": "Large", "color": "#5D5B61" } 
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
              // TODO //
                // try {
                //   var control = null; 
                //   var selectStyle = new ol.style.Style({
                //     image: new ol.style.Circle({
                //       radius: 8,
                //       fill: new ol.style.Fill({
                //         color:  '#fffc00'
                //       })
                //     })    
                //   });
                //   dojo.config.map.getInteractions().forEach((interaction) => {
                //     if (interaction instanceof ol.interaction.Select) {
                //       control = interaction;
                //     }
                //   });
                //   var selectedFeatures = control.getFeatures().getArray();
                //     // get the search layer
                //     var searchId = registry.byId("tableSearches").get("value");
                //     var layers = dojo.config.map.getLayers();
                //     var site = [];
                //     layers.forEach(function (layer) {
                //       if (layer.get("id") == searchId) {
                //         layer.getSource().forEachFeature(function (feature) {
                //           var featureProperties = feature.getProperties();
                //           //var siteid = featureProperties.attributes.siteid;
                //           if (featureProperties.attributes.siteid === siteid) {
                //             selectedFeatures.push(feature);
                //           }
                //         });
                //       }
                //     });

                //     var site = selectedFeatures[0];
                //     site.setStyle(selectStyle);
                //     //control.on('select', onSiteSelect(site);

                   
                    
                //     control.dispatchEvent({
                //       type: 'select',
                //       selected: [site],
                //       deselected: []
                //     });

                //     // control.on('select', function(evt) {
                //     //   console.log("evt",evt);
                //     //   if (evt) {
                //     //     evt.selected.forEach(function(each) {
                //     //       console.log("each",each);
                //     //       each.setStyle(selectStyle);
                //     //     });
                //     //   }
                     
                //     //   // evt.deselected.forEach(function(each) {
                //     //   //   each.setStyle(null); // more likely you want to restore the original style
                //     //   // });
                //     // });
                
                // } catch (e) {
                //     alert("Error in app/neotoma.selectSite: " + e.message);
                // } 
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

                    // define styles
                    // get size
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
                    // define styles based on selected shape
                    var style;
                    var selectStyle;
                    if (symbol.shape == "Circle") {
                      style = new ol.style.Style({
                        image: new ol.style.Circle({ 
                          fill: new ol.style.Fill({
                              color: symbol.color
                          }),
                          radius: markerSize
                        })
                      });
                      selectStyle = new ol.style.Style({
                        image: new ol.style.Circle({ 
                          fill: new ol.style.Fill({
                              color: '#f03b20'
                          }),
                          radius: markerSize + 1
                        })
                      });
                    } else if (symbol.shape == "Square") {
                      style = new ol.style.Style({
                        image: new ol.style.RegularShape({ 
                          fill: new ol.style.Fill({
                              color: symbol.color
                          }),
                          radius: markerSize,
                          points: 4,
                          angle: Math.PI / 4
                        })
                      });
                      selectStyle = new ol.style.Style({
                        image: new ol.style.RegularShape({ 
                          fill: new ol.style.Fill({
                              color: '#f03b20'
                          }),
                          radius: markerSize,
                          points: 4,
                          angle: Math.PI / 4
                        })
                      });
                    }
                    
                    // search source and layer definition
                    var source = new ol.source.Vector({});
                    var layer = new ol.layer.Vector( {
                      source: source,
                      style: style,
                      properties: {
                        id: searchId
                      },
                      name: 'selectable'
                    });
                    dojo.config.map.addLayer(layer);

                    // select interaction control
                    var selectControl = new ol.interaction.Select({
                      condition: ol.events.condition.singleClick,
                      style: selectStyle,
                      multi: true,
                      filter: function(feature, layer) {
                        if (feature) {
                          if (layer.get('name') === 'selectable') {
                            return true;
                          }
                        } else {
                          selectControl.setActive(false);
                        }
                      }
                    });
                    dojo.config.map.addInteraction(selectControl);
                    
                    selectControl.on(
                      'select', onSiteSelect  
                    );

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
                        var pt = new ol.geom.Point([rec.longitude, rec.latitude]).transform("EPSG:4326", "EPSG:3857");

                        features.push(new ol.Feature(
                          {
                            attributes: atts,
                            geometry: pt
                          })
                        )
                    }

                    // add features to layer, zoom to extent
                    if (features.length > 0) {
                      source.addFeatures(features);
                      var extent = layer.getSource().getExtent();
                      dojo.config.map.getView().fit(extent, { duration: 1000, padding: [15,15,15,15], maxZoom: 10 });
                    }
                    return layer;
                } catch (e) {
                    //alert("Error in neotoma/app/neotoma.loadSitesOnMap: " + e.message);
                } 
            },
            updateSelectControl: function() {
             
            },
            setSelectControl: function (layer, reset) {
                
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
                var ext = ol.extent.boundingExtent([[minx, miny], [maxx, maxy]]);
                ext = ol.proj.transformExtent(ext, ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

                // zoom map
                dojo.config.map.getView().fit(ext, { duration: 1000, padding: [15,15,15,15], maxZoom: 10 });

                // return sites
                return reformattedSites;
            },
            databasesToExplorerSearchResponse: function (databasesDataResponse) {
              // need to keep track of sites because the datasets may be at the same site
              var siteIds = [];
              var minx = null;
              var miny = null;
              var maxx = null;
              var maxy = null;

              // format into standard responses
              var reformattedSite = null;
              var reformattedSites = [];
              array.forEach(databasesDataResponse,
                  function (datasetObj) {
                      // see if it expands the extent
                      if (miny === null) {
                          miny = datasetObj.latitudesouth;
                          maxy = datasetObj.latitudenorth;
                          minx = datasetObj.longitudewest;
                          maxx = datasetObj.longitudeeast;
                      } else {
                          if (datasetObj.latitudesouth < miny) {
                              miny = datasetObj.latitudesouth;
                          }
                          if (datasetObj.latitudenorth > maxy) {
                              maxy = datasetObj.latitudenorth;
                          }
                          if (datasetObj.longitudewest < minx) {
                              minx = datasetObj.longitudewest;
                          }
                          if (datasetObj.longitudeeast > maxx) {
                              maxx = datasetObj.longitudeeast;
                          }
                      }

                      // see if already have site or need to create
                      if (siteIds.indexOf(datasetObj.siteid) !== -1) {
                          // already created site, just add dataset
                          var result = array.filter(reformattedSites,
                              function (item, index, ary) {
                                  if (item.siteid === datasetObj.siteid) {
                                      return true;
                                  }
                              }
                          );
                          reformattedSite = result[0];
                      } else {
                          // add new siteid to siteIds
                          siteIds.push(datasetObj.siteid);

                          // create site with empty datasets
                          reformattedSite = {
                              siteid: datasetObj.siteid,
                              sitename: datasetObj.sitename,
                              sitedescription: datasetObj.sitedescription,
                              sitenotes: datasetObj.sitenotes,
                              latitudesouth: datasetObj.latitudesouth,
                              latitudenorth: datasetObj.latitudenorth,
                              longitudewest: datasetObj.longitudewest,
                              longitudeeast: datasetObj.longitudeeast,
                              latitude: (datasetObj.latitudesouth + datasetObj.latitudenorth) / 2,
                              longitude: (datasetObj.longitudewest + datasetObj.longitudeeast) / 2,
                              ageoldest: datasetObj.ageoldest,
                              ageyoungest: datasetObj.ageyoungest,
                              datasets: datasetObj.datasets
                          };
                      }

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
              var ext = ol.extent.boundingExtent([[minx, miny], [maxx, maxy]]);
              ext = ol.proj.transformExtent(ext, ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

              // zoom map
              dojo.config.map.getView().fit(ext, { duration: 1000, padding: [15,15,15,15], maxZoom: 10 });

              // return sites
              return reformattedSites;
            }
        }; // end of return object
    }
);
