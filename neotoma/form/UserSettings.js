define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/userSettings.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dstore/Memory", "dstore/LocalDB", "dojo/topic", "dijit/registry", "dojo/dom-geometry", "dijit/form/Button", "dijit/form/RadioButton", "dijit/form/NumberSpinner", "neotoma/widget/AccessTokensGrid", "dijit/layout/AccordionContainer", "dijit/layout/AccordionPane"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, LocalDB, topic, registry, domGeometry) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            currentSearchFormHeight: 400,
            heightIncrement: 50,
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
            spinHtChange: function(evt) {
                var spin = registry.byId("spinFormHt");
                var newHeight = spin.get("value");

                // get map height
                var mapNode = registry.byId("mapPane").domNode;
                var mapPosition = domGeometry.position(mapNode);
                var mapHeight = mapPosition.h - 100;

                // don't resize if form will be taller than mapHeight or shorter than default height
                if ((newHeight >= mapHeight) || (newHeight < 400) ) {
                    // don't change height and rollback spinner value
                    alert("The form is already as tall as it can be for the current map height.");
                    spin.set("value", this.currentSearchFormHeight);
                }
                else {
                    this.currentSearchFormHeight = newHeight;
                    topic.publish("neotoma/search/NewFormHeight", newHeight);
                }
            },
            heightClick: function(evt) {
                switch (evt.currentTarget.name) {
                    case "incHeight":
                        // calculate new height
                        var searchForm = registry.byId("userSearchesNewForm");
                        var currentHeight = searchForm.get("advancedHeight");
                        var newHeight = currentHeight + this.heightIncrement;

                        // get map height
                        var mapNode = registry.byId("mapPane").domNode;
                        var mapPosition = domGeometry.position(mapNode);
                        var mapHeight = mapPosition.h - 70;

                        // stop if new height is greater than adjusted map height
                        if (newHeight >= mapHeight) {
                            return;
                        }

                        this.currentSearchFormHeight = newHeight;
                        topic.publish("neotoma/search/NewFormHeight", newHeight);
                        break;
                    case "decHeight":
                        // calculate new height
                        var searchForm = registry.byId("userSearchesNewForm");
                        var currentHeight = searchForm.get("advancedHeight");
                        var newHeight = currentHeight - this.heightIncrement;

                        // make sure not < 400
                        if (newHeight < 400) {
                            return;
                        }

                        this.currentSearchFormHeight = newHeight;
                        topic.publish("neotoma/search/NewFormHeight", newHeight);
                        break;
                }
            },
            show: function () {
                this.inherited(arguments);
            },
            hide: function () {
                this.inherited(arguments);
                
                // create settings object
                var settings = {
                    searchFormHeight: this.currentSearchFormHeight
                }
                // save settings
                localStorage.setItem("neotomaExplorer", JSON.stringify(settings));
            }
        });
});
