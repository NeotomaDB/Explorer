define(["dojo/_base/declare", "dijit/layout/StackContainer", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/datasetTray.html", "dijit/_WidgetsInTemplateMixin", "dojo/store/Memory", "dojo/_base/array", "dojo/_base/lang", "dojo/topic", "dojo/request/script", "neotoma/util/export", "dojo/_base/config", "dojo/has", "neotoma/widget/SelectedDatasetsGrid", "dijit/form/FilteringSelect"],
    function (declare, StackContainer, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, Memory, array, lang, topic, script, exExport, config, has) {
        return declare([StackContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            saveDataset: function (datasetId) {
                // retrieve data for dataset. call Downloads resource
                //alert("in saveDataset for datasetId: " + datasetId);
                try {
                    var data = null;

                    // create config object for request. Add tokens if they exist.
                    var requestConfig = {
                        jsonp: "callback"
                    };
                    if (dojo.config.app.tokens !== "") {
                        requestConfig.query = { tokens: dojo.config.app.tokens };
                    }

                    // send request to Downloads resource
                    script.get(config.dataServicesLocation + "/Downloads/" + datasetId,
                        requestConfig
                    ).then(lang.hitch(this, function (response) {
                        try {
                            if (response.success) {
                                // create file name
                                var fileName = "dataset" + datasetId;

                                // read response
                                var datasetResponse = response.data[0];

                                // get dataset type and handle geochron
                                if (datasetResponse.DatasetType === "geochronologic") {
                                    // load geochron data
                                    script.get(config.appServicesLocation + "/Geochronologies",
                                        { jsonp: "callback", query: { datasetid: datasetId } }
                                    ).then(lang.hitch([this,fileName],
                                        function (response) {
                                            if (response.success) {
                                                // display geochron data
                                                data = response.data;
                                                var fileName = this[1];
                                                // save in correct format
                                                switch (this[0].saveFormat.get("value")) {
                                                    case "csv":
                                                        fileName += ".csv";
                                                        // convert to csv
                                                        var csvData = exExport.csv(data);
                                                        // save csv
                                                        exExport.save(csvData, fileName);
                                                        break;
                                                    case "json":
                                                        fileName += ".json";
                                                        // save original response
                                                        exExport.save(datasetResponse, fileName);
                                                        break;
                                                    default:
                                                        alert("unknown format: " + this[0].saveFormat.get("value"));
                                                        break;
                                                }
                                            } else {
                                                alert("error getting geochronology data in form/DatasetTray.saveDataset: " + response.message);
                                                return;
                                            }
                                        }
                                    ),
                                        function (response) {
                                            alert("Error in form/DatasetTray.saveDataset: " + response);
                                        }
                                    );
                                   
                                } else {
                                  
                                    // parse with brian's function
                                    var sheetResponse = this._formatSheet(datasetResponse.samples);

                                    // initialize array with header records
                                    data = this._createHeaderRecordsForSave(sheetResponse).data;

                                    // add variables records
                                    data = data.concat(sheetResponse.variables);

                                    // save in correct format
                                    switch (this.saveFormat.get("value")) {
                                        case "csv":
                                            fileName += ".csv";
                                            // convert to csv
                                            var csvData = exExport.csv(data);
                                            // save csv
                                            exExport.save(csvData, fileName);
                                            break;
                                        case "json":
                                            fileName += ".json";
                                            // save original response
                                            exExport.save(datasetResponse, fileName);
                                            break;
                                        default:
                                            alert("unknown format: " + format);
                                            break;
                                    }
                                }
                            } else {
                                alert("error in form/DatasetTray.SaveDataset: " + response.message);
                            }
                        } catch (e) {
                            alert("error parsing response from form/DatasetTray.SaveDataset: " + e.message);
                        }
                    })); // end then function
                } catch (e) {
                    alert("Error in form/DatasetTray.saveDataset: " + e.message);
                }
            },
            saveAllDatasets: function () {
                // get all datasets
                var datasetIds = [];
                var store = this.selectedDatasetsGrid.get("store")
                if (store) {
                    array.forEach(store.data,
                       lang.hitch(this, function (dataset) {
                           datasetIds.push(dataset.datasetId);
                       }
                   ));
                }

                // if is chrome or firefox and only one dataset in tray, download directly from client
                if (((has("chrome")) || (has("mozilla"))) && (datasetIds.length === 1)) {
                    // download directly from browser
                    this.saveDataset(datasetIds[0]);
                } else {
                    // send request for zip
                    var requestUrl = config.dataServicesLocation + "/Downloads/" + datasetIds.join(",") + "?format=csv";

                    if (dojo.config.app.tokens !== "") {
                        requestUrl = requestUrl + "&tokens=" + dojo.config.app.tokens;
                    }

                    window.open(requestUrl, "_blank");
                }
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
                        outSample["sampleId"] = inSample.sampleid;
                        outSample["sampleName"] = inSample.samplename || "";
                        outSample["unitName"] = inSample.analysisunitname || "";
                        outSample["depth"] = inSample.analysisunitdepth || "";
                        outSample["thickness"] = inSample.analysisunitthickness || "";

                        // add to outSamples
                        outSamples.push(outSample);

                        // create chron objects to hold age data; chron object includes array of sample age strings by sampleId
                        for (var ci = 0; ci < inSample.sampleages.length; ci++) {
                            inSampAge = inSample.sampleages[ci];
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
                        inSampleDataArray = inSample.sampledata;
                        var numSampleData = inSampleDataArray.length;
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
                                newVariable["name"] = inSampleData.taxonname;
                                //newVariable["group"] = inSampleData.taxagroup;
                                newVariable["group"] = inSampleData.ecolgroupid;
                                newVariable["element"] = inSampleData.variableelement;
                                newVariable["units"] = inSampleData.variableunits;
                                newVariable["context"] = inSampleData.variablecontext || "";
                                //TODO: handle VariableModifications array
                                outVariables[varId] = newVariable;
                            }

                            // see if value is presence/abscense
                            thisValue = inSampleData.value;
                            if (inSampleData.variableunits === "present/absent") {
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
                    alert("Error in form/DatasetTray._formatSheet: " + e.message);
                }
            },
            _createHeaderRecordsForSave: function (allData) {
                try {
                    var columns = [
                   { label: 'Name', field: 'name' },
                   { label: 'Group', field: 'group' },
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
                        columns.push({ label: "S" + thisSampleObj.sampleId, field: "S" + thisSampleObj.sampleId });
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
                } catch (e) {
                    alert("error in form/Dataset._createHeaderRecordsForSave: " + e.message);
                }
            },
            _getVariableId: function (inVar, list) {
                var outVar;
                for (var key in list) {
                    if (list.hasOwnProperty(key)) {
                        outVar = list[key];
                        if (outVar.name == inVar.taxonname) {
                            if (outVar.element == inVar.variableelement) {
                                if (outVar.units == inVar.variableunits) {
                                    if ((outVar.context == inVar.variablecontext) || (!outVar.context && !inVar.variablecontext)) {
                                        return key;
                                    }
                                }
                            }
                        }
                    }
                }
                return null;
            },
            postCreate: function () {
                // set in app object
                dojo.config.app.forms.datasetsTray = this;

                // subscribe to topics
                topic.subscribe("explorer/dataset/AddToTray", lang.hitch(this, function () {
                    this.selectedDatasetsGrid.addDataset(arguments[0]);
                }));

                topic.subscribe("explorer/dataset/Save", lang.hitch(this, function (datasetId) {
                    this.saveDataset(datasetId);
                }));
            }
        });
    });
