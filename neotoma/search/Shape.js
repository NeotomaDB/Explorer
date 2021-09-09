define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/shape.html", "dijit/_WidgetsInTemplateMixin", "dojo/request/script", "dojo/_base/lang", "dojo/topic", "dijit/registry", "dojo/store/Memory", "dojo/keys", "dojo/_base/array", "dojo/dom-style", "dojo/dom", "dijit/popup", "dojo/on", "amagimap/util/misc", "dijit/form/Button", "dijit/form/RadioButton", "dijit/Toolbar"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, lang, topic, registry, Memory, keys, array, domStyle, dom, popup, on, misc) {
        // define widget
        return declare([ContentPane,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            drawLayer: null,
            drawControls: null,
            getStyleMap: function (color) {
                // create styles for features drawn on map
                var symbolizer = {
                    "Point": {
                        pointRadius: 5,
                        graphicName: "circle",
                        fillColor: color || "#FF0000",
                        fillOpacity: 1,
                        strokeWidth: 1,
                        strokeOpacity: 1,
                        strokeColor: color || "#333333"
                    },
                    "Line": {
                        strokeWidth: 3,
                        strokeOpacity: 1,
                        strokeColor: color || "#FF0000"//, // initial #666666
                        //strokeDashstyle: "dash"
                    },
                    "Polygon": {
                        strokeWidth: 2,
                        strokeOpacity: 1,
                        strokeColor: color || "#FF0000", // initial #666666
                        fillColor: "white",
                        fillOpacity: 0.3
                    }
                };

                // create style with rules
                var style = new OpenLayers.Style();
                style.addRules([
                    new OpenLayers.Rule({ symbolizer: symbolizer })
                ]);


                // create selected styles
                var selectedSymbolizer = {
                    "Point": {
                        pointRadius: 6,
                        graphicName: "circle",
                        fillColor: "#FFFF00",
                        fillOpacity: 1,
                        strokeWidth: 1,
                        strokeOpacity: 1,
                        strokeColor: "#FFFF00"
                    },
                    "Line": {
                        strokeWidth: 3,
                        strokeOpacity: 1,
                        strokeColor: "#FFFF00"//,
                        //strokeDashstyle: "dash"
                    },
                    "Polygon": {
                        strokeWidth: 3,
                        strokeOpacity: 1,
                        strokeColor: "#FFFF00",
                        fillColor: "white",
                        fillOpacity: 0
                    }
                };

                // create selected style with ruls
                var selectedStyle = new OpenLayers.Style();
                selectedStyle.addRules([
                    new OpenLayers.Rule({ symbolizer: selectedSymbolizer })
                ]);

                return new OpenLayers.StyleMap({ default: style, temporary: style, select:selectedStyle });
            },
            boxClick: function(evt) {
              
                // remove any previous draw interactions
                dojo.config.map.getInteractions().forEach(function (interaction) {
                  if (interaction instanceof ol.interaction.Draw) {
                    dojo.config.map.removeInteraction(interaction);
                  }
                });
                
                // hide buffer controls
                this.bufferDistance.set("disabled", true);
                this.bufferDistance.set("value", "");
                this.bufferUnits.set("disabled", true);
                this.bufferUnits.set("value", "");
                domStyle.set("bufferLabel", "color", "lightgray");

                 // clear features, define box source
                 this.drawLayerSource.clear();
                 var boxSource = this.drawLayerSource;
                 // add draw interaction
                 var boxInteraction = new ol.interaction.Draw({
                   source: boxSource,
                   type: "Circle",
                   geometryFunction: new ol.interaction.Draw.createRegularPolygon(4)
                 });
                 dojo.config.map.addInteraction(boxInteraction);

                // interaction on draw start
                boxInteraction.on('drawstart', function(e) {
                  // if previous features exist, clear them
                  if (boxSource.getFeatures().length > 0) {
                    boxSource.clear();
                  }                  
                });
                // interaction on draw end
                boxInteraction.on('drawend', function(e) {
                  dojo.config.map.removeInteraction(boxInteraction);       
                });
            },
            pointClick: function (evt) {

                  // remove any previous draw interactions
                  dojo.config.map.getInteractions().forEach(function (interaction) {
                    if (interaction instanceof ol.interaction.Draw) {
                      dojo.config.map.removeInteraction(interaction);
                    }
                  });
             
                  // show buffer controls
                  var distanceDiv = this.bufferDistance;
                  var unitsDiv = this.bufferUnits;

                  distanceDiv.set("disabled", false);
                  unitsDiv.set("disabled", false);
                  domStyle.set("bufferLabel", "color", "black");

                  // clear features, define point source
                  this.drawLayerSource.clear();
                  var pointSource = this.drawLayerSource;
                  // add draw interaction
                  var pointInteraction = new ol.interaction.Draw({
                    source: pointSource,
                    type: "Point"
                  });
                  dojo.config.map.addInteraction(pointInteraction);

                  // interaction on draw start
                  pointInteraction.on('drawstart', function(e) {
                    // make sure havea distance
                    if (distanceDiv.get("value") === "") {
                      alert("Please enter a buffer distance.");
                      dojo.config.map.removeInteraction(pointInteraction);
                      return false;
                    }
                    // if previous features exist, clear them
                    if (pointSource.getFeatures().length > 0) {
                      pointSource.clear();
                    }                  
                  });
                  // interaction on draw end
                  pointInteraction.on('drawend', function(e) {

                    //get feature coords, buffer distance, and units
                    var coords = e.feature.getGeometry().getCoordinates();
                    var bufferDistance = distanceDiv.get("value");
                    var units = unitsDiv.get("value");
                    // convert units to meters
                    if (units === "km") {
                      bufferDistance *= 1000;
                    } else if (units === "ft") {
                      bufferDistance /= 3.2808;
                    } else if (units === "mi") {
                      bufferDistance /= 0.00062137;
                    } else if (units === "m") {
                      bufferDistance = bufferDistance;
                    }
                    // create circle, add to source
                    var circle = new ol.Feature(new ol.geom.Circle(coords, bufferDistance));
                    pointSource.addFeature(circle);
                    
                   
                    // reset search params, remove interaction
                    distanceDiv.set("disabled", true);
                    distanceDiv.set("value", "");
                    unitsDiv.set("disabled", true);
                    unitsDiv.set("value", "");
                    dojo.config.map.removeInteraction(pointInteraction);
                
                  });
                
            },
            polygonClick: function (evt) {

              // remove any previous draw interactions
              dojo.config.map.getInteractions().forEach(function (interaction) {
                if (interaction instanceof ol.interaction.Draw) {
                  dojo.config.map.removeInteraction(interaction);
                }
              });

              // hide buffer controls
              this.bufferDistance.set("disabled", true);
              this.bufferDistance.set("value", "");
              this.bufferUnits.set("disabled", true);
              this.bufferUnits.set("value", "");
              domStyle.set("bufferLabel", "color", "lightgray");

              // clear features, define polygon source
              this.drawLayerSource.clear();
              var polygonSource = this.drawLayerSource;
              // add draw interaction
              var polygonInteraction = new ol.interaction.Draw({
                source: polygonSource,
                type: "Polygon",
                //geometryFunction: new ol.interaction.Draw.createRegularPolygon(4)
              });
              dojo.config.map.addInteraction(polygonInteraction);

              // interaction on draw start
              polygonInteraction.on('drawstart', function(e) {
                // if previous features exist, clear them
                if (polygonSource.getFeatures().length > 0) {
                  polygonSource.clear();
                }                  
              });
              // interaction on draw end
              polygonInteraction.on('drawend', function(e) {
                dojo.config.map.removeInteraction(polygonInteraction);       
              });
            },
            clearClick: function (evt) {
                // remove all drawn features from map
                this.drawLayerSource.clear();
            },
            searchMapExtentChanged: function (evt) {
                try {
                    if (evt) {
                        // hide drawing pane
                        domStyle.set(this.drawingControlsPane.domNode, "display", "none");
                        // set search type
                        dojo.config.app.user.spatialSearchType = "mapExtent";
                    }
                } catch (e) {
                    alert("Error in search/Spatial.searchMapExtentChanged: " + e.message);
                }
            },
            searchMapShapeChanged: function (evt) {
                try {
                    if (evt) {
                        // hide drawing pane
                        domStyle.set(this.drawingControlsPane.domNode, "display", "block");
                        // set search type
                        dojo.config.app.user.spatialSearchType = "mapShape";
                    }
                } catch (e) {
                    alert("Error in search/Spatial.searchMapShapeChanged: " + e.message);
                }
            },
            initializeDrawing: function () {

                var pointStyleInit = new ol.style.Style({
                  fill: new ol.style.Fill({color: 'rgba(255, 0, 0, 0.35)'}),
                });
                // add layer to draw into
                if (this.drawLayer === null) {

                  this.drawLayerSource = new ol.source.Vector({});
                  
                  this.drawLayer = new ol.layer.Vector({
                    source: this.drawLayerSource,
                    properties: {
                      id: "spatialSelectionLayer"
                    },
                    visible: true,
                    style: pointStyleInit
                  });
                   
                  dojo.config.map.addLayer(this.drawLayer);
                }
            },
            addSelected: function() {
                // all selected sites to tray and unselect on map
                // get all visible search results
                var visibleSearchLayers = array.filter(dojo.config.map.layers,
                    function (layer) {
                        return (misc.isNumeric(layer.name) && layer.CLASS_NAME === "OpenLayers.Layer.Vector" && layer.visibility);
                    }
                );

                // add all selected sites to tray
                var selectedSiteFeatures = [];
                array.forEach(visibleSearchLayers,
                    function (layer) {
                        // get all selected sites from all layers
                        array.forEach(layer.features,
                            function (feature) {
                                // see if site is selected 
                                if (feature.renderIntent === "select") {
                                    selectedSiteFeatures.push(feature);
                                    // add to tray
                                    var atts = feature.attributes;
                                    array.forEach(atts.datasets,
                                        function (dataset) {
                                            // need to attach site object to dataset
                                            dataset.site =
                                                {
                                                    Latitude: atts.latitude,
                                                    Longitude: atts.longitude,
                                                    SiteDescription: atts.sitedescription,
                                                    SiteID: atts.siteid,
                                                    SiteName: atts.sitename
                                                };

                                            // publish a topic to insert into datasets store. 
                                            topic.publish("explorer/dataset/AddToTray", dataset, false);
                                        }
                                    );
                                    // unselect
                                    feature.renderIntent = "default";
                                } 
                            }
                        );

                        // redraw layer
                        layer.redraw();
                    }
                );
            },
            onBlur: function() {
                //console.log("blur");
                // deactivate all controls
                for (key in this.drawControls) {
                    control = this.drawControls[key];
                    control.deactivate();
                }
            },
            postCreate: function () {
                this.inherited(arguments);
                this.initializeDrawing();

                // listen for control key to be pressed
                //try {
                //    on(document, "keydown",
                //        function (evt) {
                //            //console.log(evt);
                //            //console.log(evt.keyCode);
                //            switch (evt.keyCode) {
                //                case keys.CTRL:
                //                    //console.log("control down");
                //                    break;
                //                default:
                //                    // handle left arrow
                //                    //console.log("key: " + evt.keyCode + " is down");
                //                    break;
                //            }
                //        }
                //    );

                //    on(document, "keyup",
                //        function (evt) {
                //            //console.log(evt);
                //            //console.log(evt.keyCode);
                //            switch (evt.keyCode) {
                //                case keys.CTRL:
                //                    //console.log("control up");
                //                    break;
                //                default:
                //                    // handle left arrow
                //                    //console.log("key: " + evt.keyCode + " is up");
                //                    break;
                //            }
                //        }
                //    );
                //} catch (e) {
                //    alert("error in search/Spatial.postCreate: " + e.message);
                //}
                

                // handle showing, hiding, and clearing drawing layer
                topic.subscribe("neotoma/search/HideDrawingLayer",
                    lang.hitch(this,function () {
                        this.drawLayer.setVisible(false);
                    })
                );

                topic.subscribe("neotoma/search/ShowDrawingLayer",
                    lang.hitch(this,function () {
                        this.drawLayer.setVisible(true);
                    })
                );

                topic.subscribe("neotoma/search/ClearDrawingLayer",
                    lang.hitch(this, function () {
                        this.drawLayerSource.clear();
                    })
                );
            }
        });
});
