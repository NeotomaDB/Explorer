define(["dojo/request/script", "dojo/_base/config", "dojo/_base/declare", "dgrid/OnDemandGrid", "dojo/store/Memory", "dojo/_base/lang", "dijit/form/Button", "dijit/popup", "dijit/Toolbar", "dijit/TooltipDialog", "dojo/topic", "dojo/dom-construct", "dojo/on", "dojo/query", "dojo/dom-style", "dojo/mouse", "neotoma/app/neotoma","dojo/aspect", "dojo/dom-class"],
    function (script, config, declare, OnDemandGrid, Memory, lang, Button, popup, Toolbar, TooltipDialog, topic, domConstruct, on, query, domStyle, mouse, neotoma, aspect, domClass) {
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
                            alert("There is no icon for this dataset type");
                            return "";
                        }
                        return '<img src="resources/datasetIcons/' + dojo.config.app.iconStore.get(value).image + '" title="' + value + '"></img>';
                    }
                },
                {
                    label: "CollUnitHandle",
                    field: "collunithandle",
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
                            var datasetLabel = row.collunithandle;
                            if (row.collunitname) {
                                datasetLabel += "_" + row.collunitname;
                            }

                            // create dataset description
                            var description = [];
                            description.push("Database: " + row.databasename);
                            description.push("Dataset type: " + row.datasettype);
                            description.push("Dataset ID: " + row.datasetid);
                            
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
                                    href: "javascript:mainToolbar.showDatasetExplorer(" + row.datasetid + ",'" + row.datasettype + "','" + row.databasename + "');"
                                    //href: "javascript:mainToolbar.showDatasetExplorer(" + row.DatasetID + ",'" + row.DatasetType + "','" + row.DatabaseName + "'," + null + "," + JSON.stringify(row.Embargo) + ");"
                                },
                                cellDiv
                            );

                            // add div to contain buttons
                            var buttonsDiv = domConstruct.create("div",
                                {
                                    style: "display:block;float:right;"
                                },
                                cellDiv
                            );

                            // add buttons
                            // view
                            domConstruct.create("button", {
                                type: "button",
                                title: "View Dataset",
                                "class": "dsView",
                                name: "view",
                                click: function () {
                                    if (row.embargo != null) {
                                        alert("This dataset is embargoed and can't be viewed in the Dataset Explorer.");
                                        return;
                                    } else {
                                        mainToolbar.showDatasetExplorer(row.datasetid, row.datasettype, row.databasename);
                                    }
                                    
                                }
                            }, buttonsDiv);

                            // add to tray
                            domConstruct.create("button", {
                                type: "button",
                                title: "Add to tray",
                                "class": "dsAdd",
                                name: "add",
                                click: function () {
                                    neotoma.addDatasetToTray(row.datasetid);
                                }
                            }, buttonsDiv);
                            console.log("row",row.datasettype);

                            // doi or landing page
                            if (row.datasettype !== "geochronologic") {
                               
                              domConstruct.create("button", {
                                type: "button",
                                title: "Visit DOI page",
                                "class": "dsDOI",
                                click: function () {
                                  script.get(config.dataServicesLocation + "/datasets/?datasetids=" + row.datasetid,
                                    { jsonp: "callback" }
                                  ).then(lang.hitch(this, function (response) {
                                      if (response.success) {
                                        var datasetDOI = response.data[0].doi;
                                        if (!datasetDOI) {
                                          alert("A DOI does not yet exist for one or more selected datasets.");
                                        } else {
                                          var url = "https://doi.org/" + datasetDOI;
                                          window.open(url);
                                        }
                                      } else {
                                        alert("error getting doi for this dataset: " + response.message);
                                      }
                                    }),
                                    function (response) {
                                        alert("error sending request for dataset: " + response);
                                    }
                                  );
                                }
                              }, buttonsDiv);

                            } else if (row.datasettype === "geochronologic") {

                              domConstruct.create("button", {
                                type: "button",
                                title: "Visit dataset landing page",
                                "class": "dsLP",
                                click: function () {
                                  var url = "https://data.neotomadb.org/" + row.datasetid;
                                  window.open(url);
                                }
                              }, buttonsDiv);

                            }
  
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
                    if (args[0].embargo != null) {
                        domClass.add(row, "highlightEmbargoedRow");
                    }
                    return row;
                });
            }
        });
    }
);
