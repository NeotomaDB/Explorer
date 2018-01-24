define(["dojo/_base/declare", "dgrid1/onDemandGrid", "dgrid/extensions/DijitRegistry", "dojo/dom-construct", "dojo/topic", "dojo/_base/lang"],
    function (declare, onDemandGrid, DijitRegistry, domConstruct, topic, lang) {
        return declare([onDemandGrid,DijitRegistry], {
            columns: {
                id: { label: "aa Access Token" },
                remove: {
                    label: " ",
                    renderCell: function (object, data, cell) {
                        return domConstruct.create("button", {
                            type: "button",
                            title: "Remove Token",
                            "class": "mini dsRemove",
                            onclick: lang.hitch(this,function () {
                                // remove token
                                topic.publish("neotoma/accessToken/Remove", object);
                                
                            })
                        });
                    }
                }
            },
            updateAppTokens: function () {
                var tokens = [];
                var c = 0;
                this.get("collection").forEach(
                    function (token) {
                        tokens.push(token.id);
                    }
                ).then(
                    function () {
                        dojo.config.app.tokens = tokens.join(",");
                    }
                );
            },
            addToken: function (token) {
                // add to store
                this.get("collection").put({ id: token });

                // update dojo.config.app.tokens
                this.updateAppTokens();
            },
            postCreate: function () {
                this.inherited(arguments);

                // handle removing tokens
                topic.subscribe("neotoma/accessToken/Remove",
                    lang.hitch(this,function (obj) {
                        this.get("collection").remove(obj.id).then(
                            function (success) {
                                //console.log("remove success: " + success);
                                if (success === false) {
                                    console.log("can't remove token.");
                                }
                            }
                        );

                        // update dojo.config.app.tokens
                        this.updateAppTokens();

                        // update grid
                        this.refresh();
                    })
                );
            }
        }
        );
    }
);