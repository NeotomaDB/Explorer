define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/taxa.html", "dijit/_WidgetsInTemplateMixin", "dojo/request/script", "dojo/_base/lang", "dojo/topic", "dijit/registry", "dojo/store/Memory", "dojo/keys", "dojo/_base/array", "dijit/popup", "dojo/dom-class","dojo/dom-style", "dojo/dom", "dojo/_base/config", "dojo/dom-construct","dijit/form/FilteringSelect", "dijit/form/Button","dijit/layout/ContentPane", "dojo/dom-style", "dojo/query", "neotoma/search/AdvancedTaxa", "dijit/TooltipDialog", "dijit/form/CheckBox", "neotoma/widget/ElementTypesGrid", "neotoma/widget/TaphonomicTypesGrid"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, lang, topic, registry, Memory, keys, array, popup, domClass, domStyle, dom, config, domConstruct, FilteringSelect, Button, ContentPane) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            taxonIds: [],
            elementTypeIds: [],
            taphonomicTypeIds: [],
            allTaxaStore: null,
            taxaGroupId: null,
            advancedTaxaVisible: false,
            elementTypesVisible: false,
            taphonomicTypesVisible: false,
            taphonomyPane: null,
            showSubForm: function (form) {
                switch (form) {
                    case null:
                        // hide both
                        domClass.add(this.taphonomyPane.domNode, "hide");
                        domClass.add(this.abundancePane.domNode, "hide");
                        break;
                    case "taphonomy":
                        //alert("display taphonomy");
                        domClass.add(this.abundancePane.domNode, "hide");
                        domClass.remove(this.taphonomyPane.domNode, "hide");
                        //alert("displayed taphonomy");
                        break;
                    case "abundance":
                        domClass.add(this.taphonomyPane.domNode, "hide");
                        domClass.remove(this.abundancePane.domNode, "hide");

                        break;
                }
            },
            closeTaphonomicTypesTTDialog: function() {
                popup.close(this.taphonomicTypesTTDialog);
            },
            closeElementTypesTTDialog: function () {
                popup.close(this.elementTypesTTDialog);
            },
            closeAdvancedTaxaTTDialog: function () {
                popup.close(this.advancedTaxaTTDialog);
            },
            handleSubForm: function (checkBox, val) {
                //alert("checkBox: " + checkBox + " val: " + val);
                if (checkBox === "taphonomy") {
                    if (val) {
                        // make sure abundance checkbox is unchecked
                        if (this.includeAbundance.get("value")) {
                            this.includeAbundance.set("value", false);
                        }
                        
                        // display taphonomoy
                        domStyle.set(this.stack.domNode,
                            {
                                height: "auto"
                            }
                        );
                        this.stack.selectChild(this.taphonomyPane);
                        domStyle.set(this.taphonomyPane.domNode,
                           {
                               height: "120px",
                               display:"block",
                               overflow: "hidden"
                           }
                        );
                    } else {
                        // hide taphonomoy
                        domStyle.set(this.taphonomyPane.domNode,
                           {
                               height: "0px",
                               display:"none",
                               overflow: "hidden"
                           }
                        );
                    }
                } else {
                    if (val) {
                        // make sure taphonomy checkbox is unchecked
                        if (this.includeTaphonomy.get("value")) {
                            this.includeTaphonomy.set("value", false);
                        }

                        // display abundance
                        domStyle.set(this.stack.domNode,
                            {
                                height: "auto"
                            }
                        );
                        this.stack.selectChild(this.abundancePane);
                        domStyle.set(this.abundancePane.domNode,
                           {
                               height: "40px",
                               display: "block",
                               overflow: "hidden"
                           }
                        );
                    } else {
                        // hide abundance
                        domStyle.set(this.abundancePane.domNode,
                           {
                               height: "0px",
                               display: "none",
                               overflow: "hidden"
                           }
                        );
                    }
                }
            },
            includeTaphonomyChanged: function (val) {
                try {
                    // make sure dataset type and taxon are selected
                    if (val) {
                        var form = registry.byId("userSearchesNewForm");
                        if (form) {
                            if (form.datasetType.get("value") === "") {
                                alert("Please select a dataset type and taxon before including taphonomy.");
                                this.includeTaphonomy.set("value", false);
                                return;
                            } else {
                                if ((this.taxonName.get("value") === "") && (this.taxonIds.length === 0)) {
                                    alert("Please select a dataset type and taxon before including taphonomy.");
                                    this.includeTaphonomy.set("value", false);
                                    return;
                                }
                            }
                        }
                    }
                    
                    this.handleSubForm("taphonomy", val);
                } catch (e) {
                    alert("error in search/Taxa.includeTaphonomyChanged. c: " + c + ": " + e.message);
                }
            },
            includeAbundanceChanged: function (val) {
                try {
                    // make sure dataset type and taxon are selected
                    if (val) {
                        var form = registry.byId("userSearchesNewForm");
                        if (form) {
                            // check for taxon
                            if ((this.taxonName.get("value") === "") && (this.taxonIds.length === 0)) {
                                alert("Please select a 'pollen' or 'pollen surface sample' dataset type and taxon before including taphonomy.");
                                this.includeAbundance.set("value", false);
                                return;
                            }
                            // check dataset type
                            var datasetTypeId = form.datasetType.get("value");
                            if (datasetTypeId === "") {
                                alert("Please select a 'pollen' or 'pollen surface sample' dataset type and taxon before including abundance.");
                                this.includeAbundance.set("value", false);
                                return;
                            } else {
                                var rec = form.datasetType.get("store").get(datasetTypeId);
                                if ((rec.DatasetType !== "pollen") && (rec.DatasetType !== "pollen surface sample")) {
                                    alert("Please select a 'pollen' or 'pollen surface sample' dataset type and taxon before including abundance.");
                                    this.includeAbundance.set("value", false);
                                    return;
                                }
                            }
                        }
                    }
                    this.handleSubForm("abundance", val);
                } catch (e) {
                    alert("error in search/Taxa.includeAbundanceChanged: " + e.message);
                }
            },
            elementTypeChanged: function (val) {
                // make sure any previous multipleselection is cleared out
                if (val) {
                    this.elementType.set("placeHolder", "");
                    this.elementTypeIds = [];
                }

                // make sure nothing selected in tt dialog
                if (val !== "") {
                    this.elementTypesGrid.clear();
                }
            },
            taphonomicSystemChanged: function (val) {
                // clear out any taphonomic types
                this.taphonomicType.set({
                    value: "",
                    displayedValue: ""
                });

                // set the taphonomic types for this system 
                if (val !== "") {
                    script.get(config.appServicesLocation + "/TaphonomyTypes",
                        { jsonp: "callback", query: { taphonomicSystemId: val } }
                    ).then(lang.hitch(this, function (response) {
                        if (response.success) {
                            this.taphonomicType._set("store", new Memory({ idProperty: "TaphonomicTypeID", data: response.data }));
                            this.taphonomicTypesGrid.set("store", new Memory({ idProperty: "TaphonomicTypeID", data: response.data }));
                        } else {
                            alert("error in search/Taxa.taphonomicSystemChanged loading types: " + response.message);
                        }
                    }));
                } else {
                    // make sure nothing in taphonomic types popup
                    this.taphonomicTypesGrid.set({
                        store: new Memory({ data: [] })
                    }
                   );
                }
            },
            taphonomicTypeChanged: function (val) {
                // make sure any previous multipleselection is cleared out
                if (val) {
                    this.taphonomicType.set("placeHolder", "");
                    this.taphonomicTypeIds = [];
                }
                // make sure nothing selected in tt dialog
                if (val !== "") {
                    this.taphonomicTypesGrid.clear();
                }
            },
            handleEnter: function (evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        this.doSearch();
                        break;
                }
            },
            clearAll: function () {
                // clear taxon name
                this.taxonName.set(
                    {
                        value: "",
                        displayedValue: "",
                        placeHolder: ""
                    }
                );
                this.taxonIds = [];

                // clear checkboxes
                this.includeAbundance.set("value", false);
                this.includeTaphonomy.set("value", false);

                // clear element type and grid
                this.elementType.set(
                    {
                        value: "",
                        displayedValue: "",
                        store: new Memory({ data: [] }),
                        placeHolder: ""
                    }
               );
                this.elementTypesGrid.set(
                     {
                         store: new Memory({ data: [] })
                     }
                );

                 // clear taphonomic system
                 this.taphonomicSystem.set(
                     {
                         value: "",
                         displayedValue: "",
                         store: new Memory({ data: [] }),
                         placeHolder: ""
                     }
                 );

                 // clear taphonomic type
                 this.taphonomicType.set(
                     {
                         value: "",
                         displayedValue: "",
                         store: new Memory({ data: [] }),
                         placeHolder: ""
                     }
                 );
                 this.taphonomicTypesGrid.set(
                     {
                         store: new Memory({ data: [] })
                     }
                );

                // clear abundance
                this.abundance.set(
                     {
                         value: "",
                         displayedValue: "",
                         placeHolder: ""
                     }
                 );

                // clear advanced taxa grid
                this.advancedTaxaPane.clear();
            },
            clearElementType: function () {
                // clear element type and grid
                this.elementType.set(
                    {
                        value: "",
                        displayedValue: "",
                        store: new Memory({ data: [] }),
                        placeHolder: ""
                    }
               );
                this.elementTypesGrid.set(
                     {
                         store: new Memory({ data: [] })
                     }
                );
            },
            taxonNameChanged: function (val) {
                try {
                    if (val !== "") {
                        // make sure any previous multiple taxa selection is cleared out
                        this.taxonName.set({
                            placeHolder: ""
                        });
                        this.taxonIds = [];

                        // get taxon record
                        var taxon = this.taxonName.get("store").get(val);

                        // clear out any element types. Save id to restore later if valid
                        var currentId = this.elementType.get("value");
                        this.elementType.set({
                            value: "",
                            displayedValue: "",
                            store: new Memory({ data: [] }),
                            placeHolder: ""
                        });

                        // set the element types for this taxa group 
                        script.get(config.appServicesLocation + "/ElementTypes",
                            { jsonp: "callback", query: { taxonId: val } }
                        ).then(lang.hitch(this, function (response) {
                            if (response.success) {
                                try {
                                    // set the filteringSelect's store
                                    this.elementType._set("store", new Memory({ idProperty: "ElementTypeID", data: response.data }));

                                    // try to restore previous selection
                                    if (currentId) {
                                        this.elementType.set("value", currentId);
                                    }

                                    // set the elementTypesGrid store
                                    this.elementTypesGrid.set("store", new Memory({ idProperty: "ElementTypeID", data: response.data }));
                                    //this.elementTypesGrid.renderArray(response.data);
                                } catch (e) {
                                    alert("error in search/Taxa setting element types from taxonNameChanged: " + e.message);
                                }
                            } else {
                                alert("server error in search/Taxa setting element types taxonNameChanged: " + response.message);
                            }
                        }));

                        // see if abundance is needed
                        if (taxon) {
                            var abundanceGroups = ["VPL", "BRY", "FUN", "UPA"];
                            if (abundanceGroups.indexOf(taxon.TaxaGroupID) !== -1) {;
                                //// enable abundance radio button
                                //this.includeAbundance.set({
                                //    disabled: false,
                                //    checked: "checked"
                                //});
                                //domClass.remove(this.includeAbundance.domNode, "hide");
                                //domClass.remove(dom.byId("abundanceLabel"), "disabled");
                            }
                            else {
                                // make sure includeTaphonomy is checked
                                //this.includeTaphonomy.set("checked", "checked");

                                // disable abundance radio button and label
                                //this.includeAbundance.set("disabled", true);
                                //domClass.add(this.includeAbundance.domNode, "hide");
                               // domClass.add(dom.byId("abundanceLabel"), "disabled");
                            }
                        }
                    } else { // no taxon selected
                        // clear element type and grid
                        this.elementType.set(
                            {
                                value: "",
                                displayedValue: "",
                                store: new Memory({ data: [] }),
                                placeHolder: ""
                            }
                       );
                        this.elementTypesGrid.set(
                             {
                                 store: new Memory({ data: [] })
                             }
                        );
                    }
                } catch (e) {
                    alert("error in taxonNameChanged: " + e.message);
                } 
            },
            taxonNameFocused: function () {
                // clear allTaxa control
                this.taxonName.set(
                    {
                        value: "",
                        displayedValue: "",
                        placeHolder: ""
                    }
                );
                topic.publish("neotoma/advancedSearch/TaxonFocused");
            },
            advancedTaxaTTDialogClose: function () {
                popup.close(this.advancedTaxaTTDialog);
                this.advancedTaxaVisible = false;
                
                // set ids
                this.taxonIds = this.advancedTaxaPane.selectedTaxaGrid.getIds();

                // set message in taxon name filtering select
                // set message in filtering select
                if (this.taxonIds.length > 0) {
                    this.taxonName.set({
                        placeHolder: "Multiple taxa selected",
                        value: "",
                        displayedValue: ""
                    });
                } else {
                    this.taxonName.set("placeHolder", "");
                    this.taxonIds = null;
                }

                // set element types based on taxaGroupId
                this.set("taxaGroupId", this.advancedTaxaPane.get("taxaGroupId"));
            },
            advancedTaxaClick: function () {
                try {
                    // show/hide popup
                    if (this.advancedTaxaVisible) { // hide
                        popup.close(this.advancedTaxaTTDialog);
                        this.advancedTaxaVisible = false;
                    } else { // show
                        popup.open({
                            popup: this.advancedTaxaTTDialog,
                            around: this.advancedTaxa.domNode,
                            onCancel: function () {
                                popup.close(this.advancedTaxaTTDialog);
                                this.advancedTaxaVisible = false;
                            }
                        });
                        this.advancedTaxaVisible = true;
                    }
                } catch (e) {
                    alert("error in search/Time.advancedAgesClick: " + e.message);
                }
            },
            elementTypesTTDialogClose: function () {
                popup.close(this.elementTypesTTDialog);
                this.elementTypesVisible = false;
            },
            elementTypesBtnClick: function () {
                try {
                    // show/hide popup
                    if (this.elementTypesVisible) { // hide
                        popup.close(this.elementTypesTTDialog);
                        this.elementTypesVisible = false;
                    } else { // show
                        // show dialog
                        popup.open({
                            popup: this.elementTypesTTDialog,
                            around: this.elementTypesBtn.domNode,
                            onCancel: function () {
                                popup.close(this.elementTypesTTDialog);
                                this.elementTypesVisible = false;
                            }
                        });
                        this.elementTypesVisible = true;
                    }
                } catch (e) {
                    alert("error in search/Taxa.elementTypesBtnClick: " + e.message);
                }
            },
            elementTypesTTDialogShow: function () {
                this.elementTypesGrid.resize();
            },
            elementTypesTTDialogHide: function () {
                // get selected ids
                this.elementTypeIds = this.elementTypesGrid.getIds();

                // set message in filtering select
                if (this.elementTypeIds.length > 0) {
                    this.elementType.set({
                        placeHolder: "Multiple types selected",
                        value: "",
                        displayedValue:""
                    });
                } else {
                    this.elementType.set("placeHolder", "");
                }
            },
            taphonomicTypesTTDialogShow: function () {
                this.taphonomicTypesGrid.resize();
            },
            taphonomicTypesTTDialogHide: function () {
                // get selected ids
                this.taphonomicTypeIds = this.taphonomicTypesGrid.getIds();

                // set message in filtering select
                if (this.taphonomicTypeIds.length > 0) {
                    this.taphonomicType.set(
                        {
                            placeHolder: "Multiple types selected",
                            displayedValue: "",
                            value: ""
                        }
                     );
                } else {
                    this.taphonomicType.set("placeHolder", "");
                }
            },
            taphonomicTypesTTDialogClose: function () {
                popup.close(this.taphonomicTypesTTDialog);
                this.taphonomicTypesVisible = false;
            },
            taphonomicTypesBtnClick: function () {
                try {
                    // show/hide popup
                    if (this.taphonomicTypesVisible) { // hide
                        popup.close(this.taphonomicTypesTTDialog);
                        this.taphonomicTypesVisible = false;
                    } else { // show
                        popup.open({
                            popup: this.taphonomicTypesTTDialog,
                            around: this.taphonomicTypesBtn.domNode,
                            onCancel: function () {
                                popup.close(this.taphonomicTypesTTDialog);
                                this.taphonomicTypesVisible = false;
                            }
                        });
                        this.taphonomicTypesVisible = true;
                    }
                } catch (e) {
                    alert("error in search/Time.taphonomicTypesBtnClick: " + e.message);
                }
            },
            _getValueAttr: function () {
                try {
                    if (this.taxonIds == null) {
                        return null;
                    }
                    // add taxa ids
                    if (this.taxonIds.length > 0) {
                        var response = {
                            taxonIds: this.taxonIds
                        };
                    } else {
                        if (this.taxonName.get("value")) {
                            var response = {
                                taxonIds: [this.taxonName.get("value")]
                            };
                        } else {
                            var response = {};
                        }
                    }
                    

                    // see if including taphonomy or abundance
                    if (this.includeTaphonomy.get("value")) {
                        // add element types
                        if (this.elementTypeIds.length > 0) {
                            response.elementTypes = this.elementTypeIds;
                        } else {
                            if (this.elementType.get("value")) {
                                response.elementTypes = [this.elementType.get("value")];
                            }
                        }
                        
                        // add taphonomic types
                        if (this.taphonomicTypeIds.length > 0) {
                            response.taphonomicTypes = this.taphonomicTypeIds;
                        } else {
                            if (this.taphonomicType.get("value")) {
                                response.taphonomicTypes = [this.taphonomicType.get("value")];
                            }
                        }
                    } else if (this.includeAbundance.get("value")) {
                        // see if an abundance is selected
                        if (this.abundance.get("value")) {
                            response.abundance = {
                                minPercent: this.abundance.get("value")
                            };
                        }
                        
                        //// add how to apply abundance
                        //if (this.applySum.get("value")) {
                        //    response.abundance.applyTo = this.applySum.get("value");
                        //} else {
                        //    response.abundance.applyTo = this.applyIndividual.get("value");
                        //}
                    }

                    // return null if response has no parameters
                    var count = 0;
                    for (k in response) {
                        count += 1;
                    }
                    if (count === 0) {
                        return null;
                    } else {
                        return response;
                    }
                } catch (e) {
                    alert("Error in search/Taxa._getValueAttr: " + e.message);
                }

            },
            _setTaxaGroupIdAttr: function (taxaGroupId) {
                // clear out any element types. Save id to restore later if valid
                var currentId = this.elementType.get("value");
                this.elementType.set({
                    value: "",
                    displayedValue:""
                });

                // set the element types for this taxa group 
                if (taxaGroupId) {
                    script.get(config.appServicesLocation + "/ElementTypes",
                        { jsonp: "callback", query: { taxaGroupId: taxaGroupId } }
                    ).then(lang.hitch(this, function (response) {
                        if (response.success) {
                            try {
                                // set the filteringSelect's store
                                this.elementType._set("store", new Memory({ idProperty: "ElementTypeID", data: response.data }));

                                // try to restore previous selection
                                if (currentId) {
                                    this.elementType.set("value", currentId);
                                }

                                // set the elementTypesGrid store
                                this.elementTypesGrid.set("store", new Memory({ idProperty: "ElementTypeID", data: response.data }));
                                //this.elementTypesGrid.renderArray(response.data);
                            } catch (e) {
                                alert("error in search/Taxa setting element types from _setTaxaGroupIdAttr: " + e.message);
                            }
                        } else {
                            alert("server error in search/Taxa setting element types from _setTaxaGroupIdAttr: " + response.message);
                        }
                    }));
                }
                
            },
            _setTaxonNameStoreAttr: function (datasetTypeID) {
                // get the current taxon id and clear out any currently selected one
                var currentTaxonId = this.taxonName.get("value");

                this.taxonName.set({
                    value: "",
                    displayedValue: ""
                });

                // update store
                if (datasetTypeID === "") {
                    this.taxonName._set("store", this.allTaxaStore);

                    // try to select current taxon
                    if (currentTaxonId) {
                        this.taxonName.set("value", currentTaxonId);
                    }

                    // allow all taxa groups in advanced taxa form
                    this.advancedTaxaPane.setFilter(null);
                } else {
                    var filterFunction = function (item) {
                        if (item.DatasetTypeIDs.indexOf(datasetTypeID) !== -1) {
                            return true;
                        }
                    };
                    // filter taxa
                    if (this.allTaxaStore === null) {
                        alert("Taxa not loaded yet");
                        return;
                    }
                    this.taxonName._set("store",
                        new Memory({
                            idProperty:"TaxonID",
                            data: this.allTaxaStore.query(filterFunction)
                        })
                   );

                    // get all TaxaGroupIDs for taxa
                    var taxaGroupIds = [];
                    array.forEach(this.taxonName.get("store").data,
                        function (taxon) {
                            if (taxaGroupIds.indexOf(taxon.TaxaGroupID) === -1) {
                                taxaGroupIds.push(taxon.TaxaGroupID);
                            }
                        }
                    );

                    // set filter on taxa groups in advanced taxa form
                    this.advancedTaxaPane.setFilter(function (item) {
                        if (taxaGroupIds.indexOf(item.TaxaGroupID) !== -1) {
                            return true;
                        }
                    });

                    // try to select current taxon
                    if (currentTaxonId) {
                        this.taxonName.set("value", currentTaxonId);
                    } 
                }
            },
            setTaphonomySystems: function (data) {
                // clear out any existing value and set store
                this.taphonomicSystem.set({
                    value: "",
                    displayedValue: ""
                });

                // set store
                this.taphonomicSystem._set("store", new Memory({ idProperty: "TaphonomicSystemID", data: data }));

                // clear type
                this.taphonomicType.set(
                    {
                        value: "",
                        displayedValue: "",
                        store: new Memory({ data: [] }),
                        placeHolder: ""
                    }
                );
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
            postCreate: function () {
                this.inherited(arguments);

                // populate taxonName
                script.get(config.appServicesLocation + "/TaxaInDatasets",
                    { jsonp: "callback" }
                ).then(lang.hitch(this, function (response) {
                    if (response.success) {
                        this.allTaxaStore = new Memory({ idProperty: "TaxonID", data: response.data });
                        this.taxonName._set("store", this.allTaxaStore);
                    } else {
                        alert("error in search/TaxaAge.postCreate loading taxa: " + response.message);
                    }
                }));

                // populate abundances
                this.abundance.set("store", new Memory({
                    idProperty: "value",
                    data: this.abundances
                }));
            }
        });
    });