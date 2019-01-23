define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/advancedTaxa.html", "dijit/_WidgetsInTemplateMixin", "dojo/request/script", "dojo/store/Memory", "dojo/_base/lang", "dijit/registry", "dojo/topic", "dojo/_base/config", "dijit/form/Button", "dijit/form/FilteringSelect", "dojox/widget/Standby", "dojo/dom-style", "dojo/query", "neotoma/widget/AdvancedTaxaGrid"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, Memory, lang, registry, topic, config) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            taxaGroupStore: null,
            //taxaToSelect: null,
            goClick: function () {
                try {
                    // get taxa group
                    var taxaGroupId = this.taxaGroup.get("value");
                    if (taxaGroupId === "") {
                        alert("Select a taxa group.");
                        return;
                    }

                    // get search text
                    var taxaText = this.searchText.get("value");
                    if (taxaText === "") {
                        alert("Enter at least a partial taxon name.");
                        return;
                    }

                    // create parameters for taxa request
                    var params = {
                        taxagroup: taxaGroupId,
                        taxonname: "*" + taxaText + "*"
                    };

                    // send request
                    //advancedTaxaStandby.show();
                    script.get(config.dataServicesLocation + '/Taxa',
                        { jsonp: "callback", query: params }
                    ).then(lang.hitch(this, function (response) {
                        //advancedTaxaStandby.hide();
                        try {
                            if (response.success) {
                                // populate filtering select
                                this.selectedTaxaGrid.set("store", new Memory({
                                    idProperty: "TaxonID",
                                    data: response.data
                                }));
                                this.selectedTaxaGrid.resize();
                            } else {
                                alert(response.message);
                            }
                        } catch (e) {
                            alert("Error loading taxa found using search term '" + taxaText + "': " + e.message);
                        }
                        
                    }));
                } catch (e) {
                    alert("Error in search/AdvancedTaxa.goClick: " + e.message);
                }
            },
            saveSelection: function () {
                try {
                    // get selected ids
                    var ids = this.selectedTaxaGrid.getIds();

                    // make sure at least one
                    if (ids.length < 1) {
                        alert("Please select at least one taxon.");
                        return;
                    }             
              
                    // publish topic
                    topic.publish("neotoma/basicSearch/AdvancedTaxaChanged", {
                        ids: ids,
                        searchName: this.searchText.get("value"),
                        value: this.taxaGroup.get("value")
                    });

                    // close form
                    this.getParent().hide();
                } catch (e) {
                    alert("Error in AdvancedTaxa.saveSelection(): " + e.message);
                }
                
            },
            clear: function () {
                try {
                    // clear taxa group
                    this.taxaGroup.set("value", "");
                    this.taxaGroup.set("displayedValue", "");

                    // clear search string
                    this.searchText.set("value", "");

                    // clear grid
                    this.selectedTaxaGrid.set("store", null);
                    this.selectedTaxaGrid.refresh();
                } catch (e) {
                    alert("Error in AdvancedTaxa.clear(): " + e.message);
                }  
            },
            _getTaxaGroupIdAttr: function() {
                return this.taxaGroup.get("value");
            },
            _setTaxaGroupIdAttr: function (taxaGroupId) {
                this.taxaGroup.set("value", taxaGroupId);
            },
            setFilter: function(filterFunction) {
                if (filterFunction) {
                    this.taxaGroup.set("store",
                        new Memory({
                            idProperty: "TaxaGroupID",
                            data: this.taxaGroupStore.query(filterFunction)
                        })
                    );

                    //// see if there are taxa to select
                    //if (this.taxaGroup.get("store").data.length > 0) {
                    //    this.taxaToSelect = true;
                    //} else {
                    //    this.taxaToSelect = false;
                    //}
                } else {
                    this.taxaGroup.set("store", this.taxaGroupStore);
                }
            },
            postCreate: function () {
                try {
                    this.inherited(arguments);

                    // populate taxa groups
                    script.get(config.appServicesLocation + '/TaxaGroupTypes',
                        { jsonp: "callback" }
                    ).then(lang.hitch(this, function (response) {
                        if (response.success) {
                            // create taxaGroupStore
                            this.taxaGroupStore = new Memory({
                                idProperty: "TaxaGroupID",
                                data: response.data
                            });

                            // populate filtering select
                            this.taxaGroup.set("store", this.taxaGroupStore);

                        } else {
                            alert(response.message);
                        }
                    }));

                    // listen for taxon to get focus. Then clear out taxa group, taxa table, and search for text
                    topic.subscribe("neotoma/advancedSearch/TaxonFocused",
                        lang.hitch(this, function () {
                            // do taxa group
                            this.taxaGroup.set(
                                {
                                    value: "",
                                    displayedValue: ""
                                }
                            )
                            // do partial taxa name text
                            this.searchText.set("value", "");

                            // do grid
                            var store = this.selectedTaxaGrid.get("store");
                            if (store != null) {
                                store.data = [];
                                this.selectedTaxaGrid.refresh();
                            }
                        })
                    );
                } catch (e) {
                    alert("Error in search/AdvancedTaxa.postCreate: " + e.message);
                } 
            },
            onShow: function () {
                this.inherited(arguments);
                this.selectedTaxaGrid.resize();
            }
        });
});