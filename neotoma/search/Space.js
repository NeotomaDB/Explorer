define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/space.html", "dijit/_WidgetsInTemplateMixin", "dojo/request/script", "dojo/_base/lang", "dojo/topic", "dijit/registry", "dojo/store/Memory", "dojo/keys", "dojo/_base/array", "dojo/dom-class", "dojo/_base/config", "dojo/dom-style", "dijit/form/FilteringSelect", "dijit/form/Form", "dijit/layout/StackContainer", "dijit/form/RadioButton", "dijit/form/NumberTextBox", "neotoma/search/Shape"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, lang, topic, registry, Memory, keys, array, domClass, config, domStyle) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            searchResults: null,
            clearAll: function () {
                this.selectionType.set("value", "global");
                this.minAltitude.set("value", "");
                this.maxAltitude.set("value", "");
                this.searchExtent.set("value", true);
            },
            searchExtentChanged: function (val) {
                try {
                    if (val) {
                        // show spatial pane
                        this.stack.selectChild(this.extentSelect);
                        domStyle.set(this.stack.domNode,
                           {
                               height: "45px",
                               overflow: "hidden"
                           }
                        );
                        domStyle.set(this.extentSelect.domNode,
                          {
                              height: "45px",
                              overflow: "hidden"
                          }
                       );

                        // see if shape toolbar should be displayed
                        if (this.selectionType.get("value") === "shape") {
                            // show toolbar
                            // show toolbar
                            domClass.remove(this.shapeToolbar.domNode, "hide");
                            // add height
                            domStyle.set(this.stack.domNode,
                                {
                                    height: "80px"
                                }
                            );
                            domStyle.set(this.extentSelect.domNode,
                              {
                                  height: "80px"
                              }
                           );
                        }
                    }
                } catch (e) {
                    alert("Error in searchExtentChanged: " + e.message);
                }
            },
            searchGeopoliticalChanged: function (val) {
                if (val) {
                    try {
                        // show geopolitical pane
                        this.stack.selectChild(this.geopoliticalSelect);
                        domStyle.set(this.stack.domNode,
                           {
                               height: "120px",
                               overflow: "hidden"
                           }
                        );
                        domStyle.set(this.geopoliticalSelect.domNode,
                          {
                              height: "120px",
                              overflow: "hidden"
                          }
                       );
                    } catch (e) {
                        alert("Error in searchGeopoliticalChanged: " + e.message);
                    }
                   
                }
            },
            selectionTypeChanged: function (val) {
                if (val === "shape") {
                    // show toolbar
                    domClass.remove(this.shapeToolbar.domNode, "hide");

                    // add height
                    domStyle.set(this.stack.domNode,
                        {
                            height: "80px"
                        }
                    );
                    domStyle.set(this.extentSelect.domNode,
                      {
                          height: "80px"
                      }
                   );

                    // make sure layer is visible
                    topic.publish("neotoma/search/ShowDrawingLayer");
                } else {
                    //hide toolbar
                    domClass.add(this.shapeToolbar.domNode, "hide");

                    // remove height
                    domStyle.set(this.stack.domNode,
                        {
                            height: "45px"
                        }
                    );
                    domStyle.set(this.extentSelect.domNode,
                      {
                          height: "45px"
                      }
                   );

                    // make sure layer is hidden
                    topic.publish("neotoma/search/HideDrawingLayer");
                }
            },
            handleEnter: function (evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        this.doSearch();
                        break;
                }
            },
            unit1Changed: function(val) {
                // get the selected id
                // clear units 2 and 3
                this.geopoliticalUnit2.get("store").data = [];
                this.geopoliticalUnit2.set("value", "");
                this.geopoliticalUnit2.set("placeHolder", "");
                this.geopoliticalUnit3.get("store").data = [];
                this.geopoliticalUnit3.set("value", "");
                this.geopoliticalUnit3.set("placeHolder", "");

                // set unit2 choices
                var params = { jsonp: "callback", query: { id: val } };
                script.get(config.dataServicesLocation + "/GeopoliticalUnits",
                    params
                ).then(lang.hitch(this.geopoliticalUnit2, function (response) {
                    //topic.publish("neotoma/search/StopBusy");
                    try {
                        if (response.success) {
                            // populate store if there are records, otherwise show message
                            if (response.data.length > 0) {
                                // populate store
                                this._set("store", new Memory({ idProperty: "GeoPoliticalID", data: response.data }));
                            } else {
                                this.set("placeHolder", "No sub units");
                            }

                        } else {
                            alert("response error in search/Space.unit1Changed: " + response.message);
                        }
                    } catch (e) {
                        alert("error in search/Space.unit1Changed: " + e.message);
                    }
                }));
            },
            unit2Changed: function(val) {
                // get the selected id
                // clear unit 3
                this.geopoliticalUnit3.get("store").data = [];
                this.geopoliticalUnit3.set("value", "");
                this.geopoliticalUnit3.set("placeHolder", "");

                // set unit2 choices
                var params = { jsonp: "callback", query: { id: val } };
                script.get(config.dataServicesLocation + "/GeopoliticalUnits",
                    params
                ).then(lang.hitch(this.geopoliticalUnit3, function (response) {
                    //topic.publish("neotoma/search/StopBusy");
                    try {
                        if (response.success) {
                            // populate store if there are records, otherwise show message
                            if (response.data.length > 0) {
                                // populate store
                                this._set("store", new Memory({ idProperty: "GeoPoliticalID", data: response.data }));
                            } else {
                                this.set("placeHolder", "No sub units");
                            }

                        } else {
                            alert("response error in search/Space.unit2Changed: " + response.message);
                        }
                    } catch (e) {
                        alert("error in search/Space.unit2Changed: " + e.message);
                    }
                }));
            },
            _getValueAttr: function () {
                // see if doing geopolitical or extent
                if (this.searchExtent.get("value")) {
                    // see what kind of extent is selected
                    var searchType = this.selectionType.get("value");
                    var response = {
                        type: searchType
                    }

                    // add spatial search component

                    switch (searchType) {
                        case "global":
                            // no spatial component
                            break;
                        case "extent":
                            // get map extent
                            response["bbox"] = dojo.config.map.getExtent().transform(dojo.config.app.wmProj,dojo.config.app.llProj).toGeometry().toString();
                            break;
                        case "shape":
                            // get user shape
                            var layers = dojo.config.map.getLayersByName("spatialSelectionLayer");
                            if (layers.length === 0) {
                                alert("Can't find selection layer. Please draw a selection area on the map.");
                                return null;
                            } else {
                                var layer = layers[0];
                                if (layer.features.length === 0) {
                                    alert("The selection layer is empty. Please draw a selection area on the map.");
                                    return null;
                                } else {
                                    var geom = layer.features[0].geometry.clone();
                                    geom.transform(dojo.config.app.wmProj, dojo.config.app.llProj);
                                    response["wkt"] = geom.toString();
                                }
                            }
                            break;
                    }

                    // add altitude
                    if (this.minAltitude.get("value")) {
                        response["minAltitude"] = this.minAltitude.get("value");
                    }
                    if (this.maxAltitude.get("value")) {
                        response["maxAltitude"] = this.maxAltitude.get("value");
                    }
                    
                    // if only one property, return null
                    var count = 0;
                    for (k in response) {
                        count += 1;
                    }
                    if (count === 1) {
                        return null;
                    } else {
                        return response;
                    }
                } else if (this.searchGeopolitical.get("value")) {
                    var gpId = this.geopoliticalUnit3.get("value") || this.geopoliticalUnit2.get("value") || this.geopoliticalUnit1.get("value");
                    if (gpId) {
                        return {
                            type: "geoPolitical",
                            gpId: gpId
                        };
                    } else {
                        return null;
                    }
                }
            },
            postCreate: function() {
                this.inherited(arguments);

                // populate top level geopolitical
                if (this.geopoliticalUnit1.get("store").data.length === 0) {
                    script.get(config.dataServicesLocation + "/GeopoliticalUnits",
                        { jsonp: "callback" }
                    ).then(lang.hitch(this.geopoliticalUnit1, function (response) {
                        //topic.publish("neotoma/search/StopBusy");
                        try {
                            if (response.success) {
                                // populate store
                                this._set("store", new Memory({ idProperty: "GeoPoliticalID", data: response.data }));
                            } else {
                                alert("response error loading first level of geopolitical units: " + response.message);
                            }
                        } catch (e) {
                            alert("error in search/Space loading first level of geopolitical units: " + e.message);
                        }
                    }));
                }

            }
        });
    });