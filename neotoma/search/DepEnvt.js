define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/depenvt.html", "dijit/_WidgetsInTemplateMixin", "neotoma/store/JsonRest", "dojo/keys", "dojo/topic", "dijit/Tree", "dojo/_base/config", "dojo/dom-construct", "dijit/registry", "dojo/_base/lang"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, JsonRest, keys, topic, Tree, config, domConstruct, registry, lang) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            searchResults: null,
            store: null,
            tree: null,
            handleEnter: function (evt) {
                switch (evt.charOrCode) {
                    case keys.ENTER:
                        this.doSearch();
                        break;
                }
            },
            depEnvtNodeClick: function (item) {
                topic.publish("explorer/search/newDepEnvt", this.tree.get("selectedItems"));
                //console.log("clicked on " + item.DepEnvt + " ID: " + item.DepEnvtID);
            },
            clear: function() {
                //this.tree.set("model", null);
                // create new store

                console.log("in clear 1");
                this.store = null;
                console.log("in clear 2");
            },
            createTree: function() {
                var tree = registry.byId("depEnvtTree");
                if (tree) {
                    tree.destroyRecursive();
                }

                // create store with model for tree
                this.store = new JsonRest({
                    target: config.appServicesLocation + "/DepositionalEnvironments/",
                    idProperty: "DepEnvtID",
                    mayHaveChildren: function (object) {
                        // see if it has a children property
                        var hasChildren = "children" in object;
                        if (hasChildren) {
                            hasChildren = object["children"];
                        }
                        return hasChildren;
                        //return "children" in object;
                    },
                    getChildren: function (object, onComplete, onError) {
                        // retrieve the full copy of the object
                        this.get(object.DepEnvtID).then(
                            function (fullObject) {
                                // copy to the original object so it has the children array as well.
                                object.children = fullObject.children;
                                // now that we have the full object, we should have an array of children
                                onComplete(fullObject.children);
                            },
                            function (error) {
                                // an error occurred, log it, and indicate no children
                                console.error(error);
                                onComplete([]);
                            }
                        );
                    },
                    getRoot: function (onItem, onError) {
                        // get the root object, we will do a get() and callback the result
                        this.get("root").then(onItem, onError);
                    },
                    getLabel: function (object) {
                        // the name is the DepEnvt
                        return object.DepEnvt;
                    }
                });

                // create a div for the tree
                var container = domConstruct.create("div",
                    {
                        style: "height:150px;overflow:auto;"
                    },
                    "depEnvtTreePanel",
                    "before"
                );

                // create tree
                this.tree = new Tree({
                    model: this.store,
                    id:"depEnvtTree",
                    showRoot: false,
                    onClick: this.depEnvtNodeClick
                }, container).startup();
            },
            onShow: function() {
                this.inherited(arguments);
                this.createTree();
            },
            postCreate: function () {
                this.inherited(arguments);

                // listen for depositionalEnvironment to get focus. Then collapse tree and clear any selected nodes.
                topic.subscribe("neotoma/advancedSearch/depositionalEnvironmentFocused",
                    lang.hitch(this, function () {
                        var tree = registry.byId("depEnvtTree");
                        tree.set("paths", []);
                        tree.collapseAll();
                    })
                );
            }
        });
    });