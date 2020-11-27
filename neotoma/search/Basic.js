define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/basic.html", "dijit/_WidgetsInTemplateMixin", "dojo/request/script", "dojo/store/Memory", "dojo/_base/lang", "dojo/topic", "dijit/registry", "dojo/query", "dijit/popup", "dojo/keys", "dojo/_base/array", "amagimap/util/misc", "dojo/_base/config", "dijit/form/Button", "dijit/form/NumberTextBox", "dijit/form/FilteringSelect", "dojox/widget/Standby", "dojo/dom-style", "dojo/query", "dijit/Toolbar", "dijit/TooltipDialog", "neotoma/search/MultipleTaxa"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, Memory, lang, topic, registry, query, popup, keys, array, misc, config) {
        // define widget
        return declare([ContentPane,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            ageSet: false,
            searchResults: null,
            _taxaIds: null,
            newSearchName: null,
            multipleTaxaVisible: false,
            clearAll: function () {
                this.ageOlder.set("value", null);
                this.ageYounger.set("value", null);
                this.allTaxa.set(
                    {
                        value: "",
                        displayedValue: "",
                        placeHolder: ""
                    }
                );
                this.abundance.set(
                    {
                        value: "",
                        displayedValue: ""
                    }
                );

                // clear multiple taxa grid
                this.multipleTaxaPane.clear();
            },
            clearAdvancedTaxa: false,
            ageScaleChanged: function (ageScaleId) {
                if ((ageScaleId == null) || (ageScaleId === "")) {
                    // clear out period too
                    return;
                }
                // populate taxa store
                topic.publish("neotoma/search/StartBusy");
                script.get(config.appServicesLocation + "/RelativeAges",
                    { jsonp: "callback", query: { agescaleid: ageScaleId } }
                ).then(lang.hitch(this,function (response) {
                    try {
                        topic.publish("neotoma/search/StopBusy");
                        if (response.success) {
                            // clear any previous displayed value
                            this.period.set("displayedValue", "");
                            // set store
                            this.period.set("store", new Memory({
                                idProperty: "relativeageid",
                                data: response.data
                            }));
                            // clear any previous displayed value
                            this.period.set("displayedValue", "");
                            // clear any previous displayed value
                            //this.period.set("value", "");
                        } else {
                            alert(response.message);
                        }
                    } catch (e) {
                        alert("Error in search/TaxaAge.ageScaleChanged: " + e.message);
                    }
                }));
            },
            dataTypeChanged: function (TaxaGroupID) {
                try {
                    //alert("TaxaGroupID: " + TaxaGroupID);
                    if (TaxaGroupID == null) {
                        return;
                    }
                    // filter the taxa
                    if (TaxaGroupID === "") {
                        this.allTaxa.set("query", {});
                    } else {
                        this.allTaxa.set("query", { taxagroupid: TaxaGroupID });
                    }

                    // clear out any existing taxa
                    this.allTaxa.set("value", "");
                } catch (e) {
                    alert("error in search/TaxaAge.dataTypeChanged: " + e.message);
                }

            },
            periodChanged: function (periodId) {
                if ((periodId == null) || (periodId === "")) {
                    return;
                }
                // get the store
                var store = this.period.get("store");
                if (store == null) {
                    alert("store is null");
                    return;
                }

                // get period
                var results = store.get(periodId);

                // put ages in form
                if (results) {
                    this.ageYounger.set("value", results.calageyounger);
                    this.ageOlder.set("value", results.calageolder);
                    this.ageSet = true;
                }
            },
            ageChanged: function (val) {
                // create new search name and publish
                this.newSearchName = this.allTaxa.get("displayedValue") + "[";
                if (this.newSearchName === "[") {
                    return;
                }
                if (this.ageOlder.get("value")) {
                    this.newSearchName += this.ageOlder.get("value").toString();
                }
                if (this.ageYounger.get("value")) {
                    this.newSearchName += "," + this.ageYounger.get("value").toString();
                }
                this.newSearchName += "]";
                topic.publish("neotoma/search/NewSearchName", this.newSearchName);
            },
            ageFocused: function () {
                // clear out and selected ages in the age tooltip dialog
                topic.publish("neotoma/search/AgeChanged");
            },
            taxonChanged: function (taxonId) {
                try {
                    // stop if multi-taxa
                    if (taxonId === "") {
                        return;
                    }

                    // clear out previous search results
                    this.set("taxaIds", null);

                    // get taxa group
                    if (taxonId == null) {
                        alert("null TAxonId");
                        return;
                    }
                    var rec = this.allTaxa.get("store").get(taxonId);
                    if (rec) {
                        var abundanceGroups = ["VPL", "BRY", "FUN", "UPA"];
                        if (abundanceGroups.indexOf(rec.TaxaGroupID) !== -1) {
                            query(".abundance").removeClass("hide");
                        }
                        else {
                            query(".abundance").addClass("hide");
                        }
                    }

                    // create new search name and publish topic
                    this.newSearchName = rec.TaxonName + "[";
                    if (this.ageOlder.get("value")) {
                        this.newSearchName += this.ageOlder.get("value").toString();
                    }
                    if (this.ageYounger.get("value")) {
                        this.newSearchName += "," + this.ageYounger.get("value").toString();
                    }
                    this.newSearchName += "]";
                    topic.publish("neotoma/search/NewSearchName", this.newSearchName);
                } catch (e) {
                    alert("Error in search/TaxaAge.taxonChanged: " + e.message);
                }
            },
            multipleTaxaClick: function () {
                try {
                    // show/hide popup
                    if (this.multipleTaxaVisible) { // hide
                        popup.close(this.multipleTaxaDialog);
                        this.multipleTaxaVisible = false;
                    } else { // show
                        popup.open({
                            popup: this.multipleTaxaDialog,
                            around: this.multipleTaxaBtn.domNode,
                            onCancel: function () {
                                popup.close(this.multipleTaxaDialog);
                                this.multipleTaxaVisible = false;
                            }
                        });
                        this.multipleTaxaVisible = true;
                    }
                } catch (e) {
                    alert("error in search/Basic.advancedAgesClick: " + e.message);
                }
            },
            multipleTaxaDialogClose: function () {
                try {
                    popup.close(this.multipleTaxaDialog);
                    this.multipleTaxaVisible = false;

                    // set ids
                    this._taxaIds = this.multipleTaxaPane.multipleTaxaGrid.getIds();
                    if (this._taxaIds.length === 0) {
                        this._taxaIds = null;
                        return;
                    }

                    this.allTaxa.set(
                        {
                            value: "",
                            placeHolder: "Multiple taxa selected"
                        }
                    );

                    // set clearAdvancedTaxa
                    this.clearAdvancedTaxa = false;

                    // change search name
                    this.newSearchName = this.multipleTaxaPane.searchText.get("value") + "[";
                    if (this.ageOlder.get("value")) {
                        this.newSearchName += this.ageOlder.get("value").toString();
                    }
                    if (this.ageYounger.get("value")) {
                        this.newSearchName += "," + this.ageYounger.get("value").toString();
                    }
                    this.newSearchName += "]";

                    topic.publish("neotoma/search/NewSearchName", this.newSearchName);
                } catch (e) {
                    alert("Error in search/Basic.multipleTaxaDialogClose: " + e.message);
                }

            },
            doSearch: function(searchName) {
                try {
                    // clear out previous results
                    this.searchResults = null;

                    // get parameters
                    var requestParams = this.userParameters();
                    if (requestParams == null) {
                        return;
                    }

                    // add tokens to parameters
                    requestParams.tokens = dojo.config.app.tokens;

                    // create an object to hitch function to
                    this.searchRequest = {
                        url: config.appServicesLocation + "/Search",
                        query: requestParams
                    };

                    // set clearAdvancedTaxa
                    this.clearAdvancedTaxa = true;

                    // send search request
                    topic.publish("neotoma/search/StartBusy");
                    script.get(config.appServicesLocation + "/Search",
                       { jsonp: "callback", query: { search: JSON.stringify(requestParams) } }
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
                                } else {
                                    alert("server error in search/Basic trying search: " + response.message);
                                }
                            } catch (e) {
                                alert("Error in search/Basic loading search results: " + e.message);
                            }
                        }),
                        function (response) {
                            alert("error in search/Basic trying search: " + response);
                        }
                   );

                    //// load sites
                    //topic.publish("neotoma/search/StartBusy");

                    //script.get(config.appServicesLocation + "/GetSites",
                    //    { jsonp: "callback", query: requestParams }
                    //).then(lang.hitch(this, function (response) {
                    //    topic.publish("neotoma/search/StopBusy");
                    //    if (response.success) {
                    //        try {
                    //            // stop if nothing was returned
                    //            if (response.data.length === 0) {
                    //                alert("No datasets found");
                    //                return;
                    //            } else {
                    //                var numDatasets = 0;
                    //                var numSites = 0;
                    //                array.forEach(response.data,
                    //                    function (site) {
                    //                        numSites += 1;
                    //                        numDatasets += site.datasets.length;
                    //                    }
                    //                );
                    //                var siteStr = "sites";
                    //                var datasetsStr = "datasets";
                    //                if (numSites === 1) {
                    //                    siteStr = "site";
                    //                }
                    //                if (numDatasets === 1) {
                    //                    datasetsStr = "dataset";
                    //                }
                    //                alert(numSites + " " + siteStr + " with " + numDatasets + " " + datasetsStr + " found");
                    //            }

                    //            // set results
                    //            this.searchResults = response.data;
                    //            topic.publish("neotoma/search/NewResult", {
                    //                data: response.data,
                    //                searchName: searchName,
                    //                request: this.searchRequest
                    //            });
                    //        } catch (e) {
                    //            alert("Error in search/TaxaAge.doSearch: " + e.message);
                    //        }

                    //    } else {
                    //        alert(response.message);
                    //    }
                    //}));
                } catch (e) {
                    alert("Error in search/Basic.doSearch: " + e.message);
                }
            },
            //  set ageScaleStore
            _setAgeScaleStoreAttr: function (value) {
                this.ageScale._set("store", value);
            },
            //  set taxaStore
            _setTaxaStoreAttr: function (value) {
                this.allTaxa._set("store", value);
            },
            _taxonClicked: function () {
                try {
                    // clear allTaxa control
                    this.allTaxa.set("placeHolder", "");
                    this.allTaxa.set("value", "");
                    this.allTaxa.set("displayedValue", "");
                    this._taxaIds = null;

                    // hide abundance
                    dojo.query(".abundance").addClass("hide");

                    // publish topic so advanced taxa form and clear itself
                    topic.publish("neotoma/search/TaxonFocused");
                } catch (e) {
                    alert("Error in SimpleSearch._taxonClicked(): " + e.message);
                }
            },
            setAdvancedTaxa: function (taxaIds, searchName, taxaGroupId) {
                this._taxaIds = taxaIds; // will run _setTaxaIdsAttr? - NO

                // hide abundance
                this.toogleAbundance(taxaGroupId);

                // show "Multiple taxa selected" in taxon filtering select
                this.allTaxa.set("value", "");
                this.allTaxa.set("placeHolder", "Multiple taxa selected");

                // set clearAdvancedTaxa
                this.clearAdvancedTaxa = false;

                // change search name
                this.newSearchName = searchName + "[";
                if (this.ageOlder.get("value")) {
                    this.newSearchName += this.ageOlder.get("value").toString();
                }
                if (this.ageYounger.get("value")) {
                    this.newSearchName += "," + this.ageYounger.get("value").toString();
                }
                this.newSearchName += "]";

                topic.publish("neotoma/search/NewSearchName", this.newSearchName);
            },
            toogleAbundance: function (taxaGroupID) {
                var abundanceGroups = ["VPL", "BRY", "FUN", "UPA"];
                if (abundanceGroups.indexOf(taxaGroupID) > -1) {
                //if (Ext.Array.contains(abundanceGroups, taxaGroupID)) {
                    dojo.query(".abundance").removeClass("hide");
                }
                else {
                    dojo.query(".abundance").addClass("hide");
                }
            },
            //  set taxaIds
            _setTaxaIdsAttr: function (value) {
                if (this.allTaxa.get("placeHolder") !== "Multiple taxa selected") {
                    this._taxaIds = value;
                    //console.log("set ids: " + value);
                } //else {
                 //   console.log("didn't set ids for advanced select");
                //}

                // hide abundance
                dojo.query(".abundance").addClass("hide");
            },
            //  get taxaIds
            _getTaxaIdsAttr: function () {
                return this._taxaIds;
            },
            userParameters: function () {
                var response = {};
                // see if multiple selected
                if (this._taxaIds != null) {
                    response.taxa = {
                        taxonIds: this._taxaIds
                    };
                } else {
                    var taxonId = this.allTaxa.get("value");
                    response.taxa = {
                        taxonIds: [taxonId]
                    };
                    if (!taxonId) {
                        alert("Select a taxon first");
                        return;
                    }
                }

                // make sure one age is entered
                var younger = this.ageYounger.get("value");
                var older = this.ageOlder.get("value");

                // make sure valid numbers
                if (isNaN(younger)) {
                    younger = "";
                }
                if (isNaN(older)) {
                    older = "";
                }

                // make sure ages are numeric
                if (younger !== "") {
                    if (!misc.isNumeric(younger)) {
                        alert(younger + " is not a valid younger age. Please only use numbers.");
                        return;
                    }
                }
                if (older !== "") {
                    if (!misc.isNumeric(older)) {
                        alert(older + " is not a valid older age. Please only use numbers.");
                        return;
                    }
                }

                // make sure in correct order if both are present - older > younger
                if ((younger !== "") && (older !== "")) {
                    if (younger > older) {
                        alert("Your younger age is greater than your older age. Please reverse your ages.");
                        return;
                    } else if (younger === older) {
                        alert("Your younger and older ages are equal. Please create at least a one year difference.");
                        return;
                    }
                }

                // add time to request if there is at least one
                if ((younger !== "") || (older !== "")) {
                    // at least one age. Initialize time part of request
                    response.time = {
                        resultType: "contains",
                        exactlyDated: false
                    };

                    // add younger
                    if (younger !== "") {
                        response.time.ageYounger = parseInt(younger);
                    } else {
                        response.time.ageYounger = null;
                    }

                    // add older
                    if (older !== "") {
                        response.time.ageOlder = parseInt(older);
                    } else {
                        response.time.ageOlder = null;
                    }
                } else {
                    response.time = null;
                }

                // see if abundance is needed and if it is, make sure one is entered
                var abundance = null;
                var abundanceFS = this.abundance;
                if (abundanceFS.domNode.className.indexOf(" hide") === -1) {
                    abundance = abundanceFS.get("value");
                    if (abundance === "") {
                        alert("Please select an abundance.");
                        return;
                    }
                    response.taxa.abundance = {
                        minPercent: abundance
                    };
                }
                return response;
            },
            handleEnter: function(evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        //alert("clicked enter");
                        // get search name
                        var newSearchName = this.allTaxa.get("displayedValue") + "[";
                        if (newSearchName === "[") {
                            alert("Please select a taxon first.");
                            return;
                        }
                        if (this.ageOlder.get("value")) {
                            newSearchName += this.ageOlder.get("value").toString();
                        }
                        if (this.ageYounger.get("value")) {
                            newSearchName += "," + this.ageYounger.get("value").toString();
                        }
                        newSearchName += "]";

                        // do search
                        this.doSearch(newSearchName);
                        break;
                    //default:
                    //    alert("clicked: " + evt.charOrCode);
                    //    break;
                }
            },
            postCreate: function () {
                this.inherited(arguments);

                // populate abundances
                this.abundance.set("store", new Memory({
                    idProperty: "value",
                    data: this.abundances
                }));

                try {
                    // load ageScale store
                    script.get(config.dbServicesLocation + "/RelativeAgeScales?limit=100",
                            { jsonp: "callback", query: {sort:"RelativeAgeScale"} }
                        ).then(lang.hitch(this.ageScale, function (response) {
                            try {
                                if (response.success) {
                                    // populate store
                                    this._set("store", new Memory({ idProperty: "relativeagescaleid", data: response.data }));
                                } else {
                                    alert("response error in search/TaxaAge.postCreate loading age scales" + response.message);
                                }
                            } catch (e) {
                                alert("error in search/TaxaAge.postCreate loading age scales: " + e.message);
                            }
                        }));

                    // load taxa
                    script.get(config.appServicesLocation + "/TaxaInDatasets",
                        { jsonp: "callback"}
                    ).then(lang.hitch(this, function (response) {
                        if (response.success) {
                            this.allTaxa._set("store", new Memory({ idProperty: "taxonid", data: response.data }));
                        } else {
                            alert("error in search/TaxaAge.postCreate loading taxa: " + response.message);
                        }
                    }));

                    //// load taxa group types
                    //script.get(appServicesLocation + '/TaxaGroupTypes',
                    //    { jsonp: "callback" }
                    //).then(lang.hitch(this, function (response) {
                    //    if (response.success) {
                    //        // populate filtering select
                    //        this.dataType.set("store", new Memory({
                    //            idProperty: "TaxaGroupID",
                    //            data: response.data
                    //        }));
                    //    } else {
                    //        alert("error in search/TaxaAge.postCreate loading taxa group types: " + response.message);
                    //    }
                    //}));

                    // listen for new multipleTaxa selections
                    topic.subscribe("neotoma/basicSearch/MultipleTaxaChanged", lang.hitch(this, function () {
                        var args = arguments[0];
                        //console.log(args.ids);
                        this.setAdvancedTaxa(args.ids, args.searchName, args.value);
                    }));

                    // listen for user to change age
                    topic.subscribe("neotoma/search/AgeChanged",
                        lang.hitch(this, function () {
                            try {
                                // clear agescale
                                this.ageScale.set("value", null);

                                // clear period. Also clear out store because no ageScale selected
                                this.period.get("store").data = [];
                                this.period.set("value", "");
                                this.period.set("displayedValue", "");
                            } catch (e) {
                                alert("Error in search/Basic subscribe('neotoma/search/AgeChanged'): " + e.message);
                            }

                        })
                    );
                } catch (e) {
                    alert("Error in search/Basic.postCreate: " + e.message);
                }
            },
            abundances: [
                            { text: '> 0%', value: "0" },
                            { text: '> 1%', value: "1" },
                            { text: '> 3%', value: "3" },
                            { text: '> 5%', value: "5" },
                            { text: '> 10%', value: "10" },
                            { text: '> 15%', value: "15" },
                            { text: '> 20%', value: "20" },
                            { text: '> 25%', value: "25" },
                            { text: '> 30%', value: "30" },
                            { text: '> 35%', value: "35" },
                            { text: '> 40%', value: "40" },
                            { text: '> 45%', value: "45" },
                            { text: '> 50%', value: "50" },
                            { text: '> 55%', value: "55" },
                            { text: '> 60%', value: "60" },
                            { text: '> 65%', value: "65" },
                            { text: '> 70%', value: "70" },
                            { text: '> 75%', value: "75" },
                            { text: '> 80%', value: "80" },
                            { text: '> 85%', value: "85" },
                            { text: '> 90%', value: "90" },
                            { text: '> 95%', value: "95" }
            ],
            _ageScaleAndPeriodTooltipVisible: false,
            ageScaleAndPeriodClick: function () {
                require(["dojo/on", "dijit/TooltipDialog", "dijit/form/FilteringSelect", "dijit/form/Button"],
                    lang.hitch(this,function (on, TooltipDialog, FilteringSelect, Button) {
                        // show/hide popup
                        if (this._ageScaleAndPeriodTooltipVisible) { // hide
                            popup.close(this.agesTTDialog);
                            this._ageScaleAndPeriodTooltipVisible = false;
                        } else { // show
                            popup.open({
                                popup: this.agesTTDialog,
                                around: this.ageScaleAndPeriodBtn.domNode
                            });
                            this._ageScaleAndPeriodTooltipVisible = true;
                        }
                    })
                );
            },
            closeAgesTTDialog: function () {
                popup.close(this.agesTTDialog);
                this._ageScaleAndPeriodTooltipVisible = false;
            },
            openAgesTTDialog: function () {
                //// make geologic time scale the default if nothing is selected
                //var currentAgeId = this.ageScale.get("value");
                //if (!currentAgeId) {
                //    // get store to get data
                //    var store = this.ageScale.get("store");
                //    if (store) {
                //        // select geologic age scale as default
                //        var ageId = -1;
                //        array.forEach(store.data,
                //            function (ageScale) {
                //                if (ageScale.RelativeAgeScale === "Geologic time scale") {
                //                    ageId = ageScale.RelativeAgeScaleID;
                //                }
                //            }
                //        );
                //        if (ageId !== -1) {
                //            this.ageScale.set("value", ageId);
                //        }
                //    }
                //}
            }
        });
});
