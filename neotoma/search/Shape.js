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
                // active correct control
                for (var key in this.drawControls) {
                    var control = this.drawControls[key];
                    if (key === "box") {
                        control.activate();
                    } else {
                        control.deactivate();
                    }
                }
                // show buffer controls
                this.bufferDistance.set("disabled", true);
                this.bufferUnits.set("disabled", true);
                domStyle.set("bufferLabel", "color", "lightgray");
            },
            pointClick: function (evt) {
                try {
                    // active correct control
                    for (var key in this.drawControls) {
                        var control = this.drawControls[key];
                        if (key === "point") {
                            control.activate();
                        } else {
                            control.deactivate();
                        }
                    }
                   
                } catch (e) {
                    control.activate();
                }

                // show buffer controls
                this.bufferDistance.set("disabled", false);
                this.bufferUnits.set("disabled", false);
                domStyle.set("bufferLabel", "color", "black");
                
            },
            polygonClick: function (evt) {
               try {
                    // active correct control
                    for (var key in this.drawControls) {
                        var control = this.drawControls[key];
                        if (key === "polygon") {
                            control.activate();
                        } else {
                            control.deactivate();
                        }
                    }
                } catch (e) {
                    control.activate();
                }
                
                // show buffer controls
                this.bufferDistance.set("disabled", true);
                this.bufferUnits.set("disabled", true);
                domStyle.set("bufferLabel", "color", "lightgray");
            },
            clearClick: function (evt) {
                // remove all drawn features from map
                this.drawLayer.destroyFeatures();
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
                // add layer to draw into
                if (this.drawLayer === null) {
                    this.drawLayer = new OpenLayers.Layer.Vector("spatialSelectionLayer",
                        {
                            visibility: true,
                            styleMap: this.getStyleMap(),
                            displayInLayerSwitcher: false
                        }
                    );
                    dojo.config.map.addLayers([this.drawLayer]);
                }
                
                // listen for features to be added. Intercept points and add a circle with the buffer radius
                this.drawLayer.events.register("beforefeatureadded", null,
                    lang.hitch(this, function (obj) {
                        try {
                            // clear out any existing features
                            this.drawLayer.destroyFeatures();

                            // handle different geometry types
                            switch (obj.feature.geometry.CLASS_NAME) {
                                case "OpenLayers.Geometry.Point":
                                    var distance = this.bufferDistance.get("value");
                                    var units = this.bufferUnits.get("value");
                                    
                                    // make sure havea distance
                                    if (distance === "") {
                                        alert("Please enter a buffer distance.");
                                        return false;
                                    }

                                    // convert distance to meters
                                    switch (units) {
                                        case "km":
                                            distance *= 1000;
                                            break;
                                        case "ft":
                                            distance /= 3.2808;
                                            break;
                                        case "mi":
                                            distance /= 0.00062137;
                                            break;
                                    }
                                    
                                    obj.feature.geometry = OpenLayers.Geometry.Polygon.createRegularPolygon(obj.feature.geometry, distance, 30, 30);
                                    break;
                                case "OpenLayers.Bounds":
                                    // get box coordinates in map units
                                    var coords = obj.feature.geometry.toArray();
                                    var swLonLat = dojo.config.map.getLonLatFromPixel({ x: coords[0], y: coords[1] });
                                    var neLonLat = dojo.config.map.getLonLatFromPixel({ x: coords[2], y: coords[3] });

                                    // Create linearring first for polygon
                                    var ring = new OpenLayers.Geometry.LinearRing();

                                    // clockwise ring
                                    ring.addComponent(new OpenLayers.Geometry.Point(swLonLat.lon, swLonLat.lat), 0);
                                    ring.addComponent(new OpenLayers.Geometry.Point(swLonLat.lon, neLonLat.lat), 1);
                                    ring.addComponent(new OpenLayers.Geometry.Point(neLonLat.lon, neLonLat.lat), 2);
                                    ring.addComponent(new OpenLayers.Geometry.Point(neLonLat.lon, swLonLat.lat), 3);

                                    // change obj's geometry to polygon
                                    obj.feature.geometry = new OpenLayers.Geometry.Polygon([ring]);

                                    //return false;
                                    break;
                                default:
                                    break;
                            }

                            // stop drawing
                            // HACK: try to figure out what is null instead of ignoring the exception
                            //var controlKey = null;
                            try {
                                for (var controlKey in this.drawControls) {
                                    this.drawControls[controlKey].deactivate();
                                }
                            } catch (e) {
                                //_alert(e.message);
                                this.drawControls[controlKey].deactivate();
                            } 
                        } catch (e) {
                            alert("error in search/Shape beforefeatureadded: " + e.message);
                        }
                    })
                );

                // add draw controls
                this.drawControls = {
                    point: new OpenLayers.Control.DrawFeature(this.drawLayer,
                        OpenLayers.Handler.Point),
                    box: new OpenLayers.Control.DrawFeature(this.drawLayer,
                        OpenLayers.Handler.Box),
                    polygon: new OpenLayers.Control.DrawFeature(this.drawLayer,
                        OpenLayers.Handler.Polygon)
                };

                // add handlers to map
                for (var key in this.drawControls) {
                    dojo.config.map.addControl(this.drawControls[key]);
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
                        this.drawLayer.setVisibility(false);
                    })
                );

                topic.subscribe("neotoma/search/ShowDrawingLayer",
                    lang.hitch(this,function () {
                        this.drawLayer.setVisibility(true);
                    })
                );

                topic.subscribe("neotoma/search/ClearDrawingLayer",
                    lang.hitch(this, function () {
                        this.drawLayer.destroyFeatures();
                    })
                );
            }
        });
});