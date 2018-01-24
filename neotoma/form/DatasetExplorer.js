define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/datasetExplorer.html", "dijit/_WidgetsInTemplateMixin",
   "dojo/request/script", "dojo/_base/lang", "dijit/Tooltip", "dgrid/OnDemandGrid", "dgrid/Grid", "neotoma/widget/_StoreMixin", "dgrid/extensions/DijitRegistry",
   "dojo/store/Memory", "dgrid/ColumnSet", "dgrid/extensions/ColumnResizer", "dojo/dom-style", "dojo/dom-construct", "dojo/dom-class", "dojo/dom-attr", "dojo/on", 
   "dojo/number", "dijit/registry", "dojo/dom", "dojo/has", "dojo/_base/array", "neotoma/util/export", "dojo/aspect", "dojo/_base/config", "dojo/topic", "dojo/when", "dojo/Deferred",
   "neotoma/form/StratigraphicDiagram", 
   "neotoma/widget/TabContainer", "dojox/widget/Standby", "dijit/layout/BorderContainer", "dijit/form/FilteringSelect", "neotoma/form/ChartPane", 
   "dijit/layout/StackContainer", "dijit/form/CheckBox", "dijit/form/Button", "dijit/form/Textarea", "dojo/domReady!"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, lang, Tooltip, OnDemandGrid, Grid, StoreMixin, DijitRegistry, 
      Memory, ColumnSet, ColumnResizer, domStyle, domConstruct, domClass, domAttr, on, numberUtil, registry, dom, has, array, exExport, aspect, config,topic, when, Deferred) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            chronNotesBtnClicked: function () {
                try {
                    var btn = this.chronNotesBtn;
                    if (btn) {
                        switch (btn.get("label")) {
                            case "Show Notes":
                                // show notes
                                domStyle.set(this.chronologyNotes.domNode, "visibility", "visible");
                                this.chronNotesTA.set("value", btn.get("notes"));
                                // set label
                                btn.set("label", "Hide Notes");
                                break;
                            case "Hide Notes":
                                // hide notes
                                domStyle.set(this.chronologyNotes.domNode, "visibility", "hidden");
                                this.chronNotesTA.set("value", "");
                                // set label
                                btn.set("label", "Show Notes");
                                break;
                        }
                    }
                } catch (e) {
                    alert("Error displaying chron notes: " + e.message);
                }
                
            },
            selectedChronologyChanged: function(chronId) {
                require(["dojo/dom"],
                   lang.hitch(this, function (dom) {
                       // make sure chron notes cleared out and hidden
                       this.chronNotesTA.set("value", "");
                       domStyle.set(this.chronologyNotes.domNode, "visibility", "hidden");
                       this.chronNotesBtn.set("label", "Show Notes");

                       // clear out chron info
                       if (dom.byId("chronInfo")) {
                           dom.byId("chronInfo").innerHTML = "";
                       }

                       // get chron object
                       var chron = registry.byId("datasetChronologies").get("item");
                       if (chron) {
                           var content = ["<table class='chronmeta'>"];
                           content.push("<tr class='lbl'><td>Name</td></tr>");
                           content.push("<tr><td>" + chron.ChronologyName + "</td></tr>");
                           content.push("<tr class='lbl'><td>Age type</td></tr>");
                           content.push("<tr><td>" + chron.AgeType + "</td></tr>");
                           //content.push("<tr><td>Depth: " + chron.MinDepth + "-" + chron.MaxDepth + "</td></tr>");
                           //content.push("<tr><td>Age: " + chron.MinAge + "-" + chron.MaxAge + "</td></tr>"); // from samples
                           content.push("<tr class='lbl'><td>Reliable age range <img src='resources/images/miniQuest.png' id='ageRangeHelp' class='miniHelp'></td></tr>");
                           content.push("<tr><td>" + chron.AgeOlder + " to " + chron.AgeYounger + "</td></tr>"); // from chron
                           content.push("<tr class='lbl'><td>Age model</td></tr>");
                           content.push("<tr><td>" + chron.AgeModel + "</td></tr>");
                           content.push("<tr class='lbl'><td>Default</td></tr>");
                           content.push("<tr><td>" + chron.Default + "</td></tr>");

                           content.push("</table>");

                           // display chron info
                           if (dom.byId("chronInfo")) {
                               dom.byId("chronInfo").innerHTML = content.join("");
                           }

                           // create tooltip for reliable age range explanation
                           new Tooltip({
                               connectId: ["ageRangeHelp"],
                               label: "<div class='ttThin'>Age range within which the chronology is reliable. For the purpose of plotting diagrams on an age scale, samples may be assigned ages beyond the reliable age range. However, these ages are unreliable and should not be used for further analysis. The reliability of any chronology depends on the quality of dating and on the age model applied, thus even ages within the reliable age range should be used with caution and should be evaluated for the question being asked.</div>"
                           });

                           // see if there are notes
                           if (chron.Notes) {
                               // show button
                               domStyle.set(this.chronNotesBtn.domNode, "visibility", "visible");

                               // attach notes to chronNotesBtn
                               //var notes = JSON.stringify(chron.Notes);
                               this.chronNotesBtn.set("notes", chron.Notes);
                           } else {
                               // hide button
                               domStyle.set(this.chronNotesBtn.domNode, "visibility", "hidden");

                               // no notes
                               this.chronNotesBtn.set("notes", "");
                           }

                           // display chart
                           this._displayChronologiesChart(chronId);
                       }  
                   }
                ));
            },
            toggleStandby: function(show) {
                if (show) {
                    this.standby.show();
                } else {
                    this.standby.hide();
                }
            },
            toggleStratigraphicStandby: function(show){
                if (show) {
                    this.stratigraphicStandby.show();
                } else {
                    this.stratigraphicStandby.hide();
                }
            },
            showSamplesTab: function() {
                // make sure samples tab is active
                this.tabContainer.selectChild(this.samplesTab);
            },
            currentDatasetId: null,
            resizeChartContainer: function() {
                alert("resized");
            },
            _sheetResponse: null,
            _datasetResponse: null,
            _datasetType: null, 
            _databaseName: null,
            downloadData: function () {
                // see what kind of dataset to download
                var selectedTabContainer = this.datasetExplorerTabsContainer.selectedChildWidget;

                switch (selectedTabContainer.params.dojoAttachPoint) {
                    case "tabContainer":
                        // initialize list with header data
                        var data = this._createHeaderRecordsNew(this._sheetResponse).data;

                        // add variables data
                        data = data.concat(this._sheetResponse.variables);
                        
                        break;
                    case "geoChronTabContainer":
                        var store = this._geochronGrid.get("store");
                        var data = store.data;
                        break;
                }
                return exExport.csv(data);
            },
            loadDataset: function (datasetId, datasetType, databaseName, responseWithSite) {
                try {
                    this._datasetType = datasetType;
                    this._databaseName = databaseName;
                    var geoChronTabNames = ["geochronologyTab","siteTab"];
                    var regularTabNames = ["samplesTab", "siteTab",  "diagramTab", "chronologyTab", "publicationsTab"];

                    // see if geochronologic
                    if (datasetType === "geochronologic") {
                        // set this.currentDatasetId
                        this.currentDatasetId = datasetId;
                   
                        // load geochron data
                        script.get(config.appServicesLocation + "/Geochronologies",
                            { jsonp: "callback", query:{datasetId:datasetId} }
                        ).then(lang.hitch(this,
                            function (response) {
                                try {
                                    if (response.success) {
                                        // see if initial run
                                        var initRun = true;
                                        if (this._geochronGrid) {
                                            initRun = false;
                                        }

                                        // get the site
                                        var currentSiteObj = responseWithSite || dojo.config.app.forms.sitePopup.sites[dojo.config.app.forms.sitePopup.siteIndex];

                                         // create site object to cache
                                        if (currentSiteObj.data != null) {
                                            this.site = {
                                                SiteID: currentSiteObj.data.SiteID || null,
                                                SiteName: currentSiteObj.data.SiteName || null,
                                                SiteDescription: currentSiteObj.data.SiteDescription || null,
                                                Latitude: currentSiteObj.Latitude || currentSiteObj.data.Latitude,
                                                Longitude: currentSiteObj.Longitude || currentSiteObj.data.Longitude,
                                                SiteNotes: currentSiteObj.data.SiteNotes || null
                                            };
                                        } else {
                                            this.site = {
                                                SiteID: currentSiteObj.SiteID || null,
                                                SiteName: currentSiteObj.SiteName || null,
                                                SiteDescription: currentSiteObj.SiteDescription || null,
                                                Latitude: currentSiteObj.LatitudeSouth || null,
                                                Longitude: currentSiteObj.LongitudeEast || null,
                                                SiteNotes: currentSiteObj.SiteNotes || null
                                            };
                                        }

                                        // add site to response to be like others
                                        var results = response.data;
                                        results.Site = this.site;

                                        // display geochron data
                                        this._displayGeochronDataset(response.data.Samples);

                                        // load site meta data
                                        this.loadGeochronSiteMetadata(results.Site);

                                        // load publications
                                        this._loadGeoChronPublications(datasetId, response.data.DatasetPIs);

                                        // make sure displays the first time
                                        if (initRun) {
                                            this.geoChronTabContainer.selectChild(this.geoChronSiteTab);
                                            this.geoChronTabContainer.selectChild(this.geochronologyTab);
                                        }

                                        // not busy
                                        this.toggleStandby(false);
                                    } else {
                                        alert("error getting geochronology data: " + response.message);
                                        // not busy
                                        this.toggleStandby(false);
                                        return;
                                    }
                                } catch (e) {
                                    alert("response error in form/DatasetExplorer.loadDataset: " + e.message);
                                    // not busy
                                    this.toggleStandby(false);
                                }
                            }
                        ),
                            function(response) {
                                alert("Error in form/DatasetExplorer.loadDataset: " + response);
                                // not busy
                                this.toggleStandby(false);
                            }
                        );

                        // show geochron tabs
                        this.datasetExplorerTabsContainer.selectChild(this.geoChronTabContainer);

                        // change title
                        this.getParent().set("title", "Dataset ID: " + datasetId + " | " + databaseName);
                        
                        return; // don't continue. 
                    } else {
                        // show main tabs
                        this.datasetExplorerTabsContainer.selectChild(this.tabContainer);
                    }
                    //clear yAxis change handler for stratigraphic chart
                    this.clearYAxisChangeHandler();
                    //clear prior chart if one exists
                    if(dojo.config.diagrammer){
                        dojo.config.diagrammer.clearChart();                   
                    }        
                    // send request to Downloads resource
                    script.get(config.dataServicesLocation + "/Downloads/" + datasetId,
                        { jsonp: "callback" }
                    ).then(lang.hitch(this, function (response) {
                        try {
                            if (response.success) {
                                if (response.data.length === 0) {
                                    alert("No data found for datasetId: " + datasetId);
                                    // not busy
                                    this.toggleStandby(false);
                                    return;
                                }
                                this._datasetResponse = response.data[0];

                                // see if first time
                                var initRun = true;
                                if (this._samplesGrid) {
                                    initRun = false;
                                }

                                // make sure samples tab is active
                                this.tabContainer.selectChild(this.samplesTab);

                                // set currentDatasetId
                                this.currentDatasetId = datasetId;

                                // parse with brian's function
                                this._sheetResponse = this._formatSheet(this._datasetResponse.Samples);
                               
                                // load samples (header grid)
                                this._displaySamples(this._sheetResponse);

                                // load variables (main grid)
                                this._displayVariables(this._sheetResponse);

                                if (initRun) {
                                    
                                    // briefly select stratigraphic diagram tab to try to initialize
                                    this.tabContainer.selectChild(this.diagramTab);
                                    dojo.config.diagrammer = dijit.registry.byId("diagrammer");
                                    //use same reference to store configuration data for chart
                                    dojo.config.diagrammer.config = {};
                                    this.diagrammer = dojo.config.diagrammer;
                                }

                                // load chronologies & retreive additional chronology data; return parsed chronology array
                                this._parseChronologies(this._datasetResponse.Samples, this._datasetResponse.DefChronologyID);
                                /*
                                var chronologies = this._parseChronologies(this._datasetResponse.Samples, this._datasetResponse.DefChronologyID);
                                var dlg = this;
                                var deferred = new Deferred();
                                deferred.then(function(chronologies){
                                    dlg.configureStratigraphicDiagram(datasetId, datasetType, dlg._datasetResponse.DefChronologyID, chronologies);
                                }, function(err){
                                  console.log("error obtaining chronologies from parseChronologies()");
                                });

                                deferred.resolve(chronologies);
                                */


                                
                                // enable tab if appropriate
                                if (datasetType == "pollen" || datasetType == "diatom" || datasetType == "ostracode" ) {
                                        // enable pollen diagram tab
                                        this.diagramTab.set("disabled", false);
                                       
                                } else {
                                        // disable pollen diagram tab
                                        this.diagramTab.set("disabled", true);
                                }

                                // load site meta data
                                this._loadSiteMetadata(this._datasetResponse.Site);

                                // load publications
                                this._loadPublications(datasetId, this._datasetResponse.DatasetPIs);

                                // change title
                                this.getParent().set("title", "Dataset ID: " + datasetId + " | " + this._datasetResponse.DatabaseName);

                                //HACK. 
                                if (initRun) {
                                    // briefly select chron chart tab to try to initialize
                                    this.tabContainer.selectChild(this.chronologyTab);

                                    // briefly select pollen diagram tab to try to initialize
                                    this.tabContainer.selectChild(this.diagramTab);
                                    dojo.config.diagrammer = dijit.registry.byId("diagrammer");
                                    //use same reference to store configuration data for chart
                                    dojo.config.diagrammer.config = {};
                                    this.diagrammer = dojo.config.diagrammer;
                                   
                                    //HACK. This gets the grids to display on the first search. Otherwise they don't render unless the samplesTab is hidden and shown once
                                // Problem started after moving tab container to stack container to have geochron tabs.
                                    this.tabContainer.selectChild(this.siteTab);
                                    this.tabContainer.selectChild(this.samplesTab);
                                }

                                 //populate diagrammer configuration
                                 //this.configurePollenDiagram(this._sheetResponse, this._datasetResponse.DefChronologyID);

                                //update diagram legend
                                d3.selectAll(".stratDiagram")
                                      .selectAll(".hide")
                                      .classed("hide",false);
                                switch(datasetType){
                                  case 'pollen':
                                    d3.selectAll(".diatom-legend")
                                      .classed("hide",true);
                                    d3.selectAll(".ostracode-legend")
                                      .classed("hide",true);
                                    break;
                                  case 'ostracode':
                                    d3.selectAll(".diatom-legend")
                                      .classed("hide",true);
                                    d3.selectAll(".pollen-legend")
                                      .classed("hide",true);
                                    break;
                                  case 'diatom':
                                    d3.selectAll(".pollen-legend")
                                      .classed("hide",true);
                                    d3.selectAll(".ostracode-legend")
                                      .classed("hide",true);
                                    break;
                                  default:
                                    break;
                                }

                                //configure stratigraphic charts
                                //this.configurePollenDiagram(this._datasetResponse.DefChronologyID);
                                
                                // not busy
                                this.toggleStandby(false);
                            } else {
                                alert("error in form/DatasetExplorer.loadDataset: " + response.message);
                                // not busy
                                this.toggleStandby(false);
                            }
                        } catch (e) {
                            alert("error in form/DatasetExplorer.loadDataset parsing response: " + e.message);
                            // not busy
                            this.toggleStandby(false);
                        }
                    })); // end then function
                } catch (e) {
                    alert("error in form/DatasetExplorer.loadDataset" + e.message);
                    // not busy
                    this.toggleStandby(false);
                }
            },
            configureFaunaDiagram: function(data) {
                //console.log(data.variables);
                //console.log(JSON.stringify(data));
            },
            _loadGeoChronPublications: function (datasetId, datasetPIs) {
                // clear out any previous publications
                this.geoChronPublicationsTab.set("content", "");
                // get publications for dataset
                script.get(config.dataServicesLocation + "/Publications/",
                        { jsonp: "callback", query: { datasetId: datasetId } }
                    ).then(lang.hitch(this, function (resp) {
                        try {
                            var content = null;
                            var authorsList = null;
                            var authors = null;
                            var pt = this.geoChronPublicationsTab;

                            if (resp.success) {
                                // create string of PI names
                                if (datasetPIs) {
                                    if (datasetPIs.length > 0) {
                                        var pis = [];
                                        array.forEach(datasetPIs,
                                            function (piObj) {
                                                pis.push(piObj.ContactName);
                                            }
                                        );

                                        // add pis
                                        domConstruct.place(domConstruct.create("p", { innerHTML: "PIs: " + pis.join("; "), class: "cite" }), pt.domNode);
                                    }
                                }
                                

                                // add all publications to tab
                                if (resp.data.length > 0) {
                                    array.forEach(resp.data, function (publication) {
                                        domConstruct.place(domConstruct.create("p", { innerHTML: publication.Citation, class: "cite" }), pt.domNode);
                                    });
                                }
                                else {
                                    domConstruct.place(domConstruct.create("p", { innerHTML: "No publications found for this dataset." }), pt.domNode);
                                }
                            } else {
                                alert("Error retrieving GeoChron publications: " + resp.message);
                            }
                        } catch (e) {
                            alert("error in DatasetExplorer._loadGeochronPublications: " + e.message);
                        }
                    }));
            },
            _loadPublications: function (datasetId, datasetPIs) {
                // clear out any previous publications
                this.publicationsTab.set("content", "");
                // get publications for dataset
                script.get(config.dataServicesLocation + "/Publications/",
                        { jsonp: "callback", query: {datasetId:datasetId} }
                    ).then(lang.hitch(this,function (resp) {
                        try {
                            var content = null;
                            var authorsList = null;
                            var authors = null;
                            var pt = this.publicationsTab;

                            if (resp.success) {
                                // create string of PI names
                                var pis = [];
                                array.forEach(datasetPIs,
                                    function (piObj) {
                                        pis.push(piObj.ContactName);
                                    }
                                );

                                // add pis
                                domConstruct.place(domConstruct.create("p", { innerHTML: "PIs: " + pis.join("; "), class: "cite" }), pt.domNode);

                                // add all publications to tab
                                if (resp.data.length > 0) {
                                    array.forEach(resp.data, function (publication) {
                                        domConstruct.place(domConstruct.create("p", {innerHTML:publication.Citation, class:"cite"}), pt.domNode);
                                    });
                                }
                                else {
                                    domConstruct.place(domConstruct.create("p", {innerHTML:"No publications found for this dataset."}), pt.domNode);
                                }
                            } else {
                                alert("Error retrieving publications: " + resp.message);
                            }
                        } catch (e) {
                            alert("error in DatasetExplorer._loadPublications: " + e.message);
                        }
                    }));
            },
            _formatSheet: function (inSamples) {
                var inSample = null;
                var inSampleDataArray = null;
                var inSampleData = null;
                var outVariables = {};
                var outVariable = null;
                var newVariable = null;
                var outSamples = [];
                var outSample = null;
                var outChrons = {};
                var outChron = null;
                var inSampAge;
                var outSampAge;
                var varNum = 1;
                var varId;

                try {
                    // loop through raw samples and construct/denormalize all variables (rows) and samples (columns)
                    var numRawSamples = inSamples.length;
                    for (var i = 0; i < numRawSamples; i++) {
                        inSample = inSamples[i];
                        outSample = {};

                        // assign outSample inSample property values; if null, assign out property ""
                        outSample["sampleId"] = inSample.SampleID;
                        outSample["sampleName"] = inSample.SampleName || "";
                        outSample["unitName"] = inSample.AnalysisUnitName || "";
                        outSample["depth"] = inSample.AnalysisUnitDepth || "";
                        outSample["thickness"] = inSample.AnalysisUnitThickness || "";

                        // add to outSamples
                        outSamples.push(outSample);

                        // create chron objects to hold age data; chron object includes array of sample age strings by sampleId
                        for (var ci = 0; ci < inSample.SampleAges.length; ci++) {
                            inSampAge = inSample.SampleAges[ci];
                            if (inSampAge.ChronologyID) {
                                outChron = outChrons["C" + inSampAge.ChronologyID];
                                // create new outChron object if doesn't exist
                                if (!outChron) {
                                    outChron = {};
                                    outChron["chronId"] = inSampAge.ChronologyID;
                                    outChron["chronName"] = inSampAge.ChronologyName;
                                    outChron["ageType"] = inSampAge.AgeType;
                                    outChron["sampAges"] = [];
                                    outChrons["C" + inSampAge.ChronologyID] = outChron;
                                }
                                // create string representation of sample age (e.g. AgeOlder/Age/AgeYounger) and add to chron's SampAges array
                                outSampAge = (inSampAge.AgeOlder || "--") + "/" +
                                    (inSampAge.Age || "--") + "/" +
                                    (inSampAge.AgeYounger || "--");
                                outChron.sampAges.push({ sampleId: inSample.SampleID, ageStr: outSampAge });
                            }
                        }

                        // loop through raw SampleData array, create variable objects to hold values for samples
                        inSampleDataArray = inSample.SampleData;
                        var numSampleData = inSampleDataArray.length;
                        var thisValue = null;
                        for (var si = 0; si < numSampleData; si++) {
                            // inSampleData = variable and its value
                            inSampleData = inSampleDataArray[si];

                            // check if variable is in our list; if not, create it
                            varId = this._getVariableId(inSampleData, outVariables);
                            if (!varId) {
                                varId = "V" + varNum;
                                varNum += 1;
                                // create new new Variable stub from inSampleData properties
                                newVariable = {};
                                newVariable["name"] = inSampleData.TaxonName;
                                //newVariable["group"] = inSampleData.TaxaGroup;
                                newVariable["group"] = inSampleData.EcolGroupID;
                                newVariable["element"] = inSampleData.VariableElement;
                                newVariable["units"] = inSampleData.VariableUnits;
                                newVariable["context"] = inSampleData.VariableContext || "";
                                //TODO: handle VariableModifications array
                                outVariables[varId] = newVariable;
                            }
                            
                            // see if value is presence/abscense
                            thisValue = inSampleData.Value;
                            if (inSampleData.VariableUnits === "present/absent") {
                                if (thisValue === 1) {
                                    thisValue = "+";
                                }
                            }

                            // add value of variable for this sample
                            outVariable = outVariables[varId];
                            outVariable["S" + inSample.SampleID] = thisValue;
                            outVariables[varId] = outVariable;
                        } // next sample data (i.e. variable)

                    } // next sample

                    // put variables in alphabetic order by taxon name
                    // build an index
                    var index = [];
                    for (var k in outVariables) {
                        if (outVariables.hasOwnProperty(k)) {
                            index.push({ key: k, name: outVariables[k]["name"] });
                        }
                    }
                    // sort the variables index
                    index.sort(function (a, b) {
                        var as = a['name'],
                            bs = b['name'];
                        return as == bs ? 0 : (as > bs ? 1 : -1);
                    });
                    // sort the sampleIds
                    var sampleIds = [];
                    for (var x = 0; x < outSamples.length; x++) {
                        sampleIds.push(outSamples[x]["sampleId"]);
                    }
                    sampleIds.sort();

                    // loop through sorted index and add variables to array of ordered rows
                    var varRow = null;
                    var varRows = [];
                    for (var vi = 0; vi < index.length; vi++) {
                        varRow = outVariables[index[vi]["key"]];
                        // add all missing samples and give empty values
                        for (var n = 0; n < sampleIds.length; n++) {
                            if (!varRow.hasOwnProperty("S" + sampleIds[n])) {
                                varRow["S" + sampleIds[n]] = ""
                            }
                        }
                        varRows.push(varRow);
                    }

                    // for simplicity and consistency with other return object properties, convert outChrons from object to array
                    var aOutChrons = [];
                    for (var o in outChrons) {
                        if (outChrons.hasOwnProperty(o)) {
                            aOutChrons.push(outChrons[o]);
                        }
                    }

                    // return formatted data as an object
                    return { variables: varRows, samples: outSamples, sampleChrons: aOutChrons };

                } catch (e) {
                    console.log("formatSheet: " + e.message);
                }
            },
            _getVariableId: function(inVar, list) {
                var outVar;
                for (var key in list) {
                    if (list.hasOwnProperty(key)) {
                        outVar = list[key];
                        if (outVar.name == inVar.TaxonName) {
                            if (outVar.element == inVar.VariableElement) {
                                if (outVar.units == inVar.VariableUnits) {
                                    if ((outVar.context == inVar.VariableContext) || (!outVar.context && !inVar.VariableContext)) {
                                        return key;
                                    }
                                }
                            }
                        }
                    }
                }
                return null;
            },
            _chronologyTabShown: function () {
                // populate datasetChronologies combobox
                this.datasetChronologies.set("store",
                    new Memory({
                        idProperty: "ChronologyID",
                        data: this._chronologyChartData["chronologies"]
                    }
                ));

                // try to set default chron if there is no selected chron
                if (this.datasetChronologies.get("value") === "") {
                    // set default chron
                    if (this._chronologyChartData["defaultChron"]) {
                        this.datasetChronologies.set("value", this._chronologyChartData["defaultChron"]["ChronologyID"]);
                    }
                }
            },
            _chronologyChartData: {},
            _chronologyChart: null,
            _chronologyChartStore: null,
            _chronologyChartStoreSeries: null,
            _displayChronologiesChart: function (chronID) {
                require(["dojo/store/Observable", "dojo/store/Memory", "dojox/charting/Chart", "dojox/charting/themes/Claro", "dojox/charting/StoreSeries", "dojo/dom-style", "dojox/charting/SimpleTheme", "neotoma/widget/ChartTooltip", "dojox/charting/action2d/Magnify", "dojox/charting/plot2d/Candlesticks", "dojox/charting/axis2d/Default", "dojox/charting/plot2d/Default", "dojox/charting/plot2d/Lines", "dojox/charting/axis2d/Default", "dojox/charting/plot2d/Candlesticks", "dojox/charting/plot2d/Grid"],
                    lang.hitch(this, function (Observable, Memory, Chart, theme, StoreSeries, domStyle, SimpleTheme, Tooltip, Magnify) {
                        if (!chronID) { //  use default
                            if (this._chronologyChartData["defaultChron"]) {
                                var chartData =  this._chronologyChartData["chartData"][this._chronologyChartData["defaultChron"]["ChronologyID"]] ;
                                var chartChron = this._chronologyChartData["defaultChron"];
                            } else {
                                alert("This dataset has no default chronology. Please select one to create a chart.");
                                return;
                            }
                        } else { // load based on passed in chron id
                            var chartData = this._chronologyChartData["chartData"][chronID];

                            // if no chartData, stop
                            if (chartData) {
                                if (chartData.length === 0) {
                                    //this.chronologyTab.set("disabled", true);
                                    return false;
                                }
                            } else {
                                return false;
                            }
                           

                            // get the chronology to chart
                            var chartChron = null;
                            var chronologies = this._chronologyChartData["chronologies"];
                            var numChrons = chronologies.length;
                            for (var i = 0; i < numChrons; i++) {
                                if (chronologies[i].ChronologyID === chronID) {
                                    chartChron = chronologies[i];
                                    break;
                                }
                            }
                            
                            // if doesn't have MaxDepth and MinDepth then hide tab and stop
                            if ((!chartChron.MaxDepth) && (!chartChron.MinDepth)) {
                                this.chronologyTab.set("disabled", true);
                                return false;
                            }
                           
                            //if got here, tab should be enabled
                            this.chronologyTab.set("disabled", false);
                        }
                        
                        // destroy any existing chart
                        if (this._chronologyChart) {
                            this._chronologyChart.destroy();
                            this._chronologyChart = null;
                        }

                        // see whether to show chart
                        var showChart = true;
                        if (!chartChron.MaxDepth) {
                            showChart = false;
                        } else {
                            if (chartChron.MaxDepth - chartChron.MinDepth === 0) {
                                showChart = false;
                            }
                        }

                        // chart default chronology
                        if (!showChart) {
                            //this.chartMessagePane.set("content", "This dataset has no chronology chart.");
                            //this._chronologyChart = new ContentPane({ content: "No chart" }, "chronologyChartContainer");
                            //alert("no chart");
                        }  else if (this._chronologyChart == null) {
                            //this.chartMessagePane.set("content", "");
                            this._chronologyChart = new Chart("chronologyChartContainer", { id: "chronologyChart" });

                            // Set the theme
                            //this._chronologyChart.setTheme(theme);
                            //var myTheme = new SimpleTheme({
                            //    markers: {
                            //        CIRCLE: "m-6,0 c0,-8 12,-8 12,0, m-12,0 c0,8 12,8 12,0",
                            //        SQUARE: "m-6,-6 12,0 0,12 -12,0z"
                            //    }
                            //}
                            //);
                            //this._chronologyChart.setTheme(myTheme);

                            // calculate min and max age and depth. Buffer mins and maxs
                            var bufferRatio = 0.05;
                            var ageSpread = parseInt(chartChron.MaxAge - chartChron.MinAge);
                            var depthSpread = parseInt(chartChron.MaxDepth - chartChron.MinDepth);
                            var minAge = Math.floor(chartChron.MinAge - (bufferRatio * ageSpread));
                            var maxAge = Math.ceil(chartChron.MaxAge + (bufferRatio * ageSpread));
                            var minDepth = parseInt(chartChron.MinDepth - (bufferRatio * depthSpread));
                            var maxDepth = parseInt(chartChron.MaxDepth + (bufferRatio * depthSpread));
                            //console.log("minDepth: " + minDepth + " maxDepth: " + maxDepth);
                            
                            // calculate depth tick steps
                            var minorTickStep = 50;
                            var majorTickStep = 100;
                            if (maxDepth) {
                                if (maxDepth < 50) {
                                    minorTickStep = 5;
                                    majorTickStep = 10;
                                } else if (maxDepth < 100) {
                                    minorTickStep = 10;
                                    majorTickStep = 20;
                                }
                            }

                            //// calculate age tick steps
                            //var ageMinorStep = 5000; // was 1000
                            //var ageMajorStep = 10000; // was 2000
                            //if (maxAge) {
                            //    if (maxAge < 100) {
                            //        ageMinorStep = 10;
                            //        ageMajorStep = 20;
                            //    } else if (maxAge < 250) {
                            //        ageMinorStep = 25;
                            //        ageMajorStep = 50;
                            //    } else if (maxAge < 500) {
                            //        ageMinorStep = 50;
                            //        ageMajorStep = 100;
                            //    } else if (maxAge < 1000) {
                            //        ageMinorStep = 100;
                            //        ageMajorStep = 200;
                            //    } else if (maxAge < 25000) {
                            //        ageMinorStep = 1750;
                            //        ageMajorStep = 2500;
                            //    } else if (maxAge < 50000) {
                            //        ageMinorStep = 2500;
                            //        ageMajorStep = 5000;
                            //    } else if (maxAge < 1000) {
                            //        ageMinorStep = 100;
                            //        ageMajorStep = 200;
                            //    }
                            //}
                            //ageMinorStep = 500;
                            //ageMajorStep = 1000;

                            // calculate age tick steps
                            //var ageSteps = this._calculateAgeTicks(minAge, maxAge);
                            var ageSteps = this._calcTickInfo(minAge, maxAge);
                            var ageMajorStep = ageSteps.ageMajorStep;
                            var ageMinorStep = ageSteps.ageMinorStep;

                            // adjust minAge if is negative
                            var minAgeAdjusted = minAge;
                            if (minAge < 0) {
                                minAgeAdjusted = minAge - ageMinorStep;
                            }


                            // add plots
                            this._chronologyChart.addPlot("controlCandle", {
                                type: "Candlesticks",
                                minBarSize: 10, // were both 6 from Brian
                                maxBarSize: 10,
                                hAxis: "AnalysisUnitDepth",
                                vAxis: "Age"
                            });

                            this._chronologyChart.addPlot("ageDepthLine", {
                                type: "Lines",
                                hAxis: "AnalysisUnitDepth",
                                vAxis: "Age",
                                markers: false
                            });


                            this._chronologyChart.addPlot("refGrid", {
                                type: "Grid",
                                hMajorLines: true,
                                hMinorLines: false,
                                vMajorLines: true,
                                vMinorLines: false,
                                renderOnAxis: false,
                                majorVLine: { style: "Dot", color: "#B5B5B5", width: 1 },
                                majorHLine: { style: "Dot", color: "#B5B5B5", width: 1 }
                            });

                            this._chronologyChart.addAxis("AnalysisUnitDepth", {
                                min: minDepth,
                                max: maxDepth,
                                majorTickStep: majorTickStep,
                                minorTickStep: minorTickStep,
                                minorLabels: false,
                                majorLabels: true, // wasn't here before
                                majorTick: { color: "#B5B5B5", length: 8, width: 1 },
                                minorTick: { color: "#B5B5B5", length: 4, width: 1 },
                                stroke: { color: "#B5B5B5", width: 1 },
                                titleFont: "normal normal bold 8pt Arial",
                                titleFontColor: "#8A8484",
                                title: "Depth (cm)",
                                titleOrientation: "away"
                            });

                            this._chronologyChart.addAxis("x", {
                                leftBottom: true, // was false
                                min: minDepth,
                                max: maxDepth,
                                majorTickStep: majorTickStep,
                                //minorTickStep: minorTickStep,
                                majorTick: { color: "#B5B5B5", length: 0, width: 1 },
                                stroke: { color: "#B5B5B5", width: 1 },
                                majorLabels: false,
                                minorTicks: false,
                                minorLabels: false,
                                microTicks: false
                            });

                            this._chronologyChart.addAxis("Age", {
                                vertical: true,
                                min: minAgeAdjusted,
                                max: maxAge,
                                majorTickStep: ageMajorStep, // was 2000
                                minorTickStep: ageMinorStep, // was 1000
                                fixUpper: "major",
                                fixLower:"minor",
                                minorLabels: false,
                                majorLabels: true, // wasn't here before
                                majorTick: { color: "#B5B5B5", length: 8, width: 1 },
                                minorTick: { color: "#B5B5B5", length: 4, width: 1 },
                                stroke: { color: "#B5B5B5", width: 1 },
                                titleFont: "normal normal bold 8pt Arial",
                                titleFontColor: "#8A8484",
                                title: "Age (" + chartChron.AgeType + ")"
                            });
                          
                            this._chronologyChart.addAxis("y", {
                                leftBottom: false,
                                vertical: true,
                                min: minAge,
                                max: maxAge,
                                majorTickStep: ageMajorStep, // was 2000
                                majorTick: { color: "#B5B5B5", length: 0, width: 1 },
                                stroke: { color: "#B5B5B5", width: 1 },
                                majorLabels: false,
                                minorTicks: false,
                                minorLabels: false,
                                microTicks: false
                            });

                            this._chronologyChartStore = new Observable(new Memory({
                                data: chartData,
                                idProperty: "SampleID"
                            }));

                            // create store series to try to update later
                            this._chronologyChartStoreSeries = new StoreSeries(this._chronologyChartStore, { query: {} }, { x: "AnalysisUnitDepth", y: "Age" });

                            // add sample age series to chart
                            this._chronologyChart.addSeries("ageDepthSeries", this._chronologyChartStoreSeries, {
                                plot: "ageDepthLine",
                                stroke: { cap: "round", color: "red", width: 3 }
                            });

                            // add chron controls to chart
                            this._chronologyChart.addSeries("controlSeries",
                                // use a store series to map chron control field names to candlestick field names
                                new StoreSeries(new Memory(
                                    {
                                        data: chartChron.controls, 
                                        idProperty: "ChronControlID"
                                    }),
                                    { query: {} },
                                    { id: "ChronControlID", x: "Depth", low: "AgeYoungest", close: "AgeYoungest", high: "AgeOldest", open: "AgeOldest", mid: "Age", type:"ControlType" }
                                ),
                                {
                                    plot: "controlCandle",
                                    stroke: { cap: "round", join: "round", color: "#B5B5B5", width: 1 }, // width:1 originally
                                    fill: "#B5B5B5"
                                }
                            );

                            // add tooltips
                            new Tooltip(this._chronologyChart, "controlCandle", {
                                text: function (o) {
                                    //console.log(o);
                                    return "<span style='font-size: 8pt; font-family: sans-serif;font-weight: bold;'>Type: </span><span style='font-size: 8pt; font-family: sans-serif;'>" + o.data.type + "</span><br/><span style='font-size: 8pt; font-family: sans-serif'>" + o.data.mid + " yr BP [<span style='color: red'>" + o.data.low +
                                           "</span>,<span style='color: green'>" + o.data.high + "</span>]" + " @ " + o.data.x + " cm </span>"
                                }
                            });

                            // add visual effects
                            new Magnify(this._chronologyChart, "controlCandle");
                        } // end create initial chart

                        // update ticks


                        // render initial chart or refresh
                        if (this._chronologyChart) {    
                            if (this._chronologyChart.declaredClass === "dojox.charting.Chart") {
                                this._chronologyChart.render();
                            }
                        }
                    }
                 ));
                
            },
            _calculateAgeTicks: function (minAge, maxAge) {
                // set the number of major ticks
                var numMajorTicks = 8;

                // get age range
                var ageRange = maxAge - minAge;

                // get major step
                var averageYears = Math.ceil((ageRange / numMajorTicks)/100) * 100;

                return { ageMajorStep: averageYears, ageMinorStep: averageYears / 2 };
            },
            _calcTickInfo: function(min,max) {
          var rawIntvl = (max - min)/10;
          var mag = 0;
          var norm = 0;
          var interval = 0;
          var startVal = 0;
      
          mag = Math.floor(Math.log(rawIntvl)*Math.LOG10E);
          norm = rawIntvl/Math.pow(10,mag);
      
          if (norm<1.5) {
            interval = Math.pow(10,mag)*1;
          }
          else if (norm<2.25) {
            interval = Math.pow(10,mag)*2.5;
          }
          else if (norm<3) {
            interval = Math.pow(10,mag)*2;
          }
          else if (norm<7.5) {
            interval = Math.pow(10,mag)*5;
          }
          else {
            interval = Math.pow(10,mag)*10;
          }
      
          startVal = interval*Math.ceil(min/interval);
      
          return {
              ageMajorStep: interval,
              ageMinorStep: interval / 2,
                    startVal: startVal
          };
        },
            _parseChronologies: function (samples, defaultChronId) {
                require(["dojo/store/Observable", "dojo/store/Memory", "dojox/charting/Chart", "dojox/charting/themes/Claro", "dojox/charting/StoreSeries", "dojox/charting/plot2d/Indicator","dojox/charting/action2d/MouseZoomAndPan", "dojo/dom-style", "dojox/charting/axis2d/Default", "dojox/charting/plot2d/Default", "dojox/charting/plot2d/Lines","dojox/charting/axis2d/Default","dojox/charting/plot2d/Candlesticks","dojox/charting/plot2d/Grid"],
                    lang.hitch(this, function (Observable, Memory, Chart, theme, StoreSeries, Indicator, MouseZoomAndPan, domStyle) {
                        
                        // hide legend if no ages because there will be no chart
                        if (samples[0].SampleAges[0].Age == null) {
                            // hide chronology legend
                            domStyle.set("chronologyLegend", "visibility", "hidden");
                        } else {
                            // show chronology legend
                            domStyle.set("chronologyLegend", "visibility", "visible");
                        }

                        // make sure sample ages have age values. If not then don't display chron.
                        //if (samples[0].SampleAges[0].Age == null) {
                        //    // disable chronologies tab
                        //    this.chronologyTab.set("disabled", true);
                        //    // stop
                        //    return;
                        //} else {
                        //    // enable chronologies tab in case was disabled
                        //    this.chronologyTab.set("disabled", false); // was false
                        //}


                        // enable chronologies tab in case was disabled
                        this.chronologyTab.set("disabled", false); // was false

                        // parse into chronologies first
                        var chronologies = [];
                        var chartData = {};
                        var numSamples = samples.length;
                        var sampleAges = null;
                        var thisSample = null;
                        var defaultChron = null;
                        for (var i = 0; i < numSamples; i++) {
                            thisSample = samples[i];
                            // look at sample ages to see how many chronologies there are. 1 chron/sample age
                            sampleAges = thisSample.SampleAges;
                            var numAges = sampleAges.length;
                            var thisAge = null;

                            // loop through ages (chronologies) for the sample to add each to chartData
                            for (var ai = 0; ai < numAges; ai++) {
                                // get this age
                                thisAge = sampleAges[ai];

                                // if first record, create chronologies and initialize chartData for this age (chron)
                                if (i === 0) { // only for first sample age
                                    // add to chronologies
                                    chronologies.push({
                                        ChronologyID: thisAge.ChronologyID || defaultChronId,
                                        ChronologyName: thisAge.ChronologyName || "default chronology",
                                        AgeType: thisAge.AgeType
                                    });
                                    // initialize chart data for age (chron)
                                    chartData[thisAge.ChronologyID] = [];

                                    // see if default chron
                                    if (thisAge.ChronologyID === defaultChronId) {
                                        // get default chronology
                                        defaultChron = chronologies[chronologies.length - 1];
                                    }

                                    // if not default chronology, make the first one the default
                                    if (defaultChron === null) {
                                        defaultChron = chronologies[0];
                                    }
                                }
                                // add sample to chartData for all records. Make sure has valid depth and age
                                if ((thisAge.Age != null) && (thisSample.AnalysisUnitDepth != null)) {
                                    // see if should be min
                                    if (!chronologies[ai].MinAge) {
                                        chronologies[ai].MinAge = thisAge.Age;
                                        chronologies[ai].MinDepth = thisSample.AnalysisUnitDepth;
                                    } else {
                                        if (thisAge.Age < chronologies[ai].MinAge) {
                                            chronologies[ai].MinAge = thisAge.Age;
                                        }
                                        //if (thisAge.Age < chronologies[ai].MaxDepth) {
                                        //    chronologies[ai].MaxDepth = thisSample.AnalysisUnitDepth;
                                        //}
                                    }

                                    // make sure can get chart data for this chronology
                                    if (!chartData[thisAge.ChronologyID]) {
                                        this.chronologyTab.set("disabled", true);
                                        return;
                                    }

                                    // add to chart data
                                    chartData[thisAge.ChronologyID].push({
                                        SampleID: thisSample.SampleID,
                                        AnalysisUnitDepth: thisSample.AnalysisUnitDepth,
                                        Age: thisAge.Age
                                    });

                                    // set each to max since are in age order
                                    if (!chronologies[ai].MaxAge) {
                                        chronologies[ai].MaxAge = thisAge.Age;
                                        chronologies[ai].MaxDepth = thisSample.AnalysisUnitDepth
                                    } else {
                                        if (thisAge.Age > chronologies[ai].MaxAge) {
                                            chronologies[ai].MaxAge = thisAge.Age;
                                        }
                                        if (thisAge.Age > chronologies[ai].MaxDepth) {
                                            chronologies[ai].MaxDepth = thisSample.AnalysisUnitDepth;
                                        }
                                    }
                                }
                            } // end loop over ages  
                        } // end loop over samples

                        // set data for chronology charting
                        this._chronologyChartData["chronologies"] = chronologies;
                        this._chronologyChartData["chartData"] = chartData;
                        this._chronologyChartData["defaultChron"] = defaultChron;
                        //console.log(this._chronologyChartData);

                        // destroy any existing chart
                        if (this._chronologyChart) {
                            this._chronologyChart.destroy();
                            this._chronologyChart = null;
                        }
                        // clear any previous value
                        this.datasetChronologies.set("value", "");

                        // retrieve data for chrons
                        this._retrieveChrons();

                        //return array of chronologies
                        return chronologies;
                    }
                 ));
            },
            _displayVariables: function (allData) {
                try {
                    // get tab for samples grid
                    var samplesTab = this.samplesTab;

                    // get columns
                    var resp = this._getFieldsAndColumnsNew(allData.samples);
                    var columns = resp.columns;

                    // create column sets
                    var frozenColumns = ['name', 'group', 'element', 'units', 'context'];
                    var set1 = [[]];
                    var set2 = [[]];
                    array.forEach(resp.columns,
                        function (inCol) {
                            if (frozenColumns.indexOf(inCol.field) === -1) {
                                set2[0].push(inCol);
                            } else {
                                set1[0].push(inCol);
                            }
                        }
                    );
                    var columnSets = [set1, set2];

                    // destroy any existing grid
                    if (this._samplesGrid) {
                        this._samplesGrid.destroy();
                        this._samplesGrid = null;
                    }

                    // create or get grid
                    if (this._samplesGrid == null) { // create grid
                        //this._samplesGrid = new declare([OnDemandGrid, ColumnResizer])({
                        //this._samplesGrid = new declare([Grid, ColumnSet, ColumnResizer, StoreMixin])({
                        this._samplesGrid = new declare([OnDemandGrid, ColumnSet, ColumnResizer, DijitRegistry])({
                            //columns: columns,
                            columnSets: columnSets,
                            id: "datasetExplorerGrid",
                            farOffRemoval: 10000,
                            minRowsPerPage: 25,
                            maxRowsPerPage: 50
                        });

                        // set style
                        domStyle.set(this._samplesGrid.domNode, {
                            position: "absolute",
                            top: "200px", 
                            height: "auto",
                            left: "5px",
                            bottom: "5px",
                            right: "5px",
                            padding: "1px 15px 1px 1px"
                        });

                        //// set scroll event handler
                        //on(this._samplesGrid.domNode, "scroll", lang.hitch(this, function (e) {
                        //    // handle the event
                        //    this._samplesHeaderGrid.scrollTo(this._samplesGrid.getScrollPosition());
                        //}));

                        // set scroll event handler for columnsets
                        on(this._samplesGrid._columnSetScrollers[1], "scroll", lang.hitch(this, function (e) {
                            // handle the event
                            this._samplesHeaderGrid._columnSetScrollers[1].scrollLeft = this._samplesGrid._columnSetScrollers[1].scrollLeft;
                        }));
                        on(this._samplesGrid._columnSetScrollers[0], "scroll", lang.hitch(this, function (e) {
                            // handle the event
                            this._samplesHeaderGrid._columnSetScrollers[0].scrollLeft = this._samplesGrid._columnSetScrollers[0].scrollLeft;
                        }));

                        // set column resize event handler
                        on(this._samplesGrid, "dgrid-columnresize", lang.hitch(this, function (e) {
                            this._samplesHeaderGrid.styleColumn(e.columnId, "width: " + e.width + "px;");
                        }));

                        // add data to grid
                        this._samplesGrid.set("class", "wideCols");
                        this._samplesGrid.set("store", new Memory({
                            idProperty: "name",
                            data: allData.variables
                        }));
                        this._samplesGrid.refresh();
                        this._samplesGrid.resize();

                        //// add samples grid to tab and start
                        //var samplesPane = new ContentPane();
                        //samplesPane.addChild(this._samplesGrid);
                        //samplesTab.addChild(samplesPane);
                        //this._samplesGrid.startup();
                        samplesTab.addChild(this._samplesGrid);
                    } else { // update data in grid
                        // update columns
                        this._samplesGrid.set("columns", columns);
                        this._samplesGrid.refresh();
                        // update data
                        this._samplesGrid.set("store", new Memory({
                            idProperty: "name",
                            data: allData.variables
                        }));
                        this._samplesGrid.refresh();
                        this._samplesGrid.resize();
                    }
                } catch(e) {
                    alert("_displayVariables: " + e.message);
                }
            },
            _displaySamples: function (allData) {
                try {
                    var samplesTab = this.samplesTab;

                    // get columns
                    var resp = this._createHeaderRecordsNew(allData);

                    // destroy any existing grid
                    if (this._samplesHeaderGrid) {
                        this._samplesHeaderGrid.destroy();
                        this._samplesHeaderGrid = null;
                    }

                    // create column sets
                    var frozenColumns = ['name', 'group', 'element', 'units', 'context'];
                    var set1 = [[]];
                    var set2 = [[]];
                    array.forEach(resp.columns,
                        function (inCol) {
                            if (frozenColumns.indexOf(inCol.field) === -1) {
                                set2[0].push(inCol);
                            } else {
                                set1[0].push(inCol);
                            }
                        }
                    );
                    var columnSets = [set1, set2];

                    // fix any rows with no data in any columns in set2
                    var checkNames = ["AnalysisUnitName", "Depth", "Thickness", "Sample Name"];
                    var foundValue = false;
                    array.forEach(resp.data,
                        function (row) {
                            if (checkNames.indexOf(row.name) !== -1) { // see if it is a row to check
                                foundValue = false;
                                // see if row has any values in columns other than frozen ones
                                for (prop in row) {
                                    if (frozenColumns.indexOf(prop) === -1) { // not a frozen column
                                        if (row[prop]) {
                                            foundValue = true;
                                        }
                                    }
                                }

                                // see if a value was found
                                if (!foundValue) {
                                    // change all to --
                                    for (prop in row) {
                                        if (frozenColumns.indexOf(prop) === -1) { // not a frozen column
                                            if (row[prop] === "") {
                                                row[prop] = "--";
                                            }
                                        }
                                    }
                                    
                                }
                            }
                        }
                    );

                    // create or get grid
                    if (this._samplesHeaderGrid == null) { // create grid
                        // create header grid
                        //this._samplesHeaderGrid = new declare([OnDemandGrid, ColumnSet, ColumnResizer])({
                        this._samplesHeaderGrid = new declare([Grid, ColumnSet, ColumnResizer, StoreMixin, DijitRegistry])({
                            //columns: resp.columns,
                            columnSets: columnSets,
                            id: "datasetExplorerHeaderGrid",
                            store: new Memory({
                                idProperty: "name",
                                data: resp.data
                            }),
                            showHeader: false
                        });

                        // style
                        var node = this._samplesHeaderGrid.domNode;
                        this._samplesHeaderGrid.set("class", "wideCols");
                        domStyle.set(node, {
                            position: "absolute",
                            top: "5px",
                            height: "210px", // was 185
                            left: "5px",
                            right: "5px",
                            padding: "1px 15px 1px 1px"
                            // overflow: "hidden",
                            //"overflow-style":"move"
                            //"overflow-x":"hidden",
                            //"overflow-y":"scroll"
                        });

                        // update header grid
                        this._samplesHeaderGrid.refresh();
                        this._samplesHeaderGrid.resize();

                        // add header grid to tab and start
                        //var headerPane = new ContentPane();
                        //headerPane.addChild(this._samplesHeaderGrid);
                        //samplesTab.addChild(headerPane);
                        //this._samplesHeaderGrid.startup();
                        samplesTab.addChild(this._samplesHeaderGrid);
                    } 
                } catch (e) {
                    alert("error in form/DatasetExplorer._displaySamples: " + e.message);
                }
            },
            refreshGeochronGrid: function () {
                if (this._geochronGrid) {
                    this._geochronGrid.refresh();
                    this._geochronGrid.resize();
                }
            },
            refreshDatasetGrids: function () {
                if (this._samplesGrid) {
                    this._samplesGrid.refresh();
                    this._samplesGrid.resize();
                }
                if (this._samplesHeaderGrid) {
                    this._samplesHeaderGrid.refresh();
                    this._samplesHeaderGrid.resize();
                }
            },
            _displayGeochronDataset: function (data) {
                try {
                    // get tab
                    var geochronologyTab = this.geochronologyTab;

                    // create or get grid
                    if (this._geochronGrid == null) { // create grid
                        this._geochronGrid = new declare([Grid, ColumnResizer, StoreMixin, DijitRegistry])({
                            columns: {
                                SampleID:"ID",
                                LabNumber: "Lab Number",
                                GeochronType: "Type",
                                MaterialDated:"Material Dated",
                                Age:"Age",
                                ErrorOlder:"Error Older",
                                ErrorYounger: "Error Younger",
                                Depth: "Depth",
                                Thickness: "Thickness",
                                //Delta13C:"Delta13C",
                                Notes:"Notes",
                                Infinite:"Infinite"
                            },
                            id: "geochronologyGrid"
                        });

                        // set style
                        domStyle.set(this._geochronGrid.domNode, {
                            position: "absolute",
                            top: "5px",
                            height: "98%", // was 185
                            left: "5px",
                            right: "5px",
                            padding: "1px 15px 1px 1px"
                        });

                        // add data to grid
                        this._geochronGrid.set("class", "wideCols");
                        this._geochronGrid.set("store", new Memory({
                            idProperty: "SampleID",
                            data: data
                        }));
                        this._geochronGrid.refresh();
                        this._geochronGrid.resize();

                        // add grid to tab and start
                        var samplesPane = new ContentPane();
                        samplesPane.addChild(this._geochronGrid);
                        geochronologyTab.addChild(samplesPane);
                        this._geochronGrid.startup();
                    } else { // update data in grid
                        // update data
                        this._geochronGrid.set("store", new Memory({
                            idProperty: "SampleID",
                            data: data
                        }));
                        this._geochronGrid.refresh();
                        this._geochronGrid.resize();
                    }
                } catch (e) {
                    alert("error in form/DatasetExplorer._displayGeochronDataset: " + e.message);
                }
            },
            _loadSiteMetadata: function (site) {
                //// create content
                //var content = [];
                //content.push("<h3>" + site.SiteName + "</h3> Site ID: " + site.SiteID);
                //content.push("Longitude: " + site.LongitudeEast);
                //content.push("Latitude: " + site.LatitudeNorth);
                //content.push("Altitude: " + site.Altitude);
                //if (site.SiteDescription) {
                //    content.push("Description: " + site.SiteDescription);
                //}

                //// set tab content
                //this.siteTab.set("content", content.join("<br/>"));

                try {
                    // clear out any existing data
                    this.siteTab.set("content", "");

                    // do as table
                    // create table for site metadata
                    var table = domConstruct.create("table");

                    // create and rows
                    var row = domConstruct.create("tr", {class:"fixht"}, table);
                    domConstruct.place(domConstruct.create("td", {innerHTML:"Site ID", class:"col1"}), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML:site.SiteID, class:"col2"}), row);
                    var row = domConstruct.create("tr", {class:"fixht"}, table);
                    domConstruct.place(domConstruct.create("td", {innerHTML: "Longitude", class:"col1"}), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML: numberUtil.format(site.Longitude, {pattern:"#.######"}), class:"col2"}), row);
                    var row = domConstruct.create("tr", {class:"fixht"}, table);
                    domConstruct.place(domConstruct.create("td", {innerHTML: "Latitude", class:"col1"}), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML: numberUtil.format(site.Latitude, {pattern:"#.######"}), class:"col2"}), row);
                    if (site.SiteDescription) {
                        var row = domConstruct.create("tr", {class:"fixht"}, table);
                        domConstruct.place(domConstruct.create("td", {innerHTML:"Description", class:"col1"}), row);
                        domConstruct.place(domConstruct.create("td", {innerHTML:site.SiteDescription, class:"col2"}), row);
                    }
                    if (site.SiteNotes) {
                        var row = domConstruct.create("tr", { class: "fixht" }, table);
                        domConstruct.place(domConstruct.create("td", { innerHTML: "Notes", class: "col1" }), row);
                        domConstruct.place(domConstruct.create("td", { innerHTML: site.SiteNotes, class: "col2" }), row);
                    }

                    // add class to table
                    domClass.add(table, "sitemeta");

                    // create site name header
                    var header = domConstruct.create("h3", { innerHTML: site.SiteName });

                    // add header to contents
                    domConstruct.place(header, this.siteTab.domNode);

                    // add table to contents
                    domConstruct.place(table, this.siteTab.domNode);
                } catch (e) {
                    alert("error in DatasetExplorer._loadSiteMetadata(): " + e.message);
                }
            },
            loadGeochronSiteMetadata: function (site) {
                try {
                    if (!site) {
                        return;
                    }
                    // clear out any existing data
                    this.geoChronSiteTab.set("content", "");

                    // do as table
                    // create table for site metadata
                    var table = domConstruct.create("table");

                    // create and rows
                    var row = domConstruct.create("tr", { class: "fixht" }, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Site ID", class: "col1" }), row);
                    domConstruct.place(domConstruct.create("td", { innerHTML: site.SiteID, class: "col2" }), row);
                    var row = domConstruct.create("tr", { class: "fixht" }, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Longitude", class: "col1" }), row);
                    domConstruct.place(domConstruct.create("td", { innerHTML: numberUtil.format(site.Longitude, { pattern: "#.######" }), class: "col2" }), row);
                    var row = domConstruct.create("tr", { class: "fixht" }, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Latitude", class: "col1" }), row);
                    domConstruct.place(domConstruct.create("td", { innerHTML: numberUtil.format(site.Latitude, { pattern: "#.######" }), class: "col2" }), row);
                    if (site.SiteDescription) {
                        var row = domConstruct.create("tr", { class: "fixht" }, table);
                        domConstruct.place(domConstruct.create("td", { innerHTML: "Description", class: "col1" }), row);
                        domConstruct.place(domConstruct.create("td", { innerHTML: site.SiteDescription, class: "col2" }), row);
                    }
                    if (site.SiteNotes) {
                        var row = domConstruct.create("tr", { class: "fixht" }, table);
                        domConstruct.place(domConstruct.create("td", { innerHTML: "Notes", class: "col1" }), row);
                        domConstruct.place(domConstruct.create("td", { innerHTML: site.SiteNotes, class: "col2" }), row);
                    }

                    // add class to table
                    domClass.add(table, "sitemeta");

                    // create site name header
                    if (site) {
                        var header = domConstruct.create("h3", { innerHTML: site.SiteName });
                    }
                    
                    // add header to contents
                    domConstruct.place(header, this.geoChronSiteTab.domNode);

                    // add table to contents
                    domConstruct.place(table, this.geoChronSiteTab.domNode);
                } catch (e) {
                    alert("error in form/DatasetExplorer.loadGeochronSiteMetadata(): " + e.message);
                }
            },
            _getFieldsAndColumnsNew: function (samples) {
                var columns = [
                    {
                        label: 'Name',
                        field: 'name',
                        formatter: function (value) {
                            return '<span title="' + value + '">' + value + '</span>';
                        }
                    },
                    {
                        label: 'Group',
                        field: 'group'
                    },
                    {
                        label: 'Element',
                        field: 'element',
                        formatter: function (value) {
                            return '<span title="' + value + '">' + value + '</span>';
                        }
                    },
                    {
                        label: 'Units',
                        field: 'units'
                    },
                    {
                        label: 'Context',
                        field: 'context',
                        formatter: function (value) {
                            return '<span title="' + value + '">' + value + '</span>';
                        }
                    }
                ];
                var fields = ["name", "group", "element", "units", "context"];

                // add depths to fields and columns
                var numDepths = samples.length;
                var name = null;
                for (var i = 0; i < numDepths; i++) {
                    name = 'S' + samples[i].sampleId;
                    // add to columns
                    columns.push({ label: name, field: name });
                    // add to field
                    fields.push(name);
                }
                // return
                return { columns: columns, fields: fields };
            },
            _samplesGrid: null,
            _geochronGrid: null,
            _samplesHeaderGrid: null,
            _createHeaderRecordsNew: function (allData) {
                var columns = [
                    { label: 'Name', field: 'name' },
                    {
                        label: 'Group',
                        field: 'group',
                        formatter: function (value) {
                            return '<span title="' + value + '">' + value + '</span>';
                        }
                    },
                    { label: 'Element', field: 'element' },
                    { label: 'Units', field: 'units' },
                    { label: 'Context', field: 'context' }
                ];
                var headerRecords = [];
                var thisSampleObj = null;
                var samples = allData.samples;
                var numDepths = samples.length;

                // add depths to columns array
                for (var i = 0; i < numDepths; i++) {
                    thisSampleObj = samples[i];
                    columns.push(
                        {
                            label: "S" + thisSampleObj.sampleId,
                            field: "S" + thisSampleObj.sampleId
                        }
                    );
                }

                // analysis unit name
                var thisHeaderRow = {};
                thisHeaderRow["name"] = "AnalysisUnitName";
                thisHeaderRow["group"] = "";
                thisHeaderRow["element"] = "";
                thisHeaderRow["units"] = "";
                thisHeaderRow["context"] = "";
                for (var i = 0; i < numDepths; i++) {
                    thisHeaderRow["S" + samples[i].sampleId] = samples[i].unitName;
                }
                headerRecords.push(thisHeaderRow);

                // depth
                var thisHeaderRow = {};
                thisHeaderRow["name"] = "Depth";
                thisHeaderRow["group"] = "";
                thisHeaderRow["element"] = "";
                thisHeaderRow["units"] = "";
                thisHeaderRow["context"] = "";
                for (var i = 0; i < numDepths; i++) {
                    thisHeaderRow["S" + samples[i].sampleId] = samples[i].depth;
                }
                headerRecords.push(thisHeaderRow);

                // thickness
                var thisHeaderRow = {};
                thisHeaderRow["name"] = "Thickness";
                thisHeaderRow["group"] = "";
                thisHeaderRow["element"] = "";
                thisHeaderRow["units"] = "";
                thisHeaderRow["context"] = "";
                for (var i = 0; i < numDepths; i++) {
                    thisHeaderRow["S" + samples[i].sampleId] = samples[i].thickness;
                }
                headerRecords.push(thisHeaderRow);

                // sample name
                var thisHeaderRow = {};
                thisHeaderRow["name"] = "Sample Name";
                thisHeaderRow["group"] = "";
                thisHeaderRow["element"] = "";
                thisHeaderRow["units"] = "";
                thisHeaderRow["context"] = "";
                for (var i = 0; i < numDepths; i++) {
                    thisHeaderRow["S" + samples[i].sampleId] = samples[i].sampleName;
                }
                headerRecords.push(thisHeaderRow);

                // sample id
                var thisHeaderRow = {};
                thisHeaderRow["name"] = "Sample ID";
                thisHeaderRow["group"] = "";
                thisHeaderRow["element"] = "";
                thisHeaderRow["units"] = "";
                thisHeaderRow["context"] = "";
                //console.log(thisDepthObj);
                for (var i = 0; i < numDepths; i++) {
                    thisHeaderRow["S" + samples[i].sampleId] = samples[i].sampleId;
                }
                headerRecords.push(thisHeaderRow);

                // add chronology records
                var chrons = allData.sampleChrons;
                var numChrons = chrons.length;
                var theseAges = null;
                for (var i = 0; i < numChrons; i++) {
                    // create row for this chron
                    var thisHeaderRow = {};
                    // add data to row
                    thisHeaderRow["name"] = chrons[i].chronName;
                    thisHeaderRow["group"] = chrons[i].ageType;
                    thisHeaderRow["element"] = "";
                    thisHeaderRow["units"] = "";
                    thisHeaderRow["context"] = "";
                    // add sample ages/depths
                    theseAges = chrons[i].sampAges;
                    numAges = theseAges.length;
                    for (var sai = 0; sai < numAges; sai++) {
                        thisHeaderRow["S" + theseAges[sai].sampleId] = theseAges[sai].ageStr;
                    }
                    // add to header records
                    headerRecords.push(thisHeaderRow);
                }
                
                return { data: headerRecords, columns: columns };
            },
            _retrieveChrons: function () {
                try {
                    // loop through chronologies, request details for each chron and mixin to chron object in chronologies
                    var chrons = this._chronologyChartData["chronologies"];
                    var numChrons = chrons.length;
                    var dlg = this;
                    for (var i = 0; i < numChrons; i++) {
                        if (chrons[i].ChronologyID == null) {
                            //_alert("There is no chronology. Disable tab");
                            // disable chronologies tab
                            this.chronologyTab.set("disabled", true);
                            dlg.configureStratigraphicDiagram(dlg.currentDatasetId, dlg._datasetType, null, chrons);
                            return;
                        }// else {
                            // enable chronologies tab
                         //   this.chronologyTab.set("disabled", false);
                       // }
                        // send request
                        script.get(config.dataServicesLocation + "/Chronologies/" + chrons[i].ChronologyID,
                            { jsonp: "callback"}
                        ).then(lang.hitch([this,chrons[i]], function (response) {
                            if (response.success) {
                                try {
                                    // stop if nothing was returned
                                    if (response.data.length === 0) {
                                        alert("No chronologies found");
                                        return;
                                    }

                                    // mix in data
                                    lang.mixin(this[1], response.data[0]);

                                    // chart default chron
                                    if (this[0]._chronologyChartData["defaultChron"]) {
                                        //console.log("chart default chron: " + JSON.stringify(this[0]._chronologyChartData["defaultChron"]));
                                        this[0]._displayChronologiesChart(this[0]._chronologyChartData["defaultChron"].ChronologyID);
                                        dlg.configureStratigraphicDiagram(dlg.currentDatasetId, dlg._datasetType, dlg._datasetResponse.DefChronologyID, chrons);
                                    }

                                    // enable chronology tab
                                    //this[0].chronologyTab.set("disabled", false);
                                } catch (e) {
                                    alert("error getting chron data: " + e.message);
                                }

                            } else {
                                alert("error in form/DatasetExplorer._retrieveChrons: " + response.message);
                            }
                        }));
                    }
                } catch (e) {
                    alert("_retrieveChrons error: " + e.message);
                }
            },
            diagram: null,
            onToggle5x: function(cbxValue){
              d3.selectAll(".exaggerate-5x").classed(["hide"],!cbxValue);
            },
            yAxisChangeHandler: null,
            //params: datasetid, datasetType, defaultChronId, chronologies
            configureStratigraphicDiagram: function(datasetid, datasetType, defaultChronId, chronologies) {
                // get potential y axes
                //var yaxes = [{ chronName: "Depth", chronId: -9999 }];
                //chronologies = sheetResponse.sampleChrons;
                var yaxes = [{ ChronologyName: "Depth", ChronologyID: -9999 }];
                //check if any chronologies provided
                if ( chronologies instanceof Array ){
                  //check if provided chronology is enumerated
                  if (chronologies[0].ChronologyName != "default chronology" ){
                    yaxes = yaxes.concat(chronologies);
                  }
                }

                // populate yAxisSelect
                this.yAxisSelect.set("store",
                    new Memory({
                        //idProperty: "chronId",
                        idProperty: "ChronologyID",
                        data: yaxes
                    })
                );
                // set y axis as default chron if available; else, default to depth
                if (!isNaN(parseInt(defaultChronId))) {
                    this.yAxisSelect.set("value", defaultChronId);
                } else { //  use depth
                    this.yAxisSelect.set("value", -9999);
                }
                

                // create tooltip for group explanation
                new Tooltip({
                    connectId: ["groupHelp"],
                    label: "<div class='ttThin'>If the box is checked next to a genus, counts of its species will be summed and presented as a single group.</div>"
                });

                //set config object
                // get selected chronology info
                var selectedChron = this.yAxisSelect.get("item");
                                                
                // set config object
                var config = {
                    picea: (this.cbPicea.get("value") === "on") ? true : false,
                    pinus: (this.cbPinus.get("value") === "on") ? true : false,
                    fraxinus: (this.cbFraxinus.get("value") === "on") ? true : false,
                    show5x: (this.cb5x.get("value") === "on") ? true : false,
                    datasetId: this.currentDatasetId,
                    chronology: selectedChron,
                    chronologies: chronologies
                    //defaultChron: defaultYAxis
                };


            },
            handleDatasetIDChange: function(id) {
              //get group selections
              var grpTaxa = [];
              var grpPicea = this.cbPicea.get("value");
              if(grpPicea){
                grpTaxa.push("picea");
              }
              var grpPinus = this.cbPinus.get("value");
              if(grpPinus){
                grpTaxa.push("pinus");
              }
              var grpFraxinus = this.cbFraxinus.get("value");
              if(grpFraxinus){
                grpTaxa.push("fraxinus");
              }
              var grpParam = grpTaxa.join("$");
              var explorerDlg = this;
              
              require(["dojo/request/xhr", "dojo/topic"],
                    function (xhr, topic) {
                        

                        //clear chart & existing chronologies
                        if(dojo.config.diagrammer){
                          dojo.config.diagrammer.clearChart();
                          dojo.config.diagrammer.chronologies = [];
                        }

                        //set stratigraphicDiagram yScale
                        // get selected chronology info
                        var selectedChron = explorerDlg.yAxisSelect.get("item");  
                        dojo.config.diagrammer._setCurrentChronology(selectedChron);
                        //instead, parse chronologies from tilia in stratigraphic diagram
                        //dojo.config.diagrammer.chronologies = explorerDlg.chronologies;
                        
                        // show standby
                        topic.publish("diagrammer/ShowStandby");

                        // get data for datasetid
                        xhr.get("https://tilia.neotomadb.org/Retrieve",
                               {
                                   handleAs: "json",
                                   query: {
                                       method: "GetDatasetTopTaxaData",
                                       DATASETID: id,
                                       TOPX: 10,
                                       GROUPTAXA: grpParam
                                   },
                                   headers: {
                                       "X-Requested-With": null
                                   }
                               }
                           ).then(
                               function (data) {
                                   //set handler for yAxis change
                                   explorerDlg.setYAxisChangeHandler();
                                   //draw diagram
                                   dojo.config.diagrammer.ready(null, data, dojo.config.diagrammer.config);
                                   // hide standby
                                   topic.publish("diagrammer/HideStandby");
                                   
                               },
                               function (error) {
                                   // hide standby
                                   topic.publish("diagrammer/HideStandby");
                                   alert("request error " + error);
                               }
                           );

                    });
          },
            drawDiagram: function () {
                
                // get selected chronology info
                var selectedChron = this.yAxisSelect.get("item");
                //get default y axis for chart
                var defaultYAxis = this._chronologyChartData["defaultChron"];
                //var chronologies = this._chronologyChartData["chronologies"];
                                
                // set config object
                var config = {
                    picea: (this.cbPicea.get("value") === "on") ? true : false,
                    pinus: (this.cbPinus.get("value") === "on") ? true : false,
                    fraxinus: (this.cbFraxinus.get("value") === "on") ? true : false,
                    show5x: (this.cb5x.get("value") === "on") ? true : false,
                    datasetId: this.currentDatasetId,
                    chronology: selectedChron,
                    chronologies: null, //chronologies,
                    defaultChron: defaultYAxis
                };

                dojo.config.diagrammer.config = config;
                //dojo.config.diagrammer.chronologies = chronologies;
                dojo.config.diagrammer._setCurrentChronology(selectedChron);

                // draw
                //this.diagram.initializePollenDiagram(JSON.stringify(data), JSON.stringify(config));
                //this.diagrammer.ready(null, JSON.stringify(data));//, JSON.stringify(config));
                
                
                this.handleDatasetIDChange(this.currentDatasetId);

            },
            setYAxisChangeHandler: function (){
                 //var chron = this._chronologyChartData["chronologies"];
                 this.yAxisChangeHandler = on(this.yAxisSelect, "Change", lang.hitch(this, function(e){  
                  //var allchron = this._chronologyChartData["chronologies"];
                  var selectedChron = this.yAxisSelect.get("item");
                  /*
                  var chron = {
                      id: selectedChron.chronId,
                      name: selectedChron.chronName
                  };
                  */

                                
                  topic.publish("diagrammer/ChronologyChange", [selectedChron]);
                  
                }));
            },
            clearYAxisChangeHandler: function(){
              if(this.yAxisChangeHandler){
                this.yAxisChangeHandler.remove();
              }
            },
            postCreate: function () {
                this.inherited(arguments);
                
                /*
                on.once(this.yAxisSelect, "Change", lang.hitch(this,function(e){
                  this.watchChron();
                }))

                var stgStandby = this.stratigraphicStandby;

                topic.subscribe("diagrammer/ShowStandby",
                    function () {
                        stgStandby.show();
                    }
                );
                topic.subscribe("diagrammer/HideStandby",
                    function () {
                        stgStandby.hide();
                    }
                );
                */
               
            }
        });
    });