define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/all.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/store/Memory", "dojo/_base/array", "dojo/dom", "dojo/dom-construct", "dojo/dom-class", "dojo/number", "dijit/popup", "dojo/request/script", "dojo/topic", "dojo/_base/config", "dojo/dom-style", "dojo/on", "dojo/window", "dojo/dom-geometry", "dijit/Tooltip", "dijit/layout/ContentPane", "dijit/TitlePane", "./Metadata", "./Space", "./Time", "./Taxa", "dijit/form/Button", "dojox/widget/Standby", "dijit/Toolbar"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, array, dom, domConstruct, domClass, numberUtil, popup, script, topic, config, domStyle, on, win, domGeometry, Tooltip) {
        // define widget
        return declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            searchResults: null,
            searchId: 1,
            advancedHeight: 400,
            minSearchWidth: 360,
            minSearchHeight: 300,
            resizeHandleSize: 8,
            _createSearchToolbarTooltips: function () {
                try {
                    var tooltips = [
                        { widget: this.toggleSectionsButton, label: "Expand/Collapse all sections" },
                        { widget: this.clearAllButton, label: "Clear all" }
                    ];

                    array.forEach(tooltips, lang.hitch(this, function (tooltip) {
                        if (!tooltip.widget || !tooltip.widget.domNode) {
                            return;
                        }
                        this.own(new Tooltip({
                            connectId: [tooltip.widget.domNode],
                            label: tooltip.label,
                            position: ["below-centered", "above-centered"]
                        }));
                    }));
                } catch (e) {
                    alert("Error in search/All._createSearchToolbarTooltips: " + e.message);
                }
            },
            clearAll: function () {
                // see which form is open
                if (this.forms.selectedChildWidget === this.advancedPane) {
                    // clear all sections
                    this.taxaPane.clearAll();
                    this.timePane.clearAll();
                    this.spacePane.clearAll();
                    this.metadataPane.clearAll();

                    // clear dataset type
                    this.datasetType.set(
                        {
                            value: "",
                            displayedValue: "",
                            placeHolder: ""
                        }
                    );
                } 
            },
            datasetTypeChanged: function(val) {
                if (val) {
                    // clear taxa sub-form before reloading
                    this.taxaPane.clearAll();

                    // set the taphonomic systems for this dataset type
                    script.get(config.appServicesLocation + "/TaphonomySystems",
                        { jsonp: "callback", query: { datasetTypeId: val } }
                    ).then(lang.hitch(this, function (response) {
                        if (response.success) {
                            this.taxaPane.setTaphonomySystems(response.data);
                            this.taxaPane.clearElementType();
                        } else {
                            alert("error in search/All.datasetTypeChanged: " + response.message);
                        }
                    }));

                    this.taxaPane.set("taxonNameStore", val);
                } else {
                    // clear out and previous data
                    this.taxaPane.setTaphonomySystems([]);
                    // allow all taxon names
                    this.taxaPane.set("taxonNameStore", val);
                    this.taxaPane.clearElementType();
                }
            },
            toolbarClick: function(evt) {
                var curHeight = 0;
                var newHeight = 0;
                switch (evt.currentTarget.name) {
                    case "advancedSearch":
                        this.forms.selectChild(this.advancedPane);
                        // set height
                        domStyle.set(this.advancedPane.domNode, "height", this.advancedHeight + "px");
                        // set search name
                        topic.publish("neotoma/search/NewSearchName", "default");
                        break;
                    case "clearAll":
                        this.clearAll();
                        break;
                    case "incHeight":
                        curHeight = domStyle.get(this.advancedPane.domNode, "height");
                        newHeight = curHeight + 100;
                        if (newHeight <= 800) {
                            domStyle.set(this.advancedPane.domNode, "height", newHeight + "px");
                        }
                        break;
                    case "decHeight":
                        curHeight = domStyle.get(this.advancedPane.domNode, "height");
                        newHeight = curHeight - 100;
                        if (newHeight >= 400) {
                            domStyle.set(this.advancedPane.domNode, "height", newHeight + "px");
                        }
                        break;
                    case "toggleSections":
                        // make sure advanced form is show
                        if (this.forms.selectedChildWidget !== this.advancedPane) {
                            alert("Please open the advanced search form first.");
                            return;
                        }

                        // see if all expanded
                        if ((this.taxaTitlePane.get("open")) && (this.timeTitlePane.get("open")) && (this.spaceTitlePane.get("open")) && (this.metadataTitlePane.get("open"))) {
                            // close
                            this.taxaTitlePane.set("open", false);
                            this.timeTitlePane.set("open", false);
                            this.spaceTitlePane.set("open", false);
                            this.metadataTitlePane.set("open", false);
                        } else {
                            // open
                            this.taxaTitlePane.set("open", true);
                            this.timeTitlePane.set("open", true);
                            this.spaceTitlePane.set("open", true);
                            this.metadataTitlePane.set("open", true);
                        }

                        // show basic search
                        break;
                }
            },
            searchClick: function () {
                if (this.forms.selectedChildWidget === this.advancedPane) {
                    this.doSearch(this.searchName.get("value"));
                } else {
                    this.doSearch();
                }
            },
            doSearch: function() {
                var allParams = {};

                // add any tokens. If empty string, then that is passed - no tokens.
                allParams.tokens = dojo.config.app.tokens;

                // get parameters from sections
                allParams.taxa = this.taxaPane.get("value");
                allParams.time = this.timePane.get("value");
                allParams.space = this.spacePane.get("value");
                allParams.metadata = this.metadataPane.get("value");

                // check whether to stop
                if (allParams.metadata === "stop") {
                    return;
                }

                // add dataset type id
                allParams.datasetTypeId = this.datasetType.get("value");

                // make sure something is entered
                var stop = true;
                for (param in allParams) {
                    if (allParams[param]) {
                        stop = false;
                    }
                }
                if (stop) {
                    alert("No search criteria entered.");
                    return;
                }

                // make sure there is a search name
                var searchName = this.searchName.get("value");
                if (searchName === "") {
                    searchName = "Search 1";
                    this.searchName.set("value", "Search 1");
                }

                // send search request
                topic.publish("neotoma/search/StartBusy");
                script.get(config.appServicesLocation + "/Search",
                   { jsonp: "callback", query: { search: JSON.stringify(allParams) } }
               ).then(
                    lang.hitch(this, function (response) {
                        topic.publish("neotoma/search/StopBusy");
                        try {
                            if (response.success) {
                                // stop if nothing was returned
                                if (response.data.length === 0) {
                                    alert("No datasets found");
                                    return;
                                } else {
                                    var numDatasets = 0;
                                    var numSites = 0;
                                    array.forEach(response.data,
                                        function (site) {
                                            numSites += 1;
                                            numDatasets += site.datasets.length;
                                        }
                                    );
                                    var siteStr = "sites";
                                    var datasetsStr = "datasets";
                                    if (numSites === 1) {
                                        siteStr = "site";
                                    }
                                    if (numDatasets === 1) {
                                        datasetsStr = "dataset";
                                    }
                                    alert(numSites + " " + siteStr + " with " + numDatasets + " " + datasetsStr + " found");
                                }

                                // set results
                                this.searchResults = response.data;
                                topic.publish("neotoma/search/NewResult", {
                                    data: response.data,
                                    searchName: searchName,
                                    request: this.searchRequest,
                                    numDatasets: numDatasets,
                                    numSites: numSites
                                });

                                // set next default search name
                                this.searchId += 1;
                                this.searchName.set("value", "Search " + this.searchId);
                            } else {
                                alert("server error in search/All trying search: " + response.message);
                            }
                        } catch (e) {
                            alert("Error in search/All loading search results: " + e.message);
                        }
                    }),
                    function (response) {
                        alert("error in search/All trying search: " + response);
                    }
               );
            },
            show: function() {
                this.inherited(arguments);

                // show drawing layer
                topic.publish("neotoma/search/ShowDrawingLayer");
            },
            hide: function() {
                this.inherited(arguments);

                // hide and clear drawing layer
                topic.publish("neotoma/search/HideDrawingLayer");
                topic.publish("neotoma/search/ClearDrawingLayer");
            },
            handleEnter: function (evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        this.searchClick();
                        break;
                }
            },
            _createResizeHandle: function (edge) {
                return domConstruct.create("div", {
                    "class": "searchDialogResizeHandle searchDialogResizeHandle" + edge,
                    title: "Drag to resize search form"
                }, this.domNode);
            },
            _startResize: function (edge, evt) {
                try {
                    evt.preventDefault();
                    evt.stopPropagation();

                    this.bringToFront(this);

                    var viewPort = win.getBox();
                    var position = domGeometry.position(this.domNode);
                    var startAdvancedHeight = domStyle.get(this.advancedPane.domNode, "height");
                    var startX = evt.pageX;
                    var startY = evt.pageY;
                    var startLeft = position.x;
                    var startWidth = position.w;
                    var maxRightWidth = viewPort.w - startLeft - this.resizeHandleSize;
                    var maxLeftWidth = startWidth + startLeft - this.resizeHandleSize;
                    var maxHeight = Math.max(this.minSearchHeight, viewPort.h - position.y - 80);
                    var moveHandle = null;
                    var upHandle = null;

                    domClass.add(this.domNode, "searchDialogResizing");

                    var stopResize = lang.hitch(this, function () {
                        domClass.remove(this.domNode, "searchDialogResizing");

                        if (moveHandle) {
                            moveHandle.remove();
                        }
                        if (upHandle) {
                            upHandle.remove();
                        }

                        var newPosition = domGeometry.position(this.domNode);
                        this._left = newPosition.x;
                        this._top = newPosition.y;
                        this._leftPercent = parseFloat(this._left / win.getBox().w);
                        this._topPercent = parseFloat(this._top / win.getBox().h);
                        this._initialWidth = newPosition.w;
                    });

                    var resize = lang.hitch(this, function (moveEvt) {
                        var width = startWidth;
                        var left = startLeft;

                        if (edge === "Right") {
                            width = Math.min(maxRightWidth, Math.max(this.minSearchWidth, startWidth + moveEvt.pageX - startX));
                            domStyle.set(this.domNode, "width", width + "px");
                        } else if (edge === "Left") {
                            width = Math.min(maxLeftWidth, Math.max(this.minSearchWidth, startWidth - (moveEvt.pageX - startX)));
                            left = startLeft + (startWidth - width);
                            left = Math.max(this.resizeHandleSize, left);

                            domStyle.set(this.domNode, {
                                left: left + "px",
                                width: width + "px"
                            });

                            this._relativePosition = {
                                x: left,
                                y: position.y
                            };
                        } else if (edge === "Bottom") {
                            this.advancedHeight = Math.min(maxHeight, Math.max(this.minSearchHeight, startAdvancedHeight + moveEvt.pageY - startY));
                            domStyle.set(this.advancedPane.domNode, "height", this.advancedHeight + "px");
                        }

                        if (this.forms && this.forms.resize) {
                            this.forms.resize();
                        }
                    });

                    moveHandle = on(this.ownerDocument, "mousemove", resize);
                    upHandle = on(this.ownerDocument, "mouseup", stopResize);
                } catch (e) {
                    alert("Error in search/All._startResize: " + e.message);
                }
            },
            _enableResizeHandles: function () {
                try {
                    domClass.add(this.domNode, "searchDialogResizable");

                    array.forEach(["Left", "Right", "Bottom"], lang.hitch(this, function (edge) {
                        var handle = this._createResizeHandle(edge);
                        this.own(on(handle, "mousedown", lang.hitch(this, function (evt) {
                            this._startResize(edge, evt);
                        })));
                    }));
                } catch (e) {
                    alert("Error in search/All._enableResizeHandles: " + e.message);
                }
            },
            postCreate: function () {
                this.inherited(arguments);
                this._enableResizeHandles();
                this._createSearchToolbarTooltips();

                // open setting form so it reads and applies any settings
                mainToolbar.openUserSettings(true);

                // populate dataset types
                script.get(config.appServicesLocation + "/DatasetTypes",
                    { jsonp: "callback" }
                ).then(lang.hitch(this.datasetType, function (response) {
                    if (response.success) {
                        this._set("store", new Memory({ idProperty: "datasettypeid", data: response.data }));
                    } else {
                        alert("error in search/All.postCreate loading dataset types: " + response.message);
                    }
                }));

                // listen for show busy topic
                topic.subscribe("neotoma/search/StartBusy",
                    lang.hitch(this, function () {
                        // hide spinner
                        try {
                            this.searchStandby.show();
                        } catch (e) {
                            alert("error in search/All.postCreate show spinner: " + e.message);
                        }
                    })
                );

                // listen for hide busy topic
                topic.subscribe("neotoma/search/StopBusy", lang.hitch(this, function () {
                    // hide spinner
                    try {
                        this.searchStandby.hide();
                    } catch (e) {
                        alert("error in search/All.postCreate hide spinner: " + e.message);
                    }
                }));


                // listen for new search name
                topic.subscribe("neotoma/search/NewSearchName",
                    lang.hitch(this, function (newSearchName) {
                        if (newSearchName === "default") {
                            this.searchName.set("value", "Search " + this.searchId);
                        } else {
                            this.searchName.set("value", newSearchName);
                        }
                    })
                );

                // listen for new form height
                topic.subscribe("neotoma/search/NewFormHeight",
                    lang.hitch(this, function (newHeight) {
                        this.advancedHeight = newHeight;
                        domStyle.set(this.advancedPane.domNode, "height", newHeight + "px");
                    })
                );

                // listen for form to be changed
                topic.subscribe("neotoma/search/SetForm",
                    lang.hitch(this, function (formName) {
                        lang.hitch(this,this.toolbarClick(
                            {
                                currentTarget: {
                                    name: formName + "Search"
                                }
                            }
                        ));
                    })
                );
            }
        });
    });
    
