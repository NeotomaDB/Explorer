define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/time.html", "dijit/_WidgetsInTemplateMixin", "dojo/dom", "dijit/popup", "dojo/_base/lang", "dojo/store/Memory", "dojo/request/script", "dojo/_base/config", "dojo/topic", "dijit/form/NumberTextBox", "dijit/form/Button", "dijit/form/RadioButton", "dijit/form/CheckBox", "dijit/TooltipDialog"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, dom, popup, lang, Memory, script, config, topic) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            advancedAgesVisible: false,
            clearAll: function() {
                this.ageOlder.set("value", "");
                this.ageYounger.set("value", "");
                this.resultsContain.set("value", true);
                this.exactlyDated.set("value", false);
            },
            _getValueAttr: function () {
                if ((this.ageOlder.get("value")) || (this.ageYounger.get("value"))) {
                    var exactlyDated = false;
                    if (this.exactlyDated.get("value")) {
                        exactlyDated = true;
                    }

                    return {
                        ageOlder: this.ageOlder.get("value"),
                        ageYounger: this.ageYounger.get("value"),
                        resultType: this.resultsContain.get("value") || this.resultsIntersect.get("value"),
                        exactlyDated: exactlyDated
                    };
                } else {
                    return null;
                }
            },
            handleEnter: function (evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        this.doSearch();
                        break;
                }
            },
            agesTTDialogClose: function () {
                popup.close(this.agesTTDialog);
                this.advancedAgesVisible = false;
            },
            advancedAgesClick: function () {
                try {
                    // show/hide popup
                    if (this.advancedAgesVisible) { // hide
                        popup.close(this.agesTTDialog);
                        this.advancedAgesVisible = false;
                    } else { // show
                        popup.open({
                            popup: this.agesTTDialog,
                            around: this.advancedAges.domNode,
                            onCancel: function () {
                                popup.close(this.agesTTDialog);
                                this.advancedAgesVisible = false;
                            }
                        });
                        this.advancedAgesVisible = true;
                    }
                } catch (e) {
                    alert("error in search/Time.advancedAgesClick: " + e.message);
                } 
            },
            ageScaleChanged: function (ageScaleId) {
                if ((ageScaleId == null) || (ageScaleId === "")) {
                    return;
                }
                // clear any previous displayed value
                this.period.set("displayedValue", "");

                // populate taxa store
                //topic.publish("neotoma/search/StartBusy");
                script.get(config.appServicesLocation + "/RelativeAges",
                    { jsonp: "callback", query: { agescaleid: ageScaleId } }
                ).then(lang.hitch(this, function (response) {
                    try {
                        //topic.publish("neotoma/search/StopBusy");
                        if (response.success) {
                            // set store
                            this.period.set("store", new Memory({
                                idProperty: "relativeageid",
                                data: response.data
                            }));
                            // clear any previous displayed value
                            this.period.set("displayedValue", "");
                        } else {
                            alert(response.message);
                        }
                    } catch (e) {
                        alert("Error in search/Time.ageScaleChanged: " + e.message);
                    }
                }));
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
                    //config.ageSet = true;
                }
            },
            ageFocused: function () {
                // clear out and selected ages in the age tooltip dialog
                topic.publish("neotoma/advancedSearch/AgeChanged");
            },
            postCreate: function () {
                this.inherited(arguments);

                // populate age scales
                script.get(config.dbServicesLocation + "/RelativeAgeScales",
                        { jsonp: "callback", query: { sort: "relativeagescale" } }
                    ).then(lang.hitch(this.ageScale, function (response) {
                        try {
                            if (response.success) {
                                // populate store
                                this._set("store", new Memory({ idProperty: "relativeagescaleid", data: response.data }));
                            } else {
                                alert("server error in search/Time.postCreate loading age scales" + response.message);
                            }
                        } catch (e) {
                            alert("error in search/Time.postCreate loading age scales: " + e.message);
                        }
                    }));

                // listen for user to change age
                topic.subscribe("neotoma/advancedSearch/AgeChanged",
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

            }
        });
    });