define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/all.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/store/Memory", "dojo/_base/array", "dojo/dom", "dojo/dom-construct", "dojo/dom-class", "dojo/number", "dijit/popup", "dojo/request/script", "dojo/topic", "dojo/_base/config", "dijit/layout/ContentPane", "dijit/TitlePane", "./Metadata", "./Space", "./Time", "./Taxa", "dijit/form/Button", "dojox/widget/Standby", "dijit/Toolbar"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, array, dom, domConstruct, domClass, numberUtil, popup, script, topic, config) {
        // define widget
        return declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            searchResults: null,
            searchId: 1,
            clearAll: function() {
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
            },
            datasetTypeChanged: function(val) {
                if (val) {
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
                switch (evt.currentTarget.name) {
                    case "basicSearch":
                        alert("Show basic search.");
                        // show basic search
                        break;
                    case "advancedSearch":
                        alert("Show advanced search.");
                        // show basic search
                        break;
                    case "clearAll":
                        this.clearAll();
                        break;
                    case "toggleSections":
                        alert("Expand/Collapse all sections.");
                        // show basic search
                        break;
                }
            },
            searchClick: function () {
                var allParams = {};
 
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

                // send search request
                topic.publish("neotoma/search/StartBusy");
                script.get(config.appServicesLocation + "/Search",
                   { jsonp: "callback", query:{ search:JSON.stringify(allParams)} }
               ).then(
                    lang.hitch(this,function (response) {
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
                                            numDatasets += site.Datasets.length;
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
                                var searchName = "Search " + this.searchId;
                                this.searchResults = response.data;
                                this.searchName = searchName;
                                topic.publish("neotoma/search/NewResult", {
                                    data: response.data,
                                    searchName: searchName,
                                    request: this.searchRequest
                                });
                                this.searchId += 1;
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

                //console.log(allParams);
            },
            handleEnter: function (evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        this.searchClick();
                        break;
                }
            },
            postCreate: function () {
                this.inherited(arguments);

                // populate dataset types
                script.get(config.appServicesLocation + "/DatasetTypes",
                    { jsonp: "callback" }
                ).then(lang.hitch(this.datasetType, function (response) {
                    if (response.success) {
                        this._set("store", new Memory({ idProperty: "DatasetTypeID", data: response.data }));
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
            }
        });
    });