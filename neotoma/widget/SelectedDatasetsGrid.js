define(["dojo/_base/declare", "dgrid/OnDemandGrid", "dojo/store/Memory", "dojo/_base/lang", "dijit/form/Button", "dijit/popup", "dijit/Toolbar", "dijit/TooltipDialog", "dojo/topic", "dojo/dom-construct", "dojo/on", "dojo/query", "dojo/dom-style", "dojo/mouse"],
    function (declare, OnDemandGrid, Memory, lang, Button, popup, Toolbar, TooltipDialog, topic, domConstruct, on, query, domStyle, mouse) {
        return declare([OnDemandGrid], {
            showHeader: false,
            site: null, // used to have site if metadata is needed
            columns: [
                {
                    label: "Dataset Type",
                    field: "datasettype",
                    formatter: function (value) {
                        // make sure image exists
                        if (dojo.config.app.iconStore.get(value) == null) {
                            //alert("There is no icon for this dataset type");
                            return "";
                        }
                        return '<img src="resources/datasetIcons/' + dojo.config.app.iconStore.get(value).image + '" title="' + value + '"></img>';
                    }
                },
                {
                    label: "CollUnitHandle",
                    field: "collunithandle",
                    renderCell: function (row, value, node, options) {
                        try {
                            // create description tooltip
                            var description = [];
                            description.push("Database: " + row.databasename);
                            description.push("Dataset ID: " + row.datasetid);
                            description.push("Dataset type: " + row.datasettype);
                            description.push("Site name: " + row.site.sitename);
                            
    /*                        if (_item.site.SiteDescription) {
                                description.push("Description: " + _item.site.SiteDescription);
                            }*/

                            var datasetLabel = row.collunithandle;
                            if (row.collunitname) {
                                datasetLabel += "_" + row.collunitname;
                            }

                            //var content = [];
                            //content.push('<a title="' + description.join("\n") + '" href="javascript:showDatasetExplorer(' + row.DatasetID + ',\'' + row.DatasetType + '\',\'' + row.DatabaseName + '\');">' + datasetLabel + '</a>');
                            //content.push('<div style="display:none;position:relative;float:right;">');
                            //content.push('<button class="dsView" name="view" type="button" title="View dataset" onclick="showDatasetExplorer(' + row.DatasetID + ',\'' + row.DatasetType + '\',\'' + row.DatabaseName + '\');"/>');
                            //content.push('<button class="dsSave" name="save" type="button" title="Save dataset as csv file" onclick="app.forms.datasetsTray.saveDataset(' + row.DatasetID + ');"/>');
                            //content.push('<button class="dsRemove" name="remove" type="button" title="Remove dataset" onclick="app.forms.datasetsTray.selectedDatasetsGrid.removeDataset(' + row.DatasetID + ');"/>');
                            //content.push('</div>');

                            //var cellDiv = domConstruct.create("div",
                            //    {
                            //        "class": "mini",
                            //        innerHTML: content.join("")
                            //    }
                            //);


                            // create div to display cell
                            var cellDiv = domConstruct.create("div",
                                 {
                                     "class": "mini"
                                 }
                            );

                            // create dataset label
                            var labelTB = domConstruct.create("span",
                                {
                                    title: description.join("\n"),
                                    innerHTML: datasetLabel
                                },
                                cellDiv
                            );
                            on(labelTB, "click",
                                lang.hitch(this,function () {
                                    //_alert("show explorer");
                                    topic.publish("explorer/selectedDataset/click", "showExplorer");
                                })
                            );

                            // create toolbar
                            var toolbarDiv = domConstruct.create("div",
                               {
                                   style: "display:none;float:right;"
                               },
                               cellDiv
                            );
                            // create view dataset explorer button
                            var viewButton = domConstruct.create("button",
                               {
                                   "class": "dsView",
                                   name: "view",
                                   type: "button",
                                   title: "View dataset"
                               },
                               toolbarDiv
                            );
                            on(viewButton, "click",
                                function () {
                                    topic.publish("explorer/selectedDataset/click", "showExplorer");
                                }
                            );

                            // create save button
                            var saveButton = domConstruct.create("button",
                               {
                                   "class": "dsSave",
                                   name: "save",
                                   type: "button",
                                   title: "Save dataset as csv"
                               },
                               toolbarDiv
                            );
                            on(saveButton, "click",
                                function () {
                                    topic.publish("explorer/selectedDataset/click", "save");
                                }
                            );

                            // create remove button
                            var removeButton = domConstruct.create("button",
                               {
                                   "class": "dsRemove",
                                   name: "remove",
                                   type: "button",
                                   title: "Remove dataset"
                               },
                               toolbarDiv
                            );
                            on(removeButton, "click",
                                function () {
                                    topic.publish("explorer/selectedDataset/click", "remove");
                                }
                            );
                           

                            // add cellDiv event handlers
                            on(cellDiv, mouse.enter,lang.hitch(cellDiv,
                                function (evt) {
           
                                    // show toolbar
                                    var toolbar = query("div", this)[0];
                                    if (toolbar) {
                                        domStyle.set(toolbar, {
                                            display: "block"
                                        });
                                    }
                                }
                            ));

                            on(cellDiv, mouse.leave, lang.hitch(cellDiv,
                               function (evt) {
                                   // hide toolbar
                                   var toolbar = query("div", this)[0];
                                   if (toolbar) {
                                       domStyle.set(toolbar, {
                                           display: "none"
                                       });
                                   }
                               }
                           ));

                            return cellDiv;
                        } catch (e) {
                            alert("error in widget/SelectedDatasetsGrid: " + e.message);
                        }
                       
                    }
                }
            ],
            addDataset: function (dataset) {
                var store = this.get("store");
                // see if store needs created or updated
                if (store == null) {
                    store = new Memory({
                        idProperty: "datasetid",
                        data: [dataset]
                    });
                    this.set("store", store);
                    alert("DatasetID: " + dataset.datasetid + " was successfully added to tray.");
                } else {
                    if (store.get(dataset.datasetid)) {
                        alert("DatasetID: " + dataset.datasetid + " is already in the tray.");
                        return;
                    }
                    // add record
                    store.add(dataset);
                    alert("DatasetID: " + dataset.datasetid + " was successfully added to tray.");
                }
                // refresh grid
                this.refresh();
                this.resize();
            },
            removeDataset: function (datasetid) {
                // get datasets store
                var store = this.get("store");

                // remove record
                store.remove(datasetid);

                // refresh grid
                this.refresh();
            },
            removeAll: function () {
                // get datasets store
                var store = this.get("store");
                if (store) { // won't be a store if nothing was added to tray yet.
                    store.setData([]);

                    // refresh grid
                    this.refresh();
                }
            },
            clickOperation: "showExplorer",
            postCreate: function () {
                this.inherited(arguments);

                // listen for clicks on dataset rows
                this.on(".dgrid-row:click", lang.hitch(this, function (event) {
                    var row = this.row(event);

                    // see what to do
                    switch (this.clickOperation) {
                        case "showExplorer":
                            mainToolbar.showDatasetExplorer(row.data.datasetid, row.data.datasettype, row.data.databasename, row.data.site);
                            break;
                        case "remove":
                            this.removeDataset(row.data.datasetid);
                            break;
                        case "save":
                            topic.publish("explorer/dataset/Save", row.data.datasetid);
                            break;
                    }

                    // set default operation
                    //this.clickOperation = "";
                }));

                // listen for row clicks
                topic.subscribe("explorer/selectedDataset/click",
                    lang.hitch(this, function (operation) {
                        this.clickOperation = operation;
                    })
                );
            }
        });
    }
);