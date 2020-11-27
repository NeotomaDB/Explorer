define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/metadata.html", "dijit/_WidgetsInTemplateMixin", "dojo/request/script", "dojo/keys", "dojo/_base/lang", "dojo/store/Memory", "dijit/popup", "dojo/topic", "dojo/_base/array", "dojo/_base/config", "dojo/date", "dojo/dom-class", "dijit/form/FilteringSelect", "neotoma/search/DepEnvt", "dijit/TooltipDialog", "dijit/form/Button", "dijit/form/TextBox", "dijit/form/DateTextBox", "dijit/CalendarLite", "neotoma/widget/FilteringSelect"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, keys, lang, Memory, popup, topic, array, config, date, domClass) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            depEnvtIds: [],
            advancedDepEnvtVisible: false,
            calendarBtnVisible: false,
            clearAll: function () {
                // clear depositional environment
                this.depositionalEnvironment.set(
                    {
                        value: "",
                        placeHolder: ""
                    }
                 );
                this.depEnvtIds = [];
                this.advancedDepEnvtPane.createTree();

                this.collectionType.set("value", "");
                this.database.set("value", "");
                this.sampleKeyword.set("value", "");
                this.siteName.set("value", "");
                this.personName.set("value", "");
                this.submitDate.set("value", "any");
                this.submitDateCalendar.set("value", "");

            },
            handleEnter: function (evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        //this.doSearch();
                        break;
                }
            },
            submitDateChanged: function (val) {
                var btn = this.submitDateCalendarBtn;
                if (val === "custom") {
                    domClass.remove(btn.domNode, "hide");
                } else {
                    // hide button
                    domClass.add(btn.domNode, "hide");
                }
            },
            submitDateFocused: function () {
                this.submitDate.set("value","any");
            },
            depositionalEnvironmentFocused: function() {
                this.depositionalEnvironment.set(
                    {
                        value:"",
                        displayedValue:"",
                        placeHolder:""
                    }
                );
                this.depEnvtIds = [];
                topic.publish("neotoma/advancedSearch/depositionalEnvironmentFocused");
            },
            submitDateCalendarClick: function () {
                try {
                    // show/hide popup
                    if (this.calendarBtnVisible) { // hide
                        popup.close(this.calendarTTDialog);
                        this.calendarBtnVisible = false;
                    } else { // show
                        popup.open({
                            popup: this.calendarTTDialog,
                            around: this.submitDateCalendarBtn.domNode,
                            onCancel: function () {
                                popup.close(this.calendarTTDialog);
                                this.calendarBtnVisible = false;
                            }
                        });
                        this.calendarBtnVisible = true;
                    }
                } catch (e) {
                    alert("error in search/Metadata.advancedDepEnvtClick: " + e.message);
                }
            },
            calendarTTDialogClose: function () {
                popup.close(this.calendarTTDialog);
                this.calendarBtnVisible = false;

                //// set ids
                //this.taxonIds = this.advancedTaxaPane.selectedTaxaGrid.getIds();

                //// set message in taxon name filtering select
                //// set message in filtering select
                //if (this.taxonIds.length > 0) {
                //    this.taxonName.set({
                //        placeHolder: "Multiple taxa selected",
                //        value: "",
                //        displayedValue: ""
                //    });
                //} else {
                //    this.taxonName.set("placeHolder", "");
                //}
            },
            advancedDepEnvtTTDialogClose: function () {
                popup.close(this.advancedDepEnvtTTDialog);
                this.advancedDepEnvtVisible = false;

                //// set ids
                //this.taxonIds = this.advancedTaxaPane.selectedTaxaGrid.getIds();

                //// set message in taxon name filtering select
                //// set message in filtering select
                //if (this.taxonIds.length > 0) {
                //    this.taxonName.set({
                //        placeHolder: "Multiple taxa selected",
                //        value: "",
                //        displayedValue: ""
                //    });
                //} else {
                //    this.taxonName.set("placeHolder", "");
                //}
            },
            advancedDepEnvtClick: function() {
                try {
                    // show/hide popup
                    if (this.advancedDepEnvtVisible) { // hide
                        popup.close(this.advancedDepEnvtTTDialog);
                        this.advancedDepEnvtVisible = false;
                    } else { // show
                        popup.open({
                            popup: this.advancedDepEnvtTTDialog,
                            around: this.advancedDepEnvt.domNode,
                            onCancel: function () {
                                popup.close(this.advancedDepEnvtTTDialog);
                                this.advancedDepEnvtVisible = false;
                            }
                        });
                        this.advancedDepEnvtVisible = true;
                    }
                } catch (e) {
                    alert("error in search/Metadata.advancedDepEnvtClick: " + e.message);
                }
            },
            _getValueAttr: function () {
                try {
                    var response = {};
                    if (this.depEnvtIds.length > 0) {
                        response.depositionalEnviromentIds = this.depEnvtIds;
                    }
                    if (this.collectionType.get("value")) {
                        response.collectionTypeId = this.collectionType.get("value");
                    }
                    if (this.database.get("value")) {
                        response.databaseId = this.database.get("value");
                    }
                    if (this.sampleKeyword.get("value")) {
                        response.sampleKeywordId = this.sampleKeyword.get("value");
                    }
                    if (this.siteName.get("value")) {
                        response.siteName = this.siteName.get("value");
                    }
                    if (this.personName.get("value")) {
                        response.personId = this.personName.get("value");
                    }

                    // get submit date
                    switch (this.submitDate.get("value")) {
                        case "any":
                            break;
                        case "week":
                            response.submitDate = date.add(new Date(), "week", -1);
                            break;
                        case "month":
                            response.submitDate = date.add(new Date(), "month", -1);
                            break;
                        case "year":
                            response.submitDate = date.add(new Date(), "year", -1);
                            break;
                        case "custom":
                            if (this.submitDateCalendar.get("value")) {
                                response.submitDate = this.submitDateCalendar.get("value");
                            } else {
                                alert("Please select a submission date, or change the date type to 'Any'.");
                                return "stop";
                            }
                            break;
                    }


                    // return null if no parameters
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
                    alert("Error in search/Metadata._getValueAttr: " + e.message);
                }

            },
            postCreate: function () {
                this.inherited(arguments);

                // populate collectionType
                script.get(config.appServicesLocation + "/collectionTypes",
                    { jsonp: "callback" }
                ).then(lang.hitch(this.collectionType, function (response) {
                    // not busy any more
                    //topic.publish("neotoma/search/StopBusy");
                    // handle response
                    try {
                        if (response.success) {
                            // populate store
                            this._set("store", new Memory({ idProperty: "colltypeid", data: response.data }));

                            // pick first one
                            //this._set("value", 1);
                        } else {
                            alert(response.message);
                        }
                    } catch (e) {
                        alert("Error loading collection types for metadata search: " + e.message);
                    }
                }));

                // populate keywords
                script.get(config.appServicesLocation + "/keywords",
                    { jsonp: "callback" }
                ).then(lang.hitch(this.sampleKeyword, function (response) {
                    // not busy any more
                    //topic.publish("neotoma/search/StopBusy");
                    // handle response
                    try {
                        if (response.success) {
                            // populate store
                            this._set("store", new Memory({ idProperty: "keywordid", data: response.data }));

                            // pick first one
                            //this._set("value", 1);
                        } else {
                            alert(response.message);
                        }
                    } catch (e) {
                        alert("Error loading keywords for metadata search: " + e.message);
                    }
                }));

                //populate constituent databases, if needed
                if (this.database.get("store").data.length === 0) {
                    script.get(config.dbServicesLocation + "/ConstituentDatabases?limit=100",
                        { jsonp: "callback" }
                    ).then(lang.hitch(this.database, function (response) {
                        //topic.publish("neotoma/search/StopBusy");
                        try {
                            if (response.success) {
                                // populate store
                                this._set("store", new Memory({ idProperty: "databaseid", data: response.data }));
                                // sort store
                                var sort = { sort: [{ attribute: "DatabaseName", descending: false }] }
                                //this.set("query", sort);
                                //var data = grid.get("store").query({}, sort);
                            } else {
                                alert("response error setting constituent databases: " + response.message);
                            }
                        } catch (e) {
                            alert("error in search/Metadata.postCreate setting constituent databases: " + e.message);
                        }
                    }));
                }

                // populate personName
                script.get(config.appServicesLocation + "/authorpis",
                    { jsonp: "callback" }
                ).then(lang.hitch(this.personName, function (response) {
                    // not busy any more
                    //topic.publish("neotoma/search/StopBusy");
                    // handle response
                    try {
                        if (response.success) {
                            // populate store
                            this._set("store",new Memory({ idProperty: "contactid", data: response.data }));

                            // pick first one
                            //this._set("value", 1);
                        } else {
                            alert(response.message);
                        }
                    } catch (e) {
                        alert("Error loading authors and pis for metadata search: " + e.message);
                    }
                }));

                // set default submission date
                //this.submitDate.set("value", date.add(new Date(), "day", -28));

                // listen for a new depositional environment to be selected
                topic.subscribe("explorer/search/newDepEnvt",
                    lang.hitch(this, function (items) {
                        if (items.length === 1) {
                            // set depEnvtIds
                            this.depEnvtIds = [items[0].DepEnvtID];

                            // put name in textbox
                            this.depositionalEnvironment.set(
                                {
                                    value: items[0].DepEnvt,
                                    placeHolder:""
                                }
                             );
                        } else if (items.length === 0) {
                            // set depEnvtIds
                            this.depEnvtIds = [];

                            // put name in textbox
                            this.depositionalEnvironment.set(
                                {
                                    value: "",
                                    placeHolder:""
                                }
                             );
                        } else { // multiple selected
                            // clear out existing ids
                            this.depEnvtIds = [];
                            array.forEach(items,
                                lang.hitch(this,function (item) {
                                    this.depEnvtIds.push(item.DepEnvtID);
                                })
                            );

                            // set place holder
                            this.depositionalEnvironment.set(
                                {
                                    value: "",
                                    placeHolder:"Multiple selected"
                                }
                            );
                        }

                    })
                );
            }
        });
    });
