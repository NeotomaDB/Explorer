define(["dojo/_base/declare", "dgrid/OnDemandGrid", "dojo/store/Memory", "dojo/_base/lang", "dijit/form/Button", "dijit/popup", "dijit/Toolbar", "dijit/TooltipDialog", "dojo/topic", "dojo/dom-construct", "dojo/on", "dojo/query", "dojo/dom-style", "dojo/mouse", "neotoma/app/neotoma", "dojo/aspect", "dojo/dom-class"],
    function (declare, OnDemandGrid, Memory, lang, Button, popup, Toolbar, TooltipDialog, topic, domConstruct, on, query, domStyle, mouse, neotoma, aspect, domClass) {
        return declare([OnDemandGrid], {
            showHeader: false,
            site: null, // used to have site if metadata is needed
            columns: [
                {
                    label: "Dataset Type",
                    field: "DatasetType",
                    formatter: function (value) {
                        // make sure image exists
                        if (dojo.config.app.iconStore.get(value) == null) {
                            alert("There is no icon for this dataset type");
                            return "";
                        }
                        return '<img src="resources/datasetIcons/' + dojo.config.app.iconStore.get(value).image + '" title="' + value + '"></img>';
                    }
                },
                {
                    label: "CollUnitHandle",
                    field: "CollUnitHandle",
                    //formatter: function (_item) {
                    //    var datasetLabel = _item.CollUnitHandle;
                    //    if (_item.CollUnitName) {
                    //        datasetLabel += "_" + _item.CollUnitName;
                    //    }
                    //    var content = [];
                    //    content.push('<div class="mini" onmouseover="datasetRowOver(this);" onmouseout="datasetRowOut(this);">');
                    //    content.push('<a href="javascript:showDatasetExplorer(' + _item.DatasetID + ');">' + datasetLabel + '</a>');
                    //    content.push('<div style="display:none;float:right;">');
                    //    content.push('<button class="dsView" name="view" type="button" title="View dataset" onclick="showDatasetExplorer(' + _item.DatasetID + ');"/>');
                    //    content.push('<button class="dsAdd" name="add" type="button" title="Add to tray" onclick="addDatasetToTray(' + _item.DatasetID + ');"/>');
                    //    content.push('</div>');
                    //    content.push('</div>');
                    //    return content.join("");
                    //},
                    renderCell: lang.hitch(this,function (row, value, node, options) {
                        try {
                            var datasetLabel = row.CollUnitHandle;
                            if (row.CollUnitName) {
                                datasetLabel += "_" + row.CollUnitName;
                            }

                            // create dataset description
                            var description = [];
                            description.push("Database: " + row.DatabaseName);
                            description.push("Dataset type: " + row.DatasetType);
                            description.push("Dataset ID: " + row.DatasetID);
                            
                            //var content = [];
                            //content.push('<a title="' + description.join("\n") + '" href="javascript:mainToolbar.showDatasetExplorer(' + row.DatasetID + ',\'' + row.DatasetType + '\',\'' + row.DatabaseName + '\');">' + datasetLabel + '</a>');
                            //content.push('<div style="display:none;float:right;">');
                            //content.push('<button class="dsView" name="view" type="button" title="View dataset" onclick="mainToolbar.showDatasetExplorer(' + row.DatasetID + ',\'' + row.DatasetType + '\',\'' + row.DatabaseName + '\');"/>');
                            //content.push('<button class="dsAdd" name="add" type="button" title="Add to tray" onclick="addDatasetToTray(' + row.DatasetID + ');"/>');
                            //content.push('</div>');

                            var cellDiv = domConstruct.create("div",
                                {
                                    "class": "mini"
                                }
                            );

                            //// add a tag with dataset name
                            //var hrefHandler = function () {
                            //    mainToolbar.showDatasetExplorer(row.DatasetID, row.DatasetType, row.DatabaseName);
                            //};

                            domConstruct.create("a",
                                {
                                    title: description.join("\n"),
                                    innerHTML: datasetLabel,
                                    href: "javascript:mainToolbar.showDatasetExplorer(" + row.DatasetID + ",'" + row.DatasetType + "','" + row.DatabaseName + "');"
                                    //href: "javascript:mainToolbar.showDatasetExplorer(" + row.DatasetID + ",'" + row.DatasetType + "','" + row.DatabaseName + "'," + null + "," + JSON.stringify(row.Embargo) + ");"
                                },
                                cellDiv
                            );

                            // add div to contain buttons
                            var buttonsDiv = domConstruct.create("div",
                                {
                                    style: "display:none;float:right;"
                                },
                                cellDiv
                            );

                            // add buttons
                            domConstruct.create("button", {
                                type: "button",
                                title: "View Dataset",
                                "class": "dsView",
                                name: "view",
                                click: function () {
                                    if (row.Embargo != null) {
                                        alert("This dataset is embargoed and can't be viewed in the Dataset Explorer.");
                                        return;
                                    } else {
                                        mainToolbar.showDatasetExplorer(row.DatasetID, row.DatasetType, row.DatabaseName);
                                    }
                                    
                                }
                            }, buttonsDiv);

                            domConstruct.create("button", {
                                type: "button",
                                title: "Add to tray",
                                "class": "dsAdd",
                                name: "add",
                                click: function () {
                                    neotoma.addDatasetToTray(row.DatasetID);
                                }
                            }, buttonsDiv);


                            // add event handlers
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
                            alert("error in widget/SiteDatasetsGrid: " + e.message);
                        }
                    })
                }
            ],
            postCreate: function () {
                this.inherited(arguments);

                // highlight embargoed rows
                aspect.after(this, "renderRow", function (row, args) {
                    if (args[0].Embargo != null) {
                        domClass.add(row, "highlightEmbargoedRow");
                    }
                    return row;
                });
            }
        });
    }
);