define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/sitePopup.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/store/Memory", "dojo/_base/array", "dojo/dom", "dojo/dom-construct", "dojo/dom-class", "dojo/number", "dijit/popup", "dojo/request/script", "dijit/layout/ContentPane", "dojo/on", "neotoma/util/layer", "neotoma/app/neotoma", "dojo/_base/config", "neotoma/widget/SiteDatasetsGrid", "dijit/Toolbar", "dijit/form/Button"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, array, dom, domConstruct, domClass, numberUtil, popup, script, ContentPane, on, layerUtil, neotoma, config) {
        // define widget
        return declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            sites: null,
            siteIndex: null,
            bbLayer: null,
            toolbarClick: function(evt) {
                switch (evt.currentTarget.name) {
                    case "zoomToSite":
                        // get site, create geom, zoom to location
                        var site = this.sites[this.siteIndex];
                        var siteGeom = new ol.geom.Point(ol.proj.transform([site.attributes.longitude, site.attributes.latitude], 'EPSG:4326', 'EPSG:3857'));
                        dojo.config.map.getView().fit(siteGeom, { duration: 1000, maxZoom: 14 });
                        
                        break;
                    case "addAllDatasets":
                        neotoma.addAllToTray();
                        break;
                    case "boundingBox":
                        try {
                            var site = this.sites[this.siteIndex];

                            // get attributes to read data
                            var atts = site.attributes;

                            // see if site has a bounding box
                            if ((atts.longitudewest === atts.longitudeeast) || (atts.latitudesouth === atts.latitudenorth)) {
                                alert("This site only has point coordinates");
                                return;
                            }

                            // create bbox
                            var bounds = ol.extent.boundingExtent([[atts.longitudewest, atts.latitudesouth], [atts.longitudeeast, atts.latitudenorth]]);
                            bounds = ol.proj.transformExtent(bounds, ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));
                            
                            // find layer. Create if doesn't exist
                            if (this.bbLayer == null) {

                              // create empty layer source
                              this.bbLayerSource = new ol.source.Vector({});

                              // create layer
                              this.bbLayer = new ol.layer.Vector({
                                source: this.bbLayerSource,
                                properties: {
                                  id: "bbLayer"
                                }
                               
                              });
                              // add layer to map
                              dojo.config.map.addLayer(this.bbLayer);

                            } 
                          
                            // if there is no feature, add it. If there is one, remove it.
                            if (this.bbLayer.getSource().getFeatures().length > 0) {

                              // clear source features
                              this.bbLayerSource.clear();

                              // set button class
                              domClass.remove(this.bboxButton.domNode, "bboxOn");
                              domClass.add(this.bboxButton.domNode, "bboxOff");

                            } else { // no bbox, add it

                              // create feature
                              var polygon = new ol.geom.Polygon.fromExtent(bounds);
                              var feature = new ol.Feature(polygon);
                              // add feature, zoom to extent
                              this.bbLayerSource.addFeatures([feature]);
                              dojo.config.map.getView().fit(bounds, { duration: 1000 });

                              // set button class
                              domClass.remove(this.bboxButton.domNode, "bboxOff");
                              domClass.add(this.bboxButton.domNode, "bboxOn");

                            }

                          // refresh layer
                          //this.bbLayerSource.refresh();
                          //this.bbLayer.setStyle(this.bbLayer.getStyle());
                          break;
      
                        } catch (e) {
                            alert("Error in dialog/SitePopup.toolbarClick: " + e.message);
                        }  
                }
            },
            displaySite: function () {
                try {
                    var site = this.sites[this.siteIndex];

                    // clear out any previous bounding box
                    if (this.bbLayer) {
                      this.bbLayerSource.clear();
                    }

                    // get attributes to read id
                    var atts = site.attributes;

                    // set site on siteDatasetsGrid. Use used to get Site metadata for a dataset added to tray
                    this.siteDatasetsGrid.set("site", {
                        siteid: atts.siteid,
                        sitename: atts.sitename,
                        sitedescription: atts.sitedescription,
                        longitude: atts.longitude,
                        latitude: atts.latitude
                    });

                    // change title
                    this.set("title", "Site ID: " + atts.siteid);

                    // clear out any previous site metadata
                    this.siteData.set("content", "");

                    // create table for site metadata
                    var table = domConstruct.create("table");

                    // add class to table
                    domClass.add(table, "sitepop");

                    // create and populate rows
                    var row = domConstruct.create("tr", null, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Site name", class: "col1" }), row);
                    domConstruct.place(domConstruct.create("td", { innerHTML: atts.sitename, class: "col2" }), row);
                    if (atts.sitedescription) {
                        var row = domConstruct.create("tr", null, table);
                        
                        
                        domConstruct.place(domConstruct.create("td", { innerHTML: "Description", class: "col1" }), row);

                        // original way
                        //domConstruct.place(domConstruct.create("td", { innerHTML: atts.SiteDescription, class: "col2", style: "max-height:20px;" }), row);

                        // try to scroll long description
                        var td = domConstruct.create("td", { class: "col2"}, row);
                        var div = domConstruct.create("div", { innerHTML: atts.sitedescription, style: "max-height:120px;overflow:auto;" }, td);
                    }
                    

                    var row = domConstruct.create("tr", null, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Longitude", class: "col1" }), row);
                    var cell = domConstruct.create("td", { class: "col2" }, row);
                    var div = domConstruct.create("div", null, cell);
                    domConstruct.place("<span>" + numberUtil.format(atts.longitude, { pattern: "#.######" }) + "</span>", div);
                    //domConstruct.place(domConstruct.create("td", { innerHTML: numberUtil.format(atts.Longitude, { pattern: "#.######" }), class: "col2" }), row);

                    // see if site has a bounding box
                    if ((atts.longitudewest !== atts.longitudeeast) && (atts.latitudesouth !== atts.latitudenorth)) {
                        // has bounding box
                        this.bboxButton.set("disabled", false);
                        this.bboxButton.set("title", "Show site's bounding box");
                    } else {
                        // no bounding box
                        this.bboxButton.set("disabled", true);
                        this.bboxButton.set("title", "This site has no bounding box");
                    }
                    
                    // do latitude
                    var row = domConstruct.create("tr", null, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Latitude", class: "col1" }), row);
                    domConstruct.place(domConstruct.create("td", { innerHTML: numberUtil.format(atts.latitude, { pattern: "#.######" }), class: "col2" }), row);

                    // add "Datasets" row with link for all datasets
                    var row = domConstruct.create("tr", null, table);
                    domConstruct.place(domConstruct.create("td", {innerHTML:"Datasets", class:"col1"}), row);
                    var cell = domConstruct.create("td", {class:"col2"}, row);
                    var div = domConstruct.create("div", {class:"sitepop dsToggle"}, cell);
                    var cp = new ContentPane({id:"dstMatch", content:"Matching", class:"dstActive"});
                    on(cp, "click", lang.hitch(this, this.showMatchingDatasets));
                    cp.domNode.title = "Show datasets matching search criteria";
                    cp.placeAt(div);
                    domConstruct.place("<span style='padding:0 4px; vertical-align: top;'>|</span>", div);
                    var cp = new ContentPane({id:"dstAll", content:"All @ site"});
                    on(cp, "click", lang.hitch(this, this.showAllDatasets));
                    cp.domNode.title = "Show any/all datasets at site";
                    cp.placeAt(div);
                    domConstruct.place(cell, row);

                    // add embargoed legend
                    var row = domConstruct.create("tr", null, table);
                    domConstruct.place(domConstruct.create("td", { innerHTML: "Embargoed", class: "col1" }), row);
                    domConstruct.place(domConstruct.create("td", {innerHTML: " ", "class": "highlightEmbargoedRow" }), row)

                    //domConstruct.create("button", {class:"mini dsAddAll", onclick:addAllToTray, title:"Add all datasets to tray"}, cell);
                    

                    // set site metadata
                    domConstruct.place(table, this.siteData.domNode);

                    // set datasets grid's data
                    this.setDatasets(atts.datasets);

                    // set siteCountDisplay
                    var countMessage = this.siteIndex + 1;
                    countMessage += " of " + this.sites.length;
                    this.siteCountDisplay.set("content", countMessage);
                } catch (e) {
                    //alert("error in SitePopup.displaySite: " + e.message);
                }
            },
            setDatasets: function (data) {
                this.siteDatasetsGrid.set("store",
                    new Memory(
                        {
                            idProperty: "datasetid",
                            data: data
                        }
                    )
                );
                this.siteDatasetsGrid.refresh();
                this.siteDatasetsGrid.resize();
            },
            numTries: 0,
            showAllDatasets: function (evt) {
                try {
                    // get site attributes to read datasets
                    var atts = this.sites[this.siteIndex].attributes;
                    // see if site has all datasets
                    if (!atts.alldatasets) { // need to get all datasets and then display
                        if (this.numTries < 6) {
                            this.numTries += 1;
                            setTimeout(lang.hitch(this, this.showAllDatasets), 200);
                        } else {
                            alert("Can't get all datasets for this site.");
                        }
                        
                        return;
                    } else { // display
                        this.setDatasets(atts.alldatasets);
                    }

                    // change styles
                    domClass.add(dom.byId("dstAll"), "dstActive");
                    domClass.remove(dom.byId("dstMatch"), "dstActive");

                } catch (e) {
                    alert("error in dialog/SitePopup.showAllDatasets: " + e.message);
                }
            },
            showMatchingDatasets: function (evt) {
                try {
                    // get site attributes to read datasets
                    var atts = this.sites[this.siteIndex].attributes;
                    // show matching datasets
                    this.setDatasets(atts.datasets);

                    // change styles
                    domClass.add(dom.byId("dstMatch"), "dstActive");
                    domClass.remove(dom.byId("dstAll"), "dstActive");

                } catch (e) {
                    alert("error in dialog/SitePopup.showMatchingDatasets: " + e.message);
                }
            },
            hide: function () {
                this.inherited(arguments);

                // unselect markers for all sites
                if (this.sites) {
                    array.forEach(this.sites, function (site) {
                        if (dojo.config.app.layersSelectControl) {
                          dojo.config.app.layersSelectControl.getFeatures().clear();
                        }
                    });
                }

                // clear out any drawn boxes
                var layers = dojo.config.map.getLayers();
                layers.forEach(function (layer) {
                  if ((layer.get("id") == "bbLayer") && (layer.getSource().getFeatures().length === 1)) {
                    layer.getSource().clear();
                  }
                });
            },
            show: function () {
                this.inherited(arguments);
                // make sure grid is sized properly.
                this.siteDatasetsGrid.resize();
            },
            actionBarClick: function (evt) {
                try {
                    switch (evt.currentTarget.name) {
                        case "previous":
                            if (this.siteIndex > 0) {
                                // decrease the index and refresh display
                                this.siteIndex -= 1;
                                this.displaySite();
                            }
                            break;
                        case "next":
                            if (this.siteIndex < (this.sites.length - 1)) {
                                // increase the index and refresh display
                                this.siteIndex += 1;
                                this.displaySite();
                            }
                            break;
                        default:
                            alert("Unknown button: '" + evt.currentTarget.name + "'");
                            break;
                    }
                } catch (e) {
                    alert("Error in actionBarClick: " + e.message);
                }
            },
            _setSitesAttr: function (value) {
                // set sites
                this._set("sites", value);
                // set siteIndex = 0 for first one
                this._set("siteIndex", 0);
                // display site
                this.displaySite();

                // set off style on bounding box button
                domClass.remove(this.bboxButton.domNode, "bboxOn");
                domClass.add(this.bboxButton.domNode, "bboxOff");

                // start retrieving all datasets
                // get site attributes to read datasets
                var atts = this.sites[this.siteIndex].attributes;
                // load all datasets if site doesn't have them
                if (!atts.alldatasets) { // need to get all datasets and then display
                    script.get(config.dataServicesLocation + "/Datasets", { jsonp: "callback", query: { siteids: atts.siteid } }).then(
                        lang.hitch({ atts: atts, dialog: this }, function (response) {
                            if (response.success) {
                                var datasets = response.data;
                                this.atts.alldatasets = datasets;
                            } else {
                                alert("error getting all site datasets: " + response.message);
                            }
                        }),
                        function (response) {
                            alert("error sending request for all site datasets: " + response);
                        }
                    );
                }
            },
            postCreate: function () {
                this.inherited(arguments);
                // set in app object
                dojo.config.app.forms.sitePopup = this;
            }
        });
});
