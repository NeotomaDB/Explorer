define(["dojo/request", "dojo/_base/declare", "dijit/layout/ContentPane", "dijit/TitlePane", "dijit/_TemplatedMixin", "dojo/text!./template/datasetExplorer.html", "dijit/_WidgetsInTemplateMixin",
   "dojo/request/script", "dojo/_base/lang", "dijit/Tooltip", "dgrid/OnDemandGrid", "dgrid/Grid", "neotoma/widget/_StoreMixin", "dgrid/extensions/DijitRegistry",
   "dojo/store/Memory", "dgrid/ColumnSet", "dgrid/extensions/ColumnResizer", "dojo/dom-style", "dojo/dom-construct", "dojo/dom-class", "dojo/dom-attr", "dojo/on", 
   "dojo/number", "dijit/registry", "dojo/dom", "dojo/has", "dojo/_base/array", "neotoma/util/export", "dojo/aspect", "dojo/_base/config", "dojo/topic", "dojo/when", "dojo/Deferred",
   "neotoma/form/StratigraphicDiagram", 
   "neotoma/widget/TabContainer", "dojox/widget/Standby", "dijit/layout/BorderContainer", "dijit/form/FilteringSelect", "neotoma/form/ChartPane", 
   "dijit/layout/StackContainer", "dijit/form/CheckBox", "dijit/form/Button", "dijit/form/Textarea", "dojo/domReady!"],
    function (request, declare, ContentPane, titlePane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, lang, Tooltip, OnDemandGrid, Grid, StoreMixin, DijitRegistry, 
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
                           content.push("<tr><td>" + chron.chronologyname + "</td></tr>");
                           content.push("<tr class='lbl'><td>Age type</td></tr>");
                           content.push("<tr><td>" + chron.agetype + "</td></tr>");
                           //content.push("<tr><td>Depth: " + chron.MinDepth + "-" + chron.MaxDepth + "</td></tr>");
                           //content.push("<tr><td>Age: " + chron.MinAge + "-" + chron.MaxAge + "</td></tr>"); // from samples
                           content.push("<tr class='lbl'><td>Reliable age range <img src='resources/images/miniQuest.png' id='ageRangeHelp' class='miniHelp'></td></tr>");
                           content.push("<tr><td>" + chron.ageolder + " to " + chron.ageyounger + "</td></tr>"); // from chron
                           content.push("<tr class='lbl'><td>Age model</td></tr>");
                           content.push("<tr><td>" + chron.agemodel + "</td></tr>");
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
                           if (chron.notes) {
                               // show button
                               domStyle.set(this.chronNotesBtn.domNode, "visibility", "visible");

                               // attach notes to chronNotesBtn
                               //var notes = JSON.stringify(chron.Notes);
                               this.chronNotesBtn.set("notes", chron.notes);
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
            // showSamplesTab: function() {
            //     // make sure samples tab is active
            //     this.tabContainer.selectChild(this.samplesTab);
            // },
            showMetadataTab: function() {
                // make sure metadata tab is active
                this.tabContainer.selectChild(this.metadataTab);
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
                    var regularTabNames = ["metadataTab", "samplesTab", "siteTab",  "diagramTab", "chronologyTab", "publicationsTab"];

                    // see if geochronologic
                    if (datasetType === "geochronologic") {
                        // set this.currentDatasetId
                        this.currentDatasetId = datasetId;
                   
                        // load geochron data
                        script.get(config.appServicesLocation + "/Geochronologies",
                            { jsonp: "callback", query:{datasetid:datasetId} }
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
                                                siteid: currentSiteObj.data.siteid || null,
                                                sitename: currentSiteObj.data.sitename || null,
                                                sitedescription: currentSiteObj.data.sitedescription || null,
                                                latitude: currentSiteObj.latitude || currentSiteObj.data.latitude,
                                                longitude: currentSiteObj.longitude || currentSiteObj.data.longitude,
                                                sitenotes: currentSiteObj.data.sitenotes || null
                                            };
                                        } else {
                                            this.site = {
                                                siteid: currentSiteObj.siteid || null,
                                                sitename: currentSiteObj.sitename || null,
                                                sitedescription: currentSiteObj.sitedescription || null,
                                                latitude: currentSiteObj.latitudesouth || null,
                                                longitude: currentSiteObj.longitudeeast || null,
                                                sitenotes: currentSiteObj.sitenotes || null
                                            };
                                        }

                                        // add site to response to be like others
                                        var results = response.data;
                                        results.site = this.site;

                                        // display geochron data
                                        this._displayGeochronDataset(response.data.samples);

                                        // load site meta data
                                        this.loadGeochronSiteMetadata(results.site);

                                        // load publications
                                        this._loadGeoChronPublications(datasetId, response.data.datasetpis);

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
   
/****STUB FOR CLEAR CHARTS
                    //clear prior chart if one exists
                    if(dojo.config.diagrammer){
                        dojo.config.diagrammer.clearChart();                   
                    }    
*/    
                     

                     


                        request.get(config.dataServicesLocationV2 + "/Downloads/" + datasetId, {
                            handleAs: "json"
                        }).then(lang.hitch(this, function (response) {
                     
                          try {
                              if (response.status === "success") {
                                  if (response.data.length === 0) {
                                      alert("No data found for datasetId: " + datasetId);
                                      // not busy
                                      this.toggleStandby(false);
                                      return;
                                  }


                                  var dataset = JSON.stringify(response.data[0]);
                                  this._datasetResponse = JSON.parse(dataset);
                                  var datasetForSD = response.data[0];

                                  //see if first time
                                  var initRun = true;
                                  if (this._samplesGrid) {
                                    initRun = false;
                                  }
    
                                  //create or update SD content
                                  // this.diagramTab.processDataset(this._datasetResponse);

                                  // make sure samples tab is active
                                  //this.tabContainer.selectChild(this.samplesTab);
                                  //make sure metadata tab is active 
                                  this.tabContainer.selectChild(this.metadataTab);

                                  // set currentDatasetId
                                  this.currentDatasetId = datasetId;

                                  // parse with brian's function
                                  this._sheetResponse = this._formatSheet(this._datasetResponse.site.collectionunit.dataset.samples);
                            
                                  // load samples (header grid)
                                  this._displaySamples(this._sheetResponse);

                                  // load variables (main grid)
                                  this._displayVariables(this._sheetResponse);

                                  // load chronologies & retreive additional chronology data; return parsed chronology array
                                  this._parseChronologies(this._datasetResponse.site.collectionunit.dataset.samples, this._datasetResponse.site.collectionunit.defaultchronology);

                                  // load site meta data
                                  //this._loadSiteMetadata(this._datasetResponse.site);
                                  this._loadDatasetMetadata(this._datasetResponse.site);

                                  // load publications
                                  this._loadPublications(datasetId, this._datasetResponse.site.collectionunit.dataset.datasetpi);

                                  // change title
                                  this.getParent().set("title", "Dataset ID: " + datasetId + " | " + this._datasetResponse.site.collectionunit.dataset.database);
                                                            
                                  // enable tab if appropriate
                                  var DatasetTypesWithSD = ["pollen", "diatom", "ostracode", "testate amoebae", "vertebrate fauna"];
                                  // if relevant dataset type and necessary chronology details configure stratigraphic diagrammer
                                  if ( DatasetTypesWithSD.indexOf(datasetType) > -1 &&
                                    (datasetForSD.site.collectionunit.defaultchronology) &&
                                    (
                                      (datasetForSD.site.collectionunit.dataset.samples[0].ages[0].age || datasetForSD.site.collectionunit.dataset.samples[0].ages[0].age === 0) ||
                                      (datasetForSD.site.collectionunit.dataset.samples[0].ages[0].ageolder || datasetForSD.site.collectionunit.dataset.samples[0].ages[0].ageolder === 0)
                                    )
                                  ) {
                                      // enable pollen diagram tab
                                      this.diagramTab.set("disabled", false);
                                      // process dataset for SD only if one of these dataset types
                                      this.diagramTab.processDataset(datasetForSD);
                                          
                                  } else {
                                      // disable pollen diagram tab
                                      this.diagramTab.set("disabled", true);
                                      console.log("conditions not met")
                                  }

                                  // HACK. 
                                  if (initRun) {
                                      // briefly select chron chart tab to try to initialize
                                      this.tabContainer.selectChild(this.chronologyTab);

                                      // briefly select pollen diagram tab to try to initialize
                                      this.tabContainer.selectChild(this.diagramTab);
                                      
                                  //HACK. This gets the grids to display on the first search. Otherwise they don't render unless the samplesTab is hidden and shown once
                                  // Problem started after moving tab container to stack container to have geochron tabs.
                                      //this.tabContainer.selectChild(this.siteTab);
                                      this.tabContainer.selectChild(this.samplesTab);
                                      this.tabContainer.selectChild(this.metadataTab);
                                  }

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
                      }), function(e) {
                          alert("error in form/DatasetExplorer.loadDataset parsing response: " + e.message);
                          // not busy
                          this.toggleStandby(false);
                      });

                  }
                } catch (e) {
                    alert("error in form/DatasetExplorer.loadDataset" + e.message);
                    // not busy
                    this.toggleStandby(false);
                }
            },
            _loadGeoChronPublications: function (datasetId, datasetPIs) {
                // clear out any previous publications
                this.geoChronPublicationsTab.set("content", "");
                // get publications for dataset
                script.get(config.dataServicesLocation + "/Publications/",
                        { jsonp: "callback", query: { datasetid: datasetId } }
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
                                                pis.push(piObj.contactname);
                                            }
                                        );

                                        // add pis
                                        domConstruct.place(domConstruct.create("p", { innerHTML: "PIs: " + pis.join("; "), class: "cite" }), pt.domNode);
                                    }
                                }
                                

                                // add all publications to tab
                                if (resp.data.length > 0) {
                                    array.forEach(resp.data, function (publication) {
                                        domConstruct.place(domConstruct.create("p", { innerHTML: publication.citation, class: "cite" }), pt.domNode);
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
                this.publicationsMetadataDiv.set("content", "");
                // get publications for dataset
                script.get(config.dataServicesLocation + "/Publications/",
                        { jsonp: "callback", query: {datasetid:datasetId} }
                    ).then(lang.hitch(this,function (resp) {
                        try {
                            var content = null;
                            var authorsList = null;
                            var authors = null;
                            var pt = this.publicationsMetadataDiv;

                            if (resp.success) {
                                // create string of PI names
                                var pis = [];
                                array.forEach(datasetPIs,
                                    function (piObj) {
                                        pis.push(piObj.contactname);
                                    }
                                );

                                // add pis
                                // domConstruct.place(domConstruct.create("p", { innerHTML: "PIs: " + pis.join("; "), class: "cite" }), pt.domNode);

                                // add all publications to tab
                                if (resp.data.length > 0) {
                                    array.forEach(resp.data, function (publication) {
                                        domConstruct.place(domConstruct.create("p", {innerHTML:publication.citation, class:"cite"}), pt.domNode);
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
            _formatSheet: function(inSamples) {
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
                        outSample["sampleId"] = inSample.sampleid;
                        outSample["sampleName"] = inSample.samplename || "";
                        outSample["unitName"] = inSample.analysisunitname || "";
                        outSample["depth"] = inSample.depth || "";
                        outSample["thickness"] = inSample.thickness || "";

                        // add to outSamples
                        outSamples.push(outSample);

                        // create chron objects to hold age data; chron object includes array of sample age strings by sampleId
                        for (var ci = 0; ci < inSample.ages.length; ci++) {
                            inSampAge = inSample.ages[ci];
                            if (inSampAge.chronologyid) {
                                outChron = outChrons["C" + inSampAge.chronologyid];
                                // create new outChron object if doesn't exist
                                if (!outChron) {
                                    outChron = {};
                                    outChron["chronId"] = inSampAge.chronologyid;
                                    outChron["chronName"] = inSampAge.chronologyname;
                                    outChron["ageType"] = inSampAge.agetype;
                                    outChron["sampAges"] = [];
                                    outChrons["C" + inSampAge.chronologyid] = outChron;
                                }
                                // create string representation of sample age (e.g. AgeOlder/Age/AgeYounger) and add to chron's SampAges array
                                outSampAge = (inSampAge.ageolder || "--") + "/" +
                                    (inSampAge.age || "--") + "/" +
                                    (inSampAge.ageyounger || "--");
                                outChron.sampAges.push({ sampleId: inSample.sampleid, ageStr: outSampAge });
                            }
                        }

                        // loop through raw SampleData array, create variable objects to hold values for samples
                        inSampleDataArray = inSample.datum;
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
                                newVariable["name"] = inSampleData.variablename;
                                //newVariable["group"] = inSampleData.TaxaGroup;
                                newVariable["group"] = inSampleData.ecologicalgroup;
                                newVariable["element"] = inSampleData.element;
                                newVariable["units"] = inSampleData.units;
                                newVariable["context"] = inSampleData.context || "";
                                //TODO: handle VariableModifications array
                                outVariables[varId] = newVariable;
                            }
                            
                            // see if value is presence/absense
                            thisValue = inSampleData.value;
                            if (inSampleData.units === "present/absent") {
                                if (thisValue === 1) {
                                    thisValue = "+";
                                }
                            }

                            // add value of variable for this sample
                            outVariable = outVariables[varId];
                            outVariable["S" + inSample.sampleid] = thisValue;
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
                        if (outVar.name == inVar.variablename) {
                            if (outVar.element == inVar.element) {
                                if (outVar.units == inVar.units) {
                                    if ((outVar.context == inVar.context) || (!outVar.context && !inVar.context)) {
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
                        idProperty: "chronologyid",
                        data: this._chronologyChartData["chronologies"]
                    }
                ));

                // try to set default chron if there is no selected chron
                if (this.datasetChronologies.get("value") === "") {
                    // set default chron
                    if (this._chronologyChartData["defaultChron"]) {
                        this.datasetChronologies.set("value", this._chronologyChartData["defaultChron"]["chronologyid"]);
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
                                var chartData =  this._chronologyChartData["chartData"][this._chronologyChartData["defaultChron"]["chronologyid"]];
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
                                if (chronologies[i].chronologyid === chronID) {
                                    chartChron = chronologies[i];
                                    break;
                                }
                            }
                            
                            // if doesn't have MaxDepth and MinDepth or necessary charting controls then hide tab and stop
                            if ((!chartChron.maxdepth && !chartChron.mindepth) || (chartChron.controls.length <= 1)) {
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
                        if (!chartChron.maxdepth) {
                            showChart = false;
                        } else {
                            if (chartChron.maxdepth - chartChron.mindepth === 0) {
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
                            var ageSpread = parseInt(chartChron.maxage - chartChron.minage);
                            var depthSpread = parseInt(chartChron.maxdepth - chartChron.mindepth);
                            var minAge = Math.floor(chartChron.minage - (bufferRatio * ageSpread));
                            var maxAge = Math.ceil(chartChron.maxage + (bufferRatio * ageSpread));
                            var minDepth = parseInt(chartChron.mindepth - (bufferRatio * depthSpread));
                            var maxDepth = parseInt(chartChron.maxdepth + (bufferRatio * depthSpread));
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
                                title: "Age (" + chartChron.agetype + ")"
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
                        if (samples[0].ages[0].age == null || samples[0].ages[0].ageolder == null || samples[0].ages[0].ageyounger == null) {
                            // hide chronology legend, disable tab
                            domStyle.set("chronologyLegend", "visibility", "hidden");
                            this.chronologyTab.set("disabled", true);
                        } else {
                            // show chronology legend, enable tab
                            domStyle.set("chronologyLegend", "visibility", "visible");
                            this.chronologyTab.set("disabled", false);
                        }

                        // parse into chronologies first
                        var chronologies = [];
                        var chartData = {};
                        var numSamples = samples.length;
                        var sampleAges = null;
                        var thisSample = null;
                        var defaultChron = null;

                        // chronologies vary by sample. find sample index with most.
                        var maxChronologiesBySample = 0;
                        samples.forEach(function(sample, index) {
                            if (sample.ages.length > maxChronologiesBySample) {
                                maxChronologiesBySample = index;
                            }
                            return maxChronologiesBySample;
                        });
                        
                        for (var i = 0; i < numSamples; i++) {
                            thisSample = samples[i];
                            // look at sample ages to see how many chronologies there are. 1 chron/sample age
                            sampleAges = thisSample.ages;
                            var numAges = sampleAges.length;
                            var thisAge = null;

                            // loop through ages (chronologies) for the sample to add each to chartData
                            for (var ai = 0; ai < numAges; ai++) {
                                // get this age
                                thisAge = sampleAges[ai];
                                if (i === maxChronologiesBySample) { // only for sample with most chronologies
                                    // add to chronologies
                                    chronologies.push({
                                        chronologyid: thisAge.chronologyid || defaultChronId,
                                        chronologyname: thisAge.chronologyname || "default chronology",
                                        agetype: thisAge.agetype
                                    });
                                    // initialize chart data for age (chron)
                                    chartData[thisAge.chronologyid] = [];

                                    // see if default chron
                                    if (thisAge.chronologyid === defaultChronId) {
                                        // get default chronology
                                        defaultChron = chronologies[chronologies.length - 1];
                                    }

                                    // if not default chronology, make the first one the default
                                    if (defaultChron === null) {
                                        defaultChron = chronologies[0];
                                    }
                                }
                                // add sample to chartData for all records. Make sure has valid depth and age
                                if ((thisAge.age != null) && (thisSample.depth != null) && (chronologies[ai])) {
                                    // see if should be min
                                    if (!chronologies[ai].minage) {
                                        chronologies[ai].minage = thisAge.age;
                                        chronologies[ai].mindepth = thisSample.depth;
                                    } else {
                                        if (thisAge.age < chronologies[ai].minage) {
                                            chronologies[ai].minage = thisAge.age;
                                            chronologies[ai].mindepth = thisSample.depth;
                                        }
                                        //if (thisAge.Age < chronologies[ai].MaxDepth) {
                                        //    chronologies[ai].MaxDepth = thisSample.AnalysisUnitDepth;
                                        //}
                                    }

                                    // set each to max since are in age order
                                    if (!chronologies[ai].maxage) {
                                        chronologies[ai].maxage = thisAge.age;
                                        chronologies[ai].maxdepth = thisSample.depth
                                    } else {
                                        if (thisAge.age > chronologies[ai].maxage) {
                                            chronologies[ai].maxage = thisAge.age;
                                            chronologies[ai].maxdepth = thisSample.depth;
                                        }
                                    }

                                    // make sure can get chart data for this chronology
                                    if (!chartData[thisAge.chronologyid]) {
                                      this.chronologyTab.set("disabled", true);
                                      return;
                                    }

                                    // add to chart data
                                    chartData[thisAge.chronologyid].push({
                                      SampleID: thisSample.sampleid,
                                      AnalysisUnitDepth: thisSample.depth,
                                      Age: thisAge.age
                                    });
                                    // sort data by age to avoid graph rendering issues
                                    chartData[thisAge.chronologyid].sort((a, b) => (a.Age > b.Age) ? 1 : -1)
                                }
                            } // end loop over ages  
                        } // end loop over samples

                        // set data for chronology charting
                        this._chronologyChartData["chronologies"] = chronologies;
                        this._chronologyChartData["chartData"] = chartData;
                        this._chronologyChartData["defaultChron"] = defaultChron;

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
                                sampleid:"ID",
                                labnumber: "Lab Number",
                                geochrontype: "Type",
                                materialdated:"Material Dated",
                                age:"Age",
                                errorolder:"Error Older",
                                erroryounger: "Error Younger",
                                depth: "Depth",
                                thickness: "Thickness",
                                //Delta13C:"Delta13C",
                                notes:"Notes",
                                infinite:"Infinite"
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
                            idProperty: "sampleid",
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
                            idProperty: "sampleid",
                            data: data
                        }));
                        this._geochronGrid.refresh();
                        this._geochronGrid.resize();
                    }
                } catch (e) {
                    alert("error in form/DatasetExplorer._displayGeochronDataset: " + e.message);
                }
            },
            //_loadSiteMetadata: function (site) {
            _loadDatasetMetadata: function (dataset) {
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

                    // get lon, lat centroid
                    function getCentroid (arr) {
                        var minX, maxX, minY, maxY;
                        for (var i = 0; i < arr.length; i++) {
                            minX = (arr[i][0] < minX || minX == null) ? arr[i][0] : minX;
                            maxX = (arr[i][0] > maxX || maxX == null) ? arr[i][0] : maxX;
                            minY = (arr[i][1] < minY || minY == null) ? arr[i][1] : minY;
                            maxY = (arr[i][1] > maxY || maxY == null) ? arr[i][1] : maxY;
                        }
                        return [(minX + maxX) / 2, (minY + maxY) / 2];
                    }
                    // parse geography
                    var geography = JSON.parse(dataset.geography);
                    var coordinates = geography.coordinates;
                    var centroid;
                    if (coordinates.length == 2) {
                        centroid = coordinates;
                    } else {
                        centroid = getCentroid(coordinates[0]);
                    }
                    var lon = centroid[0];
                    var lat = centroid[1];

                    // // clear out any existing data
                    // this.siteTab.set("content", "");

                    // clear out any existing metadata
                    this.siteMetadataTableDiv.set("content", "");
                    this.collectionunitMetadataTableDiv.set("content", "");
                    this.datasetMetadataTableDiv.set("content", "");

                    // ensure site tab is open by default
                    this.siteMetadataPane.set("open", true);
                    this.collectionunitMetadataPane.set("open", false);
                    this.datasetMetadataPane.set("open", false);

                    // SITE METADATA
                    // create table for site metadata, add class
                    var siteMetadataTable = domConstruct.create("table");
                    domClass.add(siteMetadataTable, "sitemeta");

                    // site name
                    var row = domConstruct.create("tr", {class:"fixht"}, siteMetadataTable);
                    domConstruct.place(domConstruct.create("td", {innerHTML: "Name", class:"col1"}), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML: dataset.sitename, class:"col2"}), row);
                    // site ID
                    var row = domConstruct.create("tr", {class:"fixht"}, siteMetadataTable);
                    domConstruct.place(domConstruct.create("td", {innerHTML: "ID", class:"col1"}), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML: dataset.siteid, class:"col2"}), row);
                    // site description
                    if (dataset.sitedescription) {
                        var row = domConstruct.create("tr", {class:"fixht"}, siteMetadataTable);
                        domConstruct.place(domConstruct.create("td", {innerHTML:"Description", class:"col1"}), row);
                        domConstruct.place(domConstruct.create("td", {innerHTML: dataset.sitedescription, class:"col2"}), row);
                    }
                    // site lon,lat
                    var row = domConstruct.create("tr", {class:"fixht"}, siteMetadataTable);
                    domConstruct.place(domConstruct.create("td", {innerHTML: "Lon, Lat", class:"col1"}), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML: numberUtil.format(lon, {pattern:"#.######"}) + ", " + numberUtil.format(lat, {pattern:"#.######"}), class:"col2"}), row);
                    // site altitude
                    if (dataset.altitude) {
                        var row = domConstruct.create("tr", {class:"fixht"}, siteMetadataTable);
                        domConstruct.place(domConstruct.create("td", {innerHTML: "Altitude", class:"col1"}), row);
                        domConstruct.place(domConstruct.create("td", {innerHTML: dataset.altitude, class:"col2"}), row);
                    }
                    // site notes
                    if (dataset.notes) {
                        var row = domConstruct.create("tr", { class: "fixht" }, siteMetadataTable);
                        domConstruct.place(domConstruct.create("td", { innerHTML: "Notes", class: "col1" }), row);
                        domConstruct.place(domConstruct.create("td", { innerHTML: dataset.notes, class: "col2" }), row);
                    }
                    // place table
                    domConstruct.place(siteMetadataTable, this.siteMetadataTableDiv.domNode);


                    // COLLECTION UNIT METADATA
                    // create table for dataset metadata, add class
                    var collectionunitMetadataTable = domConstruct.create("table");
                    domClass.add(collectionunitMetadataTable, "sitemeta");

                    // collection unit handle
                    if (dataset.collectionunit.handle) {
                        var row = domConstruct.create("tr", {class:"fixht"}, collectionunitMetadataTable);
                        domConstruct.place(domConstruct.create("td", {innerHTML: "Handle", class:"col1"}), row);
                        domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.handle, class:"col2"}), row);
                    }
                    // collection unit type
                    if (dataset.collectionunit.collunittype) {
                        var row = domConstruct.create("tr", {class:"fixht"}, collectionunitMetadataTable);
                        domConstruct.place(domConstruct.create("td", {innerHTML: "Type", class:"col1"}), row);
                        domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.collunittype, class:"col2"}), row);
                    }
                    // collection unit date
                    if (dataset.collectionunit.colldate) {
                      var row = domConstruct.create("tr", {class:"fixht"}, collectionunitMetadataTable);
                      domConstruct.place(domConstruct.create("td", {innerHTML: "Collection Date", class:"col1"}), row);
                      domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.colldate, class:"col2"}), row);
                    }
                     // collection unit device
                     if (dataset.collectionunit.collectiondevice) {
                      var row = domConstruct.create("tr", {class:"fixht"}, collectionunitMetadataTable);
                      domConstruct.place(domConstruct.create("td", {innerHTML: "Collection Device", class:"col1"}), row);
                      domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.collectiondevice, class:"col2"}), row);
                    }
                    // depositional environment
                    if (dataset.collectionunit.depositionalenvironment) {
                      var row = domConstruct.create("tr", {class:"fixht"}, collectionunitMetadataTable);
                      domConstruct.place(domConstruct.create("td", {innerHTML: "Depositional Environment", class:"col1"}), row);
                      domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.depositionalenvironment, class:"col2"}), row);
                    }
                    // collection unit notes
                    if (dataset.collectionunit.notes) {
                      var row = domConstruct.create("tr", {class:"fixht"}, collectionunitMetadataTable);
                      domConstruct.place(domConstruct.create("td", {innerHTML: "Notes", class:"col1"}), row);
                      domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.notes, class:"col2"}), row);
                    }
                    // place table
                    domConstruct.place(collectionunitMetadataTable, this.collectionunitMetadataTableDiv.domNode);
                    

                    // DATASET METADATA
                    // create table for dataset metadata, add class
                    var datasetMetadataTable = domConstruct.create("table");
                    domClass.add(datasetMetadataTable, "sitemeta");

                    // dataset name
                    if (dataset.collectionunit.dataset.datasetname) {
                        var row = domConstruct.create("tr", {class:"fixht"}, datasetMetadataTable);
                        domConstruct.place(domConstruct.create("td", {innerHTML: "Name", class:"col1"}), row);
                        domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.dataset.datasetname, class:"col2"}), row);
                    }
                    // dataset ID
                    var row = domConstruct.create("tr", {class:"fixht"}, datasetMetadataTable);
                    domConstruct.place(domConstruct.create("td", {innerHTML: "ID", class:"col1"}), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.dataset.datasetid, class:"col2"}), row);
                    // dataset type
                    var row = domConstruct.create("tr", {class:"fixht"}, datasetMetadataTable);
                    domConstruct.place(domConstruct.create("td", {innerHTML: "Type", class:"col1"}), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.dataset.datasettype, class:"col2"}), row);
                    // database name
                    if (dataset.collectionunit.dataset.database) {
                        var row = domConstruct.create("tr", {class:"fixht"}, datasetMetadataTable);
                        domConstruct.place(domConstruct.create("td", {innerHTML: "Database Name", class:"col1"}), row);
                        domConstruct.place(domConstruct.create("td", {innerHTML: dataset.collectionunit.dataset.database, class:"col2"}), row);
                    }
                    // dataset DOIs
                    if (dataset.collectionunit.dataset.doi && dataset.collectionunit.dataset.doi.length > 0) {
                        var dois = [];
                        var doiLinks = [];
                        array.forEach(dataset.collectionunit.dataset.doi,
                            function (doiObj) {
                                dois.push(doiObj);
                                doiLinks.push('https://doi.org/'+doiObj);
                            }
                        );
                        for (var i = 0; i < doiLinks.length; i++) {
                            var row = domConstruct.create("tr", {class:"fixht"}, datasetMetadataTable);
                            domConstruct.place(domConstruct.create("td", {innerHTML: "DOI:", class:"col1"}), row);
                            domConstruct.place(domConstruct.create("td", {innerHTML: " <a target='_blank' href='" + doiLinks[i] + "'>"+ dois[i] + "</a>", class:"col2"}), row);
                        }
                    }
                    // dataset PIs
                    if (dataset.collectionunit.dataset.datasetpi && dataset.collectionunit.dataset.datasetpi.length > 0) {
                      var pis = [];
                      array.forEach(dataset.collectionunit.dataset.datasetpi,
                          function (piObj) {
                              pis.push(piObj.contactname);
                          }
                      );
                      var row = domConstruct.create("tr", {class:"fixht"}, datasetMetadataTable);
                      domConstruct.place(domConstruct.create("td", {innerHTML: "PIs", class:"col1"}), row);
                      domConstruct.place(domConstruct.create("td", {innerHTML: pis.join("; "), class:"col2"}), row);
                    }

                    // place table
                    domConstruct.place(datasetMetadataTable, this.datasetMetadataTableDiv.domNode);

                } catch (e) {
                  alert("error in DatasetExplorer._loadDatasetMetadata(): " + e.message);
                }
            },
            loadGeochronSiteMetadata: function (site) {
              var currentSiteObj = dojo.config.app.forms.sitePopup.sites[dojo.config.app.forms.sitePopup.siteIndex];
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
                    domConstruct.place(domConstruct.create("td", { innerHTML: currentSiteObj.attributes.siteid, class: "col2" }), row);
                    var row = domConstruct.create("tr", { class: "fixht" }, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Longitude", class: "col1" }), row);
                    domConstruct.place(domConstruct.create("td", { innerHTML: numberUtil.format(currentSiteObj.attributes.longitude, { pattern: "#.######" }), class: "col2" }), row);
                    var row = domConstruct.create("tr", { class: "fixht" }, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Latitude", class: "col1" }), row);
                    domConstruct.place(domConstruct.create("td", { innerHTML: numberUtil.format(currentSiteObj.attributes.latitude, { pattern: "#.######" }), class: "col2" }), row);
                    if (site.sitedescription) {
                        var row = domConstruct.create("tr", { class: "fixht" }, table);
                        domConstruct.place(domConstruct.create("td", { innerHTML: "Description", class: "col1" }), row);
                        domConstruct.place(domConstruct.create("td", { innerHTML: currentSiteObj.attributes.sitedescription, class: "col2" }), row);
                    }
                    if (site.sitenotes) {
                        var row = domConstruct.create("tr", { class: "fixht" }, table);
                        domConstruct.place(domConstruct.create("td", { innerHTML: "Notes", class: "col1" }), row);
                        domConstruct.place(domConstruct.create("td", { innerHTML: currentSiteObj.attributes.sitenotes, class: "col2" }), row);
                    }

                    // add class to table
                    domClass.add(table, "sitemeta");

                    // create site name header
                    if (site) {
                        var header = domConstruct.create("h3", { innerHTML: currentSiteObj.attributes.sitename });
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
              allData[Object.keys(allData)[1]].sort((a, b) => (a.depth > b.depth) ? 1 : -1);
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
                        if (chrons[i].chronologyid == null) {
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
                        script.get(config.dataServicesLocation + "/Chronologies/" + chrons[i].chronologyid,
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
                                        this[0]._displayChronologiesChart(this[0]._chronologyChartData["defaultChron"].chronologyid);
                                    }

                                    // enable chronology tab
                                    //this[0].chronologyTab.set("disabled", false);
                                } catch (e) {
                                    //alert("error getting chron data: " + e.message);
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
           
            postCreate: function () {
                this.inherited(arguments);
               
            }
        });
    });
