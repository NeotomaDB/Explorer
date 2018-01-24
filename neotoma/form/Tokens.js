define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/tokens.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dstore/Memory", "dstore/LocalDB", "dojo/topic", "dijit/registry", "dojo/dom-geometry", "dijit/form/Button", "dijit/form/RadioButton", "dijit/form/NumberSpinner", "neotoma/widget/AccessTokensGrid", "dijit/layout/AccordionContainer", "dijit/layout/AccordionPane"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, LocalDB, topic, registry, domGeometry) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            currentSearchFormHeight: 400,
            heightIncrement: 50,
            selectedRb: "basic",
            addTokenClick_oldDgrid: function() {
                // get token
                var token = this.newToken.get("value");
                if (token === "") {
                    alert("Please enter a token.");
                    return;
                }

                // get grid's store. Create if needed.
                var grid = this.tokensGrid;
                var store = grid.get("store");
                if (store == null) {
                    store = new Memory(
                        {
                            data: [],
                            idProperty: "token"
                        }
                    );

                    grid.set("store",store);
                }

                // add token
                store.put({token:token});
                grid.refresh();
                //grid.resize();

                // clear out new token
                this.newToken.set("value","");
            },
            addTokenClick: function () {
                try {
                    // get token
                    var token = this.newToken.get("value");
                    if (token === "") {
                        alert("Please enter a token.");
                        return;
                    }

                    // get grid's store. Create if needed.
                    var grid = this.tokensGrid;
                    var store = grid.get("collection");
                    if (store == null) {
                        //store = new Memory(
                        //    {
                        //        data: [],
                        //        idProperty: "token"
                        //    }
                        //);

                        store = new LocalDB({
                            dbConfig: dojo.config.localDbConfig,
                            storeName: 'tokens'
                        });

                        grid.set("collection", store);
                    }

                    // add token
                    //var rec = { id: token};
                    //store.put(rec);
                    grid.addToken(token);

                    ////var allRecs = store.filter({ });
                    //store.forEach(function (token) {
                    //    console.log(token);
                    //})


                    // update grid
                    grid.refresh();

                    // clear out new token
                    this.newToken.set("value", "");
                } catch (e) {
                    alert("Error in addTokenClick: " + e.message);
                }
               
            },
            postCreate: function () {
                this.inherited(arguments);

                try {
                    // populate with current values
                    var settingsJSON = localStorage.getItem("neotomaExplorer");
                    if (settingsJSON !== null) {
                        // parse settings
                        var settings = JSON.parse(settingsJSON);

                        // set access tokens
                        this.tokensGrid.set("collection",
                            new LocalDB({
                                dbConfig: dojo.config.localDbConfig,
                                storeName: 'tokens'
                            })
                        );

                        // update dojo.config.app.tokens
                        this.tokensGrid.updateAppTokens();
                    }
                } catch (e) {
                    alert("Error in form/Tokens.postCreate: " + e.message);
                }

           }
        });
});