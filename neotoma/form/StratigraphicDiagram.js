define([
     "dojo/_base/declare",
     "dijit/layout/ContentPane",
     "dijit/_TemplatedMixin",
     "dojo/text!./template/stratigraphicDiagram.html",
     "dijit/_WidgetsInTemplateMixin",
     "dojo/request/script",
     "dojo/_base/lang",
     "dijit/layout/StackContainer",
     "dijit/layout/TabContainer",
     "dijit/layout/BorderContainer",
     "dojox/widget/Standby",
     "dijit/form/Form",
     "dijit/form/FilteringSelect",
     "dijit/form/CheckBox",
     "dijit/form/Button",
     "dijit/form/RadioButton",
     "dojo/store/Memory",
     "dijit/form/NumberSpinner",
     "dijit/form/TextBox",
     "dijit/registry",
     "dojo/dom",
     "dojo/on",
     "dojo/topic",
     "dojo/query"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, script, lang,
            StackContainer, TabContainer, BorderContainer, Standby, Form, FilteringSelect, CheckBox, Button,
            RadioButton, Memory, NumberSpinner, TextBox, registry, dom, on, topic, query) {        
        /*global vars*/
        var plot_size = {h: 280, w: 300};
        var legend_size = {h: 280, w: 120};
        var chartIntervalWidth = 8;
        var fixedWidth = 50;
        var chartGapLeft = 5;
        var chartGapRight = 12;

        var margin = {top: 15, right: 50, bottom: 28, left: 80};
        var legendmargin = {top: 15, right: 10, bottom: 28, left: 20};

        var longLabelHeight = 150;

        var width = plot_size.w - margin.left - margin.right,
            height = plot_size.h - margin.top - margin.bottom;
        var legendWidth = legend_size.w - legendmargin.left - legendmargin.right,
            legendHeight = legend_size.h - legendmargin.top - legendmargin.bottom;

        var strataYScale, strataXScale, yAxis, 
            sampleData, SampleIDMap, summaryDataBySampleID, currentChronologyName, taxaRenderObjects, 
            sortedtaxaRenderObjects, metadata, handlerChangeDatasetID, handlerChangeDatasetType,handlerChangeVariableUnit, handlerChangeYAxisDomain;
        var initialized = false;
      

        //color scheme
        var colors20 = d3.scaleOrdinal(d3.schemeCategory10);
        //todo: support color selection by datasettype
        var cssStyleDatatsetType = ["pollen", "diatom", "ostracode"];

        //basic symbol
        var symbolRenderer = d3.symbol().size(32).type(d3.symbolCross);

        var colorMap = {
            "TRSH": "#877F13",
            "UPHE": "#C4A64D",
            "VACR": "#BF3E21",
            "BNTH": "#313695",
            "NEKT": "#3f007d",
            "DIAT": "#EC7014"
        };

        var taxaline, taxaarea, taxaline5x, taxaarea5x, yAxisParameter, currentDatasetType;
        // define widget
        return declare([ContentPane,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            _tooltip: null,
            _plot_size: null,
            _width: null,
            _currentTopX: 10,
            buildtooltip: function(){
                //this._tooltip = d3.select("body").append("div")
                this._tooltip = d3.select("#datasetExplorerPopup").append("div")   
                  .attr("class", "tooltip")               
                  .style("opacity", 0);
            },
            clearGlobals: function(){
                strataYScale = null;
                strataXScale = null;
                yAxis = null;

                sampleData = null;
                SampleIDMap = null;
                summaryDataBySampleID = null;
                currentChronologyName = null;
                taxaRenderObjects = null;

                sortedtaxaRenderObjects = null;
                metadata = null;
                handlerChangeDatasetID = null;
                handlerChangeDatasetType = null;
                handlerChangeVariableUnit = null;
                handlerChangeYAxisDomain = null;

                taxaline = null;
                taxaarea = null;
                taxaline5x = null;
                taxaarea5x = null;
                yAxisParameter = null;
                currentDatasetType = null;
                initialized = null;
                uienabled = null;


                return "globals Cleared";
            },
            processDataset: function(dataset){             
              console.log("processDataset");
              this.updateChartTitle(dataset);
              if ( ! this._tooltip){
                 this.buildtooltip();
              }
              var sdcontext = this;

              //1. process data
              sdcontext.processData(dataset, function(){
                  //2. set initi parameters with processed data
                  sdcontext.setParameters(function(){
                    //3. update default UI settings
                    sdcontext.prepareUI(function(){
                      //4. create rendering objects
                      sdcontext.createRenderingObjects(function(){
                        //5. render objects
                        sdcontext.renderObjects(function(){
                          //6. enable UI change handlers
                          sdcontext.bindListeners();
                        })
                      });
                    })
                  })
                });
             
            },
            updateChartTitle: function(dataset){
                try {
                  var h3 = d3.select("#label-site-dataset")
                        .html("Site: "+dataset.site.sitename+" | DatasetID: "+dataset.datasetid);
                } catch(e){
                  console.log("Error in form/stratigraphicDiagram updateChartTitle", e)
                }
                
            },
            setVariableUnit: function(value){
              metadata.variableunit = value;
              this.setMetricByVariableUnit(metadata.variableunit);
              //if current charttype invalid, select default
              if (this.chartTypeForm.get("value").chartTypeRadioButtons === null){
                this.setDefaultChartType();
              }

            },
            setDefaultVariableUnit: function(value){
              console.log("start setDefaultVariableUnit"+new Date().toLocaleTimeString());
              //if no value passed, assign default by datasettype and variable units found in samples
              if(!value){
                //todo: set default variableUnit by preference rules 
                //check if NISP values exist
                var found = metadata.allvarunits.find(function(d){
                  return d == "NISP"})
                //set variable to NISP if available, else first one found
                found ? metadata.variableunit = "NISP" : metadata.variableunit = metadata.allvarunits[0]; 
              } else {
                metadata.variableunit = value;
              }

              
              //now set the chart x-scale for the variableunit
              //if default called, likely an invalid set of charts
              //todo: define charts for each xscale domain (metric)
              this.setMetricByVariableUnit(metadata.variableunits)
              
            },
            //metric associated with each variableunit
            setMetricByVariableUnit: function(variableUnit){
              //set x-axis-label by variableunit
              switch(variableUnit){
                //number of individual specimens
                case "NISP":
                  metadata.xscaleinput = "abundance";
                  break;
                case "valves/g":
                  //todo, should use "concentration"
                  metadata.xscaleinput = "valves/g";
                  break;
                case "present/absent":
                  metadata.xscaleinput = "presence";
                  break;
                //minimum number of individuals
                case "MNI":
                  metadata.xscaleinput = "value";
                  break;
                case "Spaulding scale":
                  metadata.xscaleinput = "spaulding scale";
                  break;  
                default:
                  console.log("Error: VariableUnit not set; default NISP");
                  metadata.xscaleinput = "abundance";
                  break;

                }
            },
            //get and assign default charttype by datasettype and variableunit
            setDefaultChartType: function(){
              console.log("start setDefaultChartType"+new Date().toLocaleTimeString());
              if(metadata.datasettype && metadata.variableunit){
                //set UI control
                switch(metadata.datasettype){
                  case "pollen":
                    this.setChartType("FilledArea");
                    break;
                  case "ostracode":
                    if(metadata.variableunit == "present/absent"){
                      this.setChartType("SymbolPlot");
                    } else {
                      this.setChartType("FilledArea");
                    }
                    break;
                  case "diatom":
                    this.setChartType("FilledArea");
                    break;
                  case "vertebrate fauna":
                    if(metadata.variableunit == "present/absent"){
                      this.setChartType("SymbolPlot");
                    } else {
                      this.setChartType("BarChart");
                    }
                    break;
                  default:
                    //not always appropriate but draws for all VariableUnits
                    this.setChartType("SymbolPlot");
                    break;
                }
              }
            },
            disabled5xCheckbox: function(value){
                this.cbShowExaggeration.set("disabled", value);
            },
            setChartType: function(name){
                //radioFilledArea, radioSymbolPlot, radioBarChart
                switch(name){
                  case "FilledArea":
                    this.radioFilledArea.set("checked",true);
                    this.disabled5xCheckbox(false);
                    metadata.charttypeselection = name;
                    break;
                  case "SymbolPlot":
                    this.radioSymbolPlot.set("checked",true);
                    this.disabled5xCheckbox(true);
                    metadata.charttypeselection = name;
                    break;
                  case "BarChart":
                    this.radioBarChart.set("checked",true);
                    this.disabled5xCheckbox(true);
                    metadata.charttypeselection = name;
                    break;
                  //safest assumption; all data can display as points  
                  default:
                    this.radioSymbolPlot.set("checked",true);
                    this.disabled5xCheckbox(true);
                    metadata.charttypeselection = "SymbolPlot";
                    break;
                }
            },
            updateYAxisFilteringSelect: function(){
                  console.log("start updateYAxisFilteringSelect"+new Date().toLocaleTimeString());
                  //selection store
                  var ageDepthStore = [];

                  metadata.agecollection.forEach(function(d){
                      if(!d.validage){
                          //omit from fs; can't use
                          return;
                      }
                      var storeObj = {};
                      storeObj.chronologyid = d.chronologyid;
                      storeObj.domainname = d.chronologyname;
                      storeObj.unittype = "Age";
                      ageDepthStore.push(storeObj);
                  })

                  //create depth store object if Depth values exist
                  //some fauna have no depth
                  if(metadata.depthcollection.depthextent[0]){
                      var storeObj = {};
                      storeObj.chronologyid = null;
                      storeObj.domainname = "Depth";
                      storeObj.unittype = "Depth";
                      ageDepthStore.push(storeObj);
                  }

                  //update memory with newly created ageCollection
                  
                  this.yAxisStore = new Memory({data: ageDepthStore, idProperty: "domainname"});

                  this.fsSelectYAxis.set("store", this.yAxisStore);

            },
            setYLookupFunction: function(value){
              console.log("call setYLookupFunction");
                if(value == "Depth"){
                    metadata.yaxislookupfunction = metadata.yaxisdepthlookupfunction;
                } else {
                    metadata.yaxislookupfunction = metadata.yaxisagelookupfunction;
                }

               
            },
            //if Age lookup and no Age value, use MeanAge
            lookupYValueBySampleID: function(SampleID){
                //if age map, values are age objects w/ younger, age, older values
                if(metadata.yaxisdomainname == "Depth"){
                  return metadata.yaxislookupfunction.get(SampleID);
                } else {

                  var ageObj = metadata.yaxislookupfunction.get(SampleID);
                  var returnValue;
                  if(ageObj.age){
                    returnValue = ageObj.age;
                  } else {
                    //ageObj.AgeYounger != null ? returnValue = ageObj.AgeYounger : returnValue = 0;
                    returnValue = ageObj.agemean;
                  }

                  return returnValue;
                }
            },
            updateVariableUnitFilteringSelect: function(unitsArray){
                console.log("start updateVariableUnitFilteringSelect"+new Date().toLocaleTimeString());
                //get filteringselect
                var variableUnitCollection = [];
                //create pseudo age for depth to add to variableUnitCollection
                unitsArray.forEach(function(d){
                  var unitObj = {};
                  unitObj.variableunits = d;
                  variableUnitCollection.push(unitObj);
                })
                
                varUnitStore = new Memory({data: variableUnitCollection, idProperty: "variableunits"});

                this.fsVariableUnits.set("store", varUnitStore);
            },
            updateVariableUnitUI: function(){
                console.log("start updateVariableUnitUI"+new Date().toLocaleTimeString());
                if(metadata.variableunit){
                    //prevent handler from reponsding to FS change event
                    //if (handlerChangeVariableUnit){
                    //  handlerChangeVariableUnit.remove();
                    //}
                    this.fsVariableUnits.set("value",metadata.variableunit);
                    //enable fs change handler
                    //handlerChangeVariableUnit = on( this.fsVariableUnits, "change", lang.hitch(this, this.handleVariableUnitChange));
                }
            },
            setParameters: function(callback){
              console.log("start setParameters"+new Date().toLocaleTimeString());
              this.setDefaultVariableUnit();
              

              this.updateYAxisFilteringSelect();

              this.updateVariableUnitFilteringSelect(metadata.allvarunits);
              
              console.log("at setParameters callback "+new Date().toLocaleTimeString());

              
              callback();
              
              
            },
            createRenderingObjects: function(callback){
                console.log("start createRenderingObjects"+new Date().toLocaleTimeString());
                //create renderObjects
                taxaRenderObjects = this.createTaxaObjectsToRenderAsChart(metadata.variableunit);
                //prepareUI callback
                sortedtaxaRenderObjects = this.sortFilterData(taxaRenderObjects);
                //renderData();
                this.renderNewData(sortedtaxaRenderObjects);

                initialized = true;
                console.log("end createRenderingObjects"+new Date().toLocaleTimeString());
                callback();
            },
            renderObjects: function(callback){
              //initial call to draw charts
              this.updateChart();
              callback();
            },
            createTaxaObjectsToRenderAsChart: function(variableUnit){
                //for each VariableUnit
                //create dataByTaxaToRender
                /*
                  1. group by taxonname
                  2. calc abundance value
                */
                var varUnitFilteredSamples = sampleData.filter(function(d){
                  return d.variableunits == variableUnit;
                })

/*  Aggregation not right; creates duplicate entries by genus at sample, not sum of values

                //if grouping by genus apply
                switch(metadata.datasettype){
                  case "pollen":
                     metadata.genusgrouping = ["Pinus","Picea", "Fraxinus"];
                     break;
                  case "diatom":
                     metadata.genusgrouping = ["Aulacoseira", "Eunotia", "Navicula"];
                     break;
                  default:
                      metadata.genusgrouping = [];
                      break;
                }

                metadata.genusgrouping.length > 0 ? metadata.applygrouping = true : metadata.applygrouping = false;

                var genusMatch = function(value){
                  var genus = value.split(" ")[0];
                  
                    if ( metadata.genusgrouping.includes(genus) ){
                       return genus;
                    } else {
                      //return original value
                      return value;
                    }
                }

                //if grouping by genus, assign genus alias to taxaname                
                if ( metadata.applygrouping ){
                   varUnitFilteredSamples.forEach(function(d){
                        d.taxonname = genusMatch(d.taxonname);
                    })
                } 


//******************scratch*****************************
                //update totals by sample and taxonname
                var updatedUnitFilteredSamples = d3.nest()
                  .key(function(d){
                    return d.taxonname
                  })
                  .entries(varUnitFilteredSamples)
//***********************
*/
                var filteredTaxaRenderObjects = d3.nest()
                  .key(function(d){
                    return d.taxonname
                  })
                  .entries(varUnitFilteredSamples);

                switch(variableUnit){
                  //if NISP, need to calculate abundance values
                  case "NISP":
                    filteredTaxaRenderObjects.forEach(function(d){
                      //calc maxAbundance for Taxon
                      d.maxabundance = 0;
                      //pass EcolGroupID to container
                      d.ecolgroupid = d.values[0].ecolgroupid;
                      d.values.forEach(function(e){
                        var abundance = +((e.value / summaryDataBySampleID.get(e.sampleid).get(variableUnit).sumnisp)*100).toFixed(2);
                        e.abundance = abundance;
                        e.nisp = e.value;
                        d.maxabundance < abundance ? d.maxabundance = abundance : d.maxabundance = d.maxabundance;
                        //track a maxValue for all numeric VariableUnits
                        d.maxvalue = d.maxabundance;
                      })
                    })
                    break;
                  case "MNI":
                    filteredTaxaRenderObjects.forEach(function(d){
                      //calc maxAbundance for Taxon
                      d.countmni = 0;
                      //pass EcolGroupID to container
                      d.ecolgroupid = d.values[0].ecolgroupid;
                      d.values.forEach(function(e){
                        var mni = summaryDataBySampleID.get(e.sampleid).get(variableUnit).summni;
                        //track a maxValue for all numeric VariableUnits
                        d.maxmni < mni ? d.maxmni = mni : d.maxmni = d.maxmni;
                        d.maxvalue = mni;

                      })
                      
                    })
                    break;  
                  default:
                    filteredTaxaRenderObjects.forEach(function(d){
                      //pass EcolGroupID to container
                      d.ecolgroupid = d.values[0].ecolgroupid;
                    })
                    break;
                }

                return filteredTaxaRenderObjects;
            },
            sortAbundanceDesc: function(a,b){
                var x = a.maxabundance;
                var y = b.maxabundance;
                return x < y ? 1 : x > y ? -1 : 0;
            },
            filterForTopX: function(theArray,x){
              var result = theArray.filter(function(d,i){
                return i < x;
              })
              return result;
            },
            filterForBottomN: function(theArray, x){
              var result = theArray.filter(function(d,i){
                return i >= x;
              })
              return result;
            },
            sortSampleID: function(a,b){
                var x = +a.sampleid.substr(1,a.sampleid.length);
                var y = +b.sampleid.substr(1,b.sampleid.length);
                return x - y;
            },

            returnSortByAgeYounger: function(context){              
              return function(a,b){
                //get AgeYounger
                var x = context.lookupYValueBySampleID(a.sampleid);
                var y = context.lookupYValueBySampleID(b.sampleid);

                    return x - y;
              }
            },
            sortFilterData: function(srcTaxaRenderObjects){
                //sort taxa value collections by abundance
                abundTaxaRenderObjects = srcTaxaRenderObjects.sort(this.sortAbundanceDesc);

                sdcontext = this;
                var sortByAgeYoungerFunc = this.returnSortByAgeYounger(this);
                //then by Age within taxa value collections if not showing depth
                if(metadata.yaxisunittype == "Age"){
                  abundTaxaRenderObjects.forEach(function(d){
                    var vals = d.values;
                    var sortedValues = vals.sort(sortByAgeYoungerFunc);
                    d.values = sortedValues;
                  })
                }

                var topXtaxaRenderObjects = this.filterForTopX(abundTaxaRenderObjects, metadata.currenttopx);
                //createEcolGroupRenderObjects()
                var bottomNtaxaRenderObjects = this.filterForBottomN(abundTaxaRenderObjects, metadata.currenttopx);
                //group bottomN by EcolGroupID
                //see Line 655
                //var groupedTaxa = groupByEcolGroupID(bottomNtaxaRenderObjects, "NISP");
                var groupedTaxa = this.groupByEcolGroupID(bottomNtaxaRenderObjects, metadata.variableunit);

                var sortedtaxaRenderObjects = topXtaxaRenderObjects.sort(this.sortEcolGroupThenTaxonName);  
                //append grouped data to taxa data
                var aggregatedRenderObjects = sortedtaxaRenderObjects.concat(groupedTaxa);

                //aggregationg to TopX render objects and Summary By EcolGoupID render objects
                return aggregatedRenderObjects;
            },
            sortEcolGroupThenTaxonName: function(a,b){
                if(a.ecolgroupid == b.ecolgroupid){
                    var x = a.key;
                    var y = b.key;

                    return x < y ? -1 : x > y ? 1 : 0;
                }
                var x = a.ecolgroupid;
                var y = b.ecolgroupid;
                return x < y ? -1 : x > y ? 1 : 0;
            },
            groupByEcolGroupID: function(theArray, variableUnit){
                    //for each allEcolGrooupIDs[]
                    var ecoGrpRenderObjects = [];
                    metadata.allecolgroupids.forEach(function(d){
                      var obj = {};
                      obj.ecolgroupid = d;
                      obj.values = [];
                      ecoGrpRenderObjects.push(obj); 
                    });

                    //for each groupID, get all samples, aggregate by SampleID
                    ecoGrpRenderObjects.forEach(function(d){
                      var filteredByEcoGrp = theArray.filter(function(e){
                        return e.ecolgroupid === d.ecolgroupid;
                      })
                      //append all values objects to EcolGroup collection
                      filteredByEcoGrp.forEach(function(f){
                        //concatenate arr of objects
                        var tmpArr = d.values.concat(f.values);
                        //replace with result of concatenation
                        d.values = tmpArr;
                      })
                      
                    });

                    var sdcontext = this;
                    //for leftover taxa not in top group
                    //aggregate values by SampleID by EcolGroupID
                    ecoGrpRenderObjects.forEach(function(d){
                          //for each EcolGroupID, total values by SampleID across all taxa
                          var nest = d3.nest().key(function(e){ 
                                  return e.sampleid })
                              .rollup(function(values){
                                  return { 
                                    //sum of values across taxa within shared EcolGroupID at SampleID
                                    totalValue: d3.sum(values, function(f){
                                      return f.value})
                                  }
                              })
                              .map(d.values);
                      
                          //for each EcolGroupID, generate a display object aggregating properties for each SampleID   
                          d.key = "Other "+d.ecolgroupid;
                          d.values = [];

                          nest.each(function(value, key){
                              //todo, need object model for all datatypes to avoid NISP exceptions, etc...
                              var obj = {}
                              obj.sampleid = key;
                              //compare to value at SampleID in summaryDataBySampleID
                              //if NISP, sampleAggregate is relative abundance, else remains totalValue                              
                              var sampleAggregate = sdcontext.getSampleAggregateMetricByVariableUnit(key,value.totalValue);
                              //for NISP, abundance has been calculated, all others have sum of the data values for the variable unit
                              switch(variableUnit){
                                case "NISP":
                                  obj.abundance = sampleAggregate;
                                  obj.nisp = value.totalValue;
                                  break;
                                case "MNI":
                                  obj.summni = value.totalValue;
                                  break;
                                case "present/absent":
                                  obj.countpresent = value.totalValue;
                                  break;
                                default:
                                  //no custom attibutes
                                  break;
                              }          
                              obj.ecolgroupid = d.ecolgroupid;
                              obj.variableunits = variableUnit;
                              obj.maxvalue = value.totalValue;
                              d.values.push(obj);
                            });

                    });

                    //create EcolGroupID lengend objects
                    this.createLegend(ecoGrpRenderObjects);

                    //now modify lower taxa aggregate renderobjects summary properties
                    switch(variableUnit){
                      //to add other metrics specific to datatype 
                      case "NISP":
                         //now calc summary status for EcolGroup for NISP
                          ecoGrpRenderObjects.forEach(function(d){
                            d.variableunits = variableUnit;
                            var abundanceExtent = d3.extent(d.values,function(f){
                              return f.abundance;
                            });

                            var valueExtent = d3.extent(d.values, function(f){
                              return f.maxvalue;
                            })

                            if(abundanceExtent){
                              d.maxabundance = abundanceExtent[1];
                            } else {
                              console.log("Error calculating maxAbundance");
                              d.maxabundance = 0;
                            }

                            if(valueExtent){
                              d.maxvalue = valueExtent[1];
                            } else {
                              console.log("Error calculating maxValue");
                              d.maxvalue = 0;
                            }
                          });
                          break;
                      default:
                         //now calc summary status for EcolGroup for other VariableUnits
                          ecoGrpRenderObjects.forEach(function(d){
                            d.variableunits = variableUnit;
                            d.values.forEach(function(e){
                              e["max"+variableUnit.toLowerCase()] = +e.maxvalue.toFixed(2);
                            })

                            var valueExtent = d3.extent(d.values, function(f){
                              return f.maxvalue;
                            })

                            if(valueExtent){
                              d.maxvalue = valueExtent[1];
                            } else {
                              console.log("Error calculating maxValue");
                              d.maxvalue = 0;
                            }
                          });
                          break;
                    }
                   

                    //drop objects with no data
                    var nonNullEcoGrpRenderObjects = ecoGrpRenderObjects.filter(function(d){
                      return d.values.length > 0;
                    });


                    sdcontext = this;
                    var sortByAgeYoungerFunc = this.returnSortByAgeYounger(this);
                    //insure samples are sorted ascending
                    //if Vertebrate Fauna, order by AgeYounger-- samples are not in chronological order
                    if(metadata.datasettype == "vertebrate fauna"){
                          //order by age, not sampleid
                        nonNullEcoGrpRenderObjects.forEach(function(d){
                            d.values = d.values.sort(sortByAgeYoungerFunc);
                          });
                    } else {

                        nonNullEcoGrpRenderObjects.forEach(function(d){
                            d.values = d.values.sort(sdcontext.sortSampleID);
                        });
                    }

                    return nonNullEcoGrpRenderObjects;
            },
            //aggregate values at sample by VariableUnit:
            //NISP: relative abundance nisp for taxa/sum of nisp for all taxa
            //for all VariableUnits sample value returned
            getSampleAggregateMetricByVariableUnit: function(sampleid, value){
                var currentVariableUnit = metadata.variableunit;
                var aggValue = null;
                switch(currentVariableUnit){
                  case "NISP":
                    if(summaryDataBySampleID.get(sampleid).get(currentVariableUnit).sumnisp > 0){
                      aggValue = +((value/summaryDataBySampleID.get(sampleid).get(currentVariableUnit).sumnisp) * 100).toFixed(2);
                    }
                    break;
                  case "MNI":
                      aggValue = value;//summaryDataBySampleID.get(sampleid).get(currentVariableUnit).summni;
                      break;
                  case "present/absent":
                    aggValue = value;//summaryDataBySampleID.get(sampleid).get(currentVariableUnit).present;
                      break;
                  default:
                    console.log("Error returning aggregate value for variable unit/sampleid/ecolgroupid");
                    break;
                }
                
                return aggValue;
            },
            prepareUI: function(callback){
                console.log("start prepareUI"+new Date().toLocaleTimeString());
                try{
                    // set strata scales
                    strataYScale = d3.scaleLinear().range([0, height]);
                    strataXScale = d3.scaleLinear().range([0, width]);

                    //set default YAxis values
                    //precedence: 1) has DefaultChronID, 2) has Depth, 3) first metadata.agecollection member 

                    if(metadata.defchronologyid){
                        var defaultAge = metadata.agecollection.filter(function(d){
                          return d.chronologyid == metadata.defchronologyid;
                        });

                        //some datasets have misassigned defchronologid where no samples use that chronologyid
                        //so fallback to first agecollection available
                        if ( defaultAge.length < 1){
                          defaultAge = metadata.agecollection.filter(function(d){
                            return d.chronologyid == metadata.agecollection[0].chronologyid;
                          });
                        }

                        metadata.defchronologyname = defaultAge[0].chronologyname;
                        
                        //update demo control selection
                        var fsYAxisDomainStore = this.fsSelectYAxis.get("store");
                        var storeObj = fsYAxisDomainStore.get(defaultAge[0].chronologyname);
                        if(storeObj){
                          this.setYAxisDomain(storeObj.domainname);
                          this.fsSelectYAxis.set("value", storeObj.domainname);
                        }
                        
                      //may have null depthCollection values
                    } else if (metadata.depthcollection.depthextent[0]) {
                        console.log("setting default Y Axis domain as Depth")
                        //update demo control selection
                        var fsYAxisDomainStore = this.fsSelectYAxis.get("store");
                        var storeObj = fsYAxisDomainStore.get("Depth");
                        if(storeObj){
                          this.setYAxisDomain("Depth");
                          this.fsSelectYAxis.set("value", "Depth");
                        }
                    }

                    //set variableUI Fs to match default for dataset
                    this.updateVariableUnitUI();

                  
                    /// update scales
                    this.setScales();

                    // set axes
                    this.setAxes();

                    var sdcontext = this;
                    taxaline5x = d3.line()
                      .defined(function(d){ return d;})
                      .x(function (d) {
                          return strataXScale(d[metadata.xscaleinput] * 5); 
                      })
                      .y(function(d) { 
                          //return strataYScale(d.depth);
                          var depth;
                          //depth = strataYScale(lookupYValueBySampleID(d.SampleID));
                          depth = strataYScale(sdcontext.lookupYValueBySampleID(d.sampleid));
                          return depth;

                      });

                    taxaline = d3.line()
                      .defined(function(d){ return d;})
                      .x(function(d){
                        return strataXScale(d[metadata.xscaleinput]);
                      })
                      .y(function(d){
                        var depth;
                          depth = strataYScale(sdcontext.lookupYValueBySampleID(d.sampleid));
                          return depth;
                      });
                    
                    taxaarea = d3.area()
                      .defined(taxaline.defined())
                      .x1(taxaline.x())
                      .y(taxaline.y())
                      .x0(strataXScale(0));

                    taxaarea5x = d3.area()
                          .defined(taxaline5x.defined())
                          .x1(taxaline5x.x())
                          .y(taxaline5x.y())
                          .x0(strataXScale(0));


                    this.setDefaultChartType();

                    console.log("at prepareUI callback"+new Date().toLocaleTimeString());
                    callback();
                  } catch(e){
                    console.log("Error in form/StratigraphicDiagram.prepareUI " + e );
                  }
                  
            },
            setScales: function(){
                if( metadata.yaxisunittype == "Depth"){
                  strataYScale.domain(metadata.depthcollection.depthextent);
                } else {

                  var currentAge = metadata.agecollection.filter(function(d){
                    return d.chronologyname == metadata.yaxisdomainname;
                  })

                  if(currentAge.length > 0){
                    var currentAgeExtent = currentAge[0].ageextent;
                    strataYScale.domain(currentAgeExtent);
                  }
                }
            },
            setAxes: function() {
                // adundAxis
                abundAxisBottom = d3.axisBottom(strataXScale)
                  .tickPadding([6])
                  .tickSizeInner([6])
                  .tickSizeOuter([10])
                  .tickFormat(d3.round);

                // adundAxisTop
                abundAxisTop = d3.axisTop(strataXScale)
                  .tickPadding([10])
                  .tickSizeInner([6])
                  .tickSizeOuter([12]);

                // yAxis
                yAxis = d3.axisLeft(strataYScale)
                  .tickSizeInner([3])
                  .tickSizeOuter([6])
                  .tickPadding([8]);
            },
            updateYAxisLabel: function(){
                var label = metadata.yaxislabel;
                //add y-axis label
                var yAxisLabel = d3.select(".y-axis-label");
                if(!yAxisLabel.empty()){
                  //get yAxisDomain selection
                  yAxisLabel.html = label;

                } else {

                  var firstChart = d3.select(".charts .taxa-chart")      
                      .append("text")
                      .attr("class","y-axis-label")
                      .attr("x", 30)
                      .attr("y", 145)
                      .attr("transform",function(d,i){          
                        //return "rotate(-90 0,150)";    
                        return "rotate(-90 25,150)";
                    })
                      .text(label);
                }    
            },
            updateXAxisLabel: function(){
                var width=0; 
                var l;
                l = query(".taxa-group");

                l.forEach(function(i){
                  width += i.offsetWidth;
                });
                //console.log("width is: "+width);
                var c = query(".charts")[0];
                c.setAttribute("style","width:"+width+"px");

            },
            pollenEcolGroupIDFilter: function(dataset){
              //TO DO: take user input for ecolgroupids
              var includeEcolGroupIDs = ["TRSH","UPHE","VACR"];
              var filteredDataset = [];
              var filteredSamples = [];
              

              dataset.samples.forEach(function(d){
                var filteredSampleData = [];
                filteredSampleData = d.sampledata.filter(function(e){
                  return includeEcolGroupIDs.indexOf(e.ecolgroupid) > -1;
                })
                d.sampledata = filteredSampleData;

              });
              //filtered dataset
              return dataset;
            },
            updateExaggeration: function(){
                //true, toggled on
                //invert to hide/show
                var value = !this.cbShowExaggeration.get("checked");
  
                d3.selectAll(".exaggerate-5x")
                   .classed(["hide"],value);
            },
            setCurrentTopX: function(value){
                this._currentTopX = value;
                metadata.currenttopx = value;
            },
            handleVariableUnitChange: function(value){
                //disable invalid chart types
                this.validateChartTypes(value);
                this.setVariableUnit(value);

                //should be redundant
                if (initialized){
                  this.updateChart();
                }
            },
            validateChartTypes: function(value){
                if( value == "present/absent"){
                  this.radioFilledArea.setDisabled(true);
                  this.radioBarChart.setDisabled(true);
                  this.radioSymbolPlot.set('disabled',false);
                  //this.radioSymbolPlot.set("checked",true);
                } else {
                  var rFA = registry.byId("radioFilledArea");
                  this.radioFilledArea.set('disabled',false);
                  //this.radioFilledArea.set("checked",true);
                  this.radioBarChart.setDisabled(false);
                  this.radioSymbolPlot.setDisabled(true);
                }
            },  
            handleChartTypeChange: function(evt){
                //handle new selections only, ignore deselected evts: evt == false
                if (evt){
                    console.log("handleChartTypeChange evt", evt);
                    metadata.charttypeselection = this.chartTypeForm.get("value").chartTypeRadioButtons;

                    if (metadata.charttypeselection == "FilledArea"){
                      this.disabled5xCheckbox(false);
                    } else {
                      this.disabled5xCheckbox(true);
                    }

                    if(initialized){
                      this.updateChart();
                    }
                }

            },
            handleApplyFilterAndGroup: function(){
                //user clicked apply
                this.updateChart();
            },
            bindListeners: function(){
              try{
                  console.log("start bindListeners"+new Date().toLocaleTimeString());

                  if (initialized && !uienabled){
                    on(this.cbShowExaggeration,"change",lang.hitch(this, this.updateExaggeration));
                    
                    on(this.topxSpinner, "change", this.setCurrentTopX);

                    handlerChangeVariableUnit = on(this.fsVariableUnits, "change", lang.hitch(this, this.handleVariableUnitChange));
                    // on(this.tbGenusGroup,"change", this.testHandler);//handleGenusGroupChange);

                    on(this.radioSymbolPlot,"change", lang.hitch(this, this.handleChartTypeChange));
                    on(this.radioBarChart,"change", lang.hitch(this, this.handleChartTypeChange));
                    on(this.radioFilledArea,"change", lang.hitch(this, this.handleChartTypeChange));

                    on(this.btnApplyFilterAndGroup, "click", lang.hitch(this, this.handleApplyFilterAndGroup));

                    handlerChangeYAxisDomain = on(this.fsSelectYAxis, "change", lang.hitch(this, this.setYAxisDomain));

                    uienabled = true;
                  }
                    console.log("end bindListeners"+new Date().toLocaleTimeString());
                } catch(e) {
                  console.log("Error in form/StratigraphicDiagram.bindListeners" + e);
                }
            
            },
            testHandler: function(evt){
                console.log("test handler");
            },
            processData: function(dataset,callback){
                console.log("start processData"+ new Date().toLocaleTimeString());
                /**get useful dataset metadata
                * dataset.DatasetID: id
                * dataset.DefChronologyID: default chronologyid
                * dataset.DOI
                * dataset.Site.SiteName
                * dataset.Site.SiteID
                * dataset.DatasetType
                */

                var complete = this.clearGlobals();
                
                

                metadata = {};
                metadata.datasettype = dataset.datasettype.toLowerCase();
                metadata.charttypeselection = null;
                metadata.yaxisdomainname = null;
                metadata.yaxislabel = null;
                metadata.yaxisunittype = null;
                metadata.yaxisdomainextent = [];
                metadata.yaxisagelookupfunction = null;
                metadata.currenttopx = this._currentTopX;

                //until api updated, check the following
                //api may return int, may return null, may return empty array, may return empty object
                metadata.defchronid = null;
                var defchronid;
                if (dataset.defchronologyid){
                  //case integer returned
                  if ( Number.isInteger(dataset.defchronologyid)){
                    defchronid = dataset.defchronologyid;
                  }
                  //case array of objects returned
                  else if (dataset.defchronologyid.length > 0){
                    if ( dataset.defchronologyid[0].hasOwnProperty("chronologyid")){
                      defchronid = dataset.defchronologyid[0].chronologyid;
                    }
                  }
                }
                
                metadata.defchronologyid =  defchronid;//"defchronologyid":[{"chronologyid":917}]

                //filter for EcolGroupID(s) of interest
                switch(metadata.datasettype){
                  case "pollen":
                    //currently include only UPHE, TRSH, VACR
                    dataset = this.pollenEcolGroupIDFilter(dataset);
                    break;
                  case "ostracode":
                    //no EcolGroupID filter
                    break;
                  case "vertebrate fauna":
                    //no EcolGroupID filter
                    break;
                  case "diatom":
                    //no EcolGroupID filter
                    break;
                   default:
                     //no EcolGroupID filter
                     break;
                }
                

                //get set of unique SampleID values
                var SampleIDs = d3.set(dataset.samples, function(d){
                  return "s"+d.sampleid;
                }).values();

                //create map of SampleID, Depth
                var sampleDepths;
                sampleDepths = d3.map();
                dataset.samples.forEach(function(d){
                  sampleDepths.set("s"+d.sampleid, d.analysisunitdepth);
                });
                var depthExtent;
                depthExtent = d3.extent(sampleDepths.values());
                var depthCollection = {};
                  depthCollection.depthextent = depthExtent;
                  depthCollection.depthlookup = sampleDepths;
                  depthCollection.units = "cm";
                  metadata.depthcollection = depthCollection;

                //create ageCollection of SampleID, Age maps for each chronology
                var ageCollection = [];
                dataset.samples[0].sampleages.forEach(function(d){
                  var ageObj = {};
                  ageObj.agetype = d.agetype;
                  ageObj.chronologyid = d.chronologyid;
                  ageObj.chronologyname = d.chronologyname;
                  ageObj.ageextent = [];
                  ageObj.agelookup = d3.map();
                  ageCollection.push(ageObj);
                });

                
                //extract and concatenate SampleData object arrays into sampleData
                //{}8 properties: TaxonName, VariableUnits, VariableElement, VariableContext, TaxaGroup, Value, EcolGroupID, + SampleID
                sampleData = [];
                var ageData = [];
                dataset.samples.forEach(function(d,i){
                  var theSampleID = "s"+d.sampleid;

                  d.sampledata.forEach(function(e,j){
                    e.sampleid = theSampleID;
                  })
                  d.sampleages.forEach(function(f,k){
                    f.sampleid = theSampleID;
                  })
                  sampleData = sampleData.concat(d.sampledata);
                  ageData = ageData.concat(d.sampleages);
                })

                //extract unique values for VariableUnits, TaxonName, EcolGroupID 
                var allVarUnits = [];
                allVarUnits = d3.set(sampleData,function(d){return d.variableunits}).values();
                metadata.allvarunits = allVarUnits;

                /**Set Defaults: round 1 
                variableUnit, chartType, topX, genusGrouping
                **/
                //set default variableUnit
                //setDefaultVariableUnit();
                

                var allTaxaNames = [];
                allTaxaNames = d3.set(sampleData,function(d){return d.taxonname}).values();
                metadata.alltaxanames = allTaxaNames; 

                metadata.allecolgroupids = d3.set(sampleData,function(d){return d.ecolgroupid}).values();

                //all possible y axis scales {Depth, ChronID#1, ChronID#2, ...}
                ageCollection.forEach(function(d){
                  var theAge = d.chronologyid;
                  var sampleAges = d3.map();
                  var currentAgeData = ageData.filter(function(e){
                    return e.chronologyid = theAge;
                  })
                  currentAgeData.forEach(function(f){
                    //sampleAges.set(d.SampleID, d.Age);
                    //test vertebrate fauna w/ only youngestAge, oldestAge
                    var ageObj = {};
                    ageObj.ageyounger = f.ageyounger;
                    ageObj.age = f.age;
                    ageObj.ageolder = f.ageolder;
                    ageObj.agemean = null;
                    if(f.ageyounger != NaN && f.ageolder != NaN){
                      ageObj.agemean = (f.ageyounger + f.ageolder)/2;
                    }
                  
                    sampleAges.set(f.sampleid, ageObj);
                  });
                  //any of the age values may be null
                  var arrAllAgeValues = [];
                  
                  sampleAges.each(function(g){
                    arrAllAgeValues.push(g.ageyounger);
                    arrAllAgeValues.push(g.age);
                    arrAllAgeValues.push(g.ageolder);
                  })
                  var ageExtent = d3.extent(arrAllAgeValues);
                  
                  d.agelookup = sampleAges;
                  d.ageextent = ageExtent;

                  //test always true
                  d.validage = true;
                  //validate AgeExtent
                  if ((d.ageextent[1] - d.ageextent[0]) >= 0){
                    d.validage = true
                  } 

                  if (d.ageextent[0] == null || d.ageextent[1] == null){
                    d.validage = false;
                  }
                })

                metadata.agecollection = ageCollection;

                //set initial yLookupFunction
                if(metadata.agecollection[0].validage){
                  metadata.yaxisagelookupfunction = metadata.agecollection[0].agelookup;
                  metadata.yaxisdomainname = metadata.agecollection[0].chronologyname;
                  metadata.yaxisunittype = "Age";
                } else {
                  metadata.yaxisagelookupfunction = metadata.depthcollection.depthlookup;
                  metadata.yaxisdomainname = "Depth";
                  metadata.yaxisunittype = "Depth";
                }

                //todo add getter/setter for ageCollection
                //updateYAxisFilteringSelect();
                //updateVariableUnitFilteringSelect(allVarUnits);


                //get summary stats by SampleID for topX selection, abundance calculation
                var dataBySampleID = d3.nest()
                  .key(function(d){
                    return d.sampleid;
                  })
                  .key(function(d){
                    return d.variableunits;
                  })
                  //.rollup(function(values){
                  //  return {
                  //    totalCount: d3.sum(values, function(d){ return d.value})
                  //}
                  //})
                  .map(sampleData);

                summaryDataBySampleID = d3.nest()
                  .key(function(d){
                    return d.sampleid;
                  })
                  .key(function(d){
                    return d.variableunits;
                  })
                  .rollup(function(values){
                    var currentKey = values[0].variableunits;//JSON.stringify(values);
                    switch(currentKey){
                      case "NISP":
                        return {
                          sumnisp: d3.sum(values, function(d){ return d.value}),
                          counttaxa: values.length
                        }
                        break;
                      case "valves/g":
                        return {
                        meanconcentration: d3.mean(values, function(d){ return d.value}),
                        counttaxa: values.length
                        }
                        break;
                      case "MNI":
                        return {
                          summni: d3.sum(values, function(d){ return d.value}),
                          counttaxa: values.length
                        }
                        break;
                      case "present/absent":
                        return {
                          counttaxa: values.length
                        }
                        break;
                      default:
                        return {
                          counttaxa: values.length
                        }
                        break;
                    }
                  })
                  .map(sampleData);

                
                /*
                setTimeout(function(){
                  console.log("execute processData setTimeout"+new Date().toLocaleTimeString());
                 }, 1000);
              */

                console.log("at processData callback"+new Date().toLocaleTimeString());
                callback();
                
            },
            renderNewData: function(renderObjects){
                //remove all charts
                var filteredCharts = d3.select(".charts")
                    .selectAll(".taxa-group")
                    .remove();
                var axislabel = d3.select(".x-axis-label").remove();

                var sdcontext = this;
                //data join and create
                var chartDivs = d3.select(".charts").selectAll(".taxa-group")
                    .data(renderObjects,function(d){
                        //TaxonName as key value
                        return d.key;
                    })
                    .enter()
                    .append("div")
                    .attr("class",function(d){
                        var className = sdcontext.getCleanTaxonName(d.key);
                        return "taxa-group " +className;
                    })
                    .style("width", function(d, i){
                        //generalize: all measures --> maxValue (instead of d.maxAbundance)
                        var taxonChartWidth = sdcontext.calcChartWidth(d.maxvalue, metadata.variableunit);
                        //omit margin for y-axis if not first chart
                        if(i === 0){
                          return taxonChartWidth + margin.left + chartGapRight+"px"; //+ margin.right;
                        } else {
                          return taxonChartWidth + chartGapRight + "px";
                        }
                    }
                );

                var xAxisLabel = d3.select(".charts").append("div")
                    .attr("class","x-axis-label")
                    .html(function(d){
                        //var variableUnits = getCurrentVariableUnits();
                        var variableUnit = metadata.variableunit;
                        var label;
                        switch(variableUnit){
                            case "NISP":
                                label = "Abundance (%)";
                                break;
                            case "valves/g":
                                label = "Concentration (valves/g)";
                                break;
                            case "present/absent":
                                label = "Taxon Present";
                                break;
                            case "MNI":
                                label = "Minimum Number of Individuals";
                                break;  
                            default:
                                label = variableUnit;   
                        }
                        return label;
                })

                var longLabels = chartDivs.append("svg")
                    .attr("class", function(d){
                        var className = sdcontext.getCleanTaxonName(d.key);
                        return className + " full-label";
                    })
                    .attr("width", 200)
                    .attr("height", longLabelHeight)
                    .append("g")
                    .attr("transform",function(d,i){
                      if(i === 0){
                        return "translate(" + margin.left + "," + margin.top + ")"
                      } else {
                        return "translate(0," + margin.top + ")"
                      }         
                    })
                    .append("text")
                    .attr("x", 10)
                    .attr("y",longLabelHeight - margin.top)
                    .attr("transform","rotate(-45 10,135)")
                    .text(function(d,i){
                        return d.key;
                    })
                    .on("mouseout", function(d){
                          //hideToolTip();
                    })
                    .on("mouseover",function(d){
                          //showToolTip();
                    });


                    /**** Taxa Chart ****/
                    var chartComponents = chartDivs.append("svg")   
                        .attr("class", function(d){
                            var className = sdcontext.getCleanTaxonName(d.key);
                            return className + " taxa-chart";
                        })
                        .attr("width", function(d, i){
                              var taxonChartWidth = sdcontext.calcChartWidth(d.maxvalue, metadata.variableunit);
                              //omit margin for y-axis if not first chart
                              if(i === 0){
                                  return taxonChartWidth + margin.left + chartGapRight; //+ margin.right;
                              } else {
                                  return taxonChartWidth + chartGapRight;
                              }
                          })
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform",function(d,i){
                              if(i === 0){
                                  return "translate(" + margin.left + "," + margin.top + ")"
                              } else {
                                  //return "translate(" + chartGapLeft + "," + margin.top + ")"
                                  return "translate(0," + margin.top + ")"
                              }         
                          })
                          .on("mouseout", function(d){
                              hidePoints();
                          })
                          .on("mouseover",function(d){
                              showPoints();
                          });
                        
                        

                    var taxaGroup = chartComponents.append("g")
                            .attr("class", "g-taxa-group")
                            .style("width", function(d){
                                var taxonChartWidth = sdcontext.calcChartWidth(d.maxvalue, metadata.variableunit);
                                return taxonChartWidth;
                            });

                    

                    var clipRect = taxaGroup.append("clipPath")
                          .attr("id",function(d){
                             return "clip-"+sdcontext.getCleanTaxonName(d.key);
                           })
                          .append("rect")
                          .attr("x",0)
                          .attr("y", 0)
                          .attr("width", function(d){
                            return sdcontext.calcChartWidth(d.maxvalue, metadata.variableunit);
                          })
                          .attr("height", height)  

            /** 5x Area Chart **/
            if(metadata.charttypeselection == "FilledArea"){
                    var exagPaths = taxaGroup.append("path")
                            .attr("clip-path",function(d){
                                return "url(#clip-"+sdcontext.getCleanTaxonName(d.key)+")";
                            })
                            .attr("class", function(d) { 
                                return d.ecolgroupid + " exaggerate-5x area";
                            })
                            .attr("d", function (d) {
                                strataXScale.range(sdcontext.calcChartRange(d.maxabundance));
                                strataXScale.domain(sdcontext.calcChartDomain(d.maxabundance));
                                return taxaarea5x(d.values);
                            })
                            .style("fill",function(d,i){
                                //mixed case of some styled with css, some with this function
                                
                                if (cssStyleDatatsetType.indexOf(metadata.datasettype) == -1){
                                    if(d.ecolgroupid && metadata.allecolgroupids){
                                        return colors20(metadata.allecolgroupids.indexOf(d.ecolgroupid));
                                    } else {
                                        return '#dddddd';
                                    }
                                } else {
                                    return null;
                                }
                            })
                            .style("fill-opacity", 0.5); 
            //check cb5x state
            this.updateExaggeration();

            /** Standard Scale Area Chart*/
                   
                    var paths = taxaGroup.append("path")
                            .attr("class", function(d) { 
                                return d.ecolgroupid + " standard-scale area";
                            })
                            .attr("d", function(d) {
                                //strataXScale.range(calcChartRange(d.maxAbundance));
                                //strataXScale.domain(calcChartDomain(d.maxAbundance));
                                //return taxaarea(d.values);
                                strataXScale.range(sdcontext.calcChartRange(d.maxvalue));
                                strataXScale.domain(sdcontext.calcChartDomain(d.maxvalue));
                                return taxaarea(d.values); 
                            })
                            .style("fill",function(d,i){
                                //mixed case of some styled with css, some with this function
                                
                                if (cssStyleDatatsetType.indexOf(metadata.datasettype) == -1){
                                    //attempt to assign by ecolgroupid
                                    if(d.ecolgroupid && metadata.allecolgroupids){
                                        return colors20(metadata.allecolgroupids.indexOf(d.ecolgroupid));
                                    } else {
                                      //fallback to grey
                                        return '#dddddd';
                                    }
                                } else {
                                    return null;
                                }
                            })
            }
            /** Standard Scale Bar Chart */
            if(metadata.charttypeselection == "BarChart"){
                    var bars = taxaGroup.append("g")
                      .attr("class", function(d) {
                          return "g-barcharts "+d.ecolgroupid;
                      })
                      .selectAll("rect")
                      .data(function(d){
                              strataXScale.range(sdcontext.calcChartRange(d.maxvalue));
                              strataXScale.domain(sdcontext.calcChartDomain(d.maxvalue));
                              return d.values;
                            }, function(d){
                                return d.taxonname;
                      })
                      .enter()
                      .append("rect")
                      .attr("class",function(d,i){  
                        return d.ecolgroupid +" standard-scale rect";
                      })
                      .attr("width", function(d){
                          //console.log("value: "+d.value+" | metadata.xscaleinput: "+ metadata.xscaleinput + " | "+d[metadata.xscaleinput]);
                          return strataXScale(d[metadata.xscaleinput]);
                      })
                      //.attr("cy", lang.hitch(this,function(d){
                      .attr("y", function(d){
                          return strataYScale(sdcontext.lookupYValueBySampleID(d.sampleid)) - 2/2; 
                      })
                      .attr("x",0)
                      .attr("height",2)
                      .style("fill",function(d,i){
                        //mixed case of some styled with css, some with this function
                        
                        if (cssStyleDatatsetType.indexOf(metadata.datasettype) == -1){
                            if(d.ecolgroupid && metadata.allecolgroupids){
                                return colors20(metadata.allecolgroupids.indexOf(d.ecolgroupid));
                            } else {
                                return '#dddddd';
                            }
                        } else {
                            return null;
                        }
                      })
            }
            /** Symbol Plot **/
            if(metadata.charttypeselection == "SymbolPlot"){ 
                    var symbols = taxaGroup.append("g")
                      .attr("class", function(d) {
                          return "g-symbols "+d.ecolgroupid;
                      })
                      .selectAll("cross")
                      .data(function(d){
                              //define fixed width as global var
                              strataXScale.range([0, fixedWidth]);
                              strataXScale.domain([0,1]);
                              return d.values;
                            }, function(d){
                                return d.taxonname;
                      })
                      .enter()
                      .append("path")
                      .attr("class",function(d,i){  
                        return d.ecolgroupid +" standard-scale";
                      })
                      .attr("transform", function(d){
                            return "translate("+strataXScale(0.5)+","+strataYScale(sdcontext.lookupYValueBySampleID(d.sampleid))+")";
                      })
                      .attr("d", symbolRenderer)
                      .style("fill",function(d,i){
                            //mixed case of some styled with css, some with this function
                        if (cssStyleDatatsetType.indexOf(metadata.datasettype) == -1){
                        
                            if(d.ecolgroupid && metadata.allecolgroupids){
                                return colors20(metadata.allecolgroupids.indexOf(d.ecolgroupid));
                            } else {
                                return '#dddddd';
                            }
                        } else {
                            var c = colorMap[d.ecolgroupid];
                            if(c){
                              return c;
                            } else {
                              return colors20(i)
                            }
                        }
                      })
                      .attr("id", function(d,i){
                            return "id_"+d.sampleid;
                      })
                      .on("mouseout", function(d){
                              sdcontext._tooltip.transition().duration(500).style("opacity", 0);                       
                      })
                      .on("mouseover",function(d){
                             var label = constructMouseOverLabel(d);
                              sdcontext._tooltip.transition().duration(200).style("opacity", .9);
                              sdcontext._tooltip.html(label)
                              .style("left", (d3.mouse(registry.byId("datasetExplorerPopup").containerNode)[0]) + 6 + "px")     
                              .style("top", (d3.mouse(sdcontext.diagramPane.containerNode)[1]) + 70 + "px");
                      });       
            }

            /**Numeric Data - Mouseover Point Display **/
            if(metadata.charttypeselection != "SymbolPlot"){
                    taxaGroup.append("g")
                      .attr("class", function(d) {
                          return "g-points "+d.ecolgroupid;
                      })
                      .selectAll("circle")
                      .data(function(d){
                          strataXScale.range(sdcontext.calcChartRange(d.maxvalue));
                          strataXScale.domain(sdcontext.calcChartDomain(d.maxvalue)); 
                          return d.values;
                      }, function(d){
                        return d.taxonname;
                      })
                      .enter()
                      .append("circle")
                      .attr("class",function(d,i){  
                        return d.ecolgroupid;
                      })
                      .style("fill",function(d,i){
                        //mixed case of some styled with css, some with this function
                        
                        if (cssStyleDatatsetType.indexOf(metadata.datasettype) == -1){
                             if(d.ecolgroupid && metadata.allecolgroupids){
                                    return colors20(metadata.allecolgroupids.indexOf(d.ecolgroupid));
                             } else {
                                    return '#dddddd';
                             }
                        } else {
                            return null;
                        }
                      })    
                      .attr("cx", function(d){
                          return strataXScale(d[metadata.xscaleinput]);
                      })
                      //.attr("cy", lang.hitch(this,function(d){
                      .attr("cy", function(d){
                          return strataYScale(sdcontext.lookupYValueBySampleID(d.sampleid));
                      })
                      .attr("r",0)
                      .on("mouseout", function(d){
                          sdcontext._tooltip.transition().duration(500).style("opacity", 0);                       
                      })
                      .on("mouseover",function(d){
                         var label = constructMouseOverLabel(d);
                          sdcontext._tooltip.transition().duration(200).style("opacity", .9);
                          sdcontext._tooltip.html(label)
                          .style("left", (d3.mouse(registry.byId("datasetExplorerPopup").containerNode)[0]) + 6 + "px")     
                          .style("top", (d3.mouse(sdcontext.diagramPane.containerNode)[1]) + 70 + "px");
                    });        
            }
                function showPoints(){   
                    taxaGroup.selectAll("circle")
                    .attr("r",4);
                }

                function hidePoints(){
                    taxaGroup.selectAll("circle")
                    .attr("r",0);
                }

                function constructMouseOverLabel(ptdata){
                    
                    //cases differ for variableUnit
                    //cases differ for species and 'Other' aggregates
                    var labelType = ptdata.variableunits//metadata.variableunit;

                    if(labelType){
                        switch(labelType){
                            case "NISP":
                                var pctLabel = d3.format(".1%")(ptdata.abundance/100);
                                var cntLabel;
                                if(ptdata.nisp){
                                    cntLabel = d3.format("c")(ptdata.nisp); //integer
                                } else {
                                    cntLabel = d3.format("c")(ptdata.value); //integer
                                }
                                var html = "";
                                if(ptdata.ecolgroupid){
                                    var taxonName = ptdata.taxonname ? " | " +  ptdata.taxonname : " | (multiple)";
                                    html = "<h3>"+ptdata.ecolgroupid+ taxonName + "</h3>";
                                }
                                html += "<div class='point-label'><span>SampleID:"+ptdata.sampleid +"<span><br>";
                                html += "<span>"+metadata.yaxisunittype +": "+ sdcontext.lookupYValueBySampleID(ptdata.sampleid) + " " +metadata.yaxislabel + "</span><br>";
                                html += "<span>Abundance: "+pctLabel + " (of "+summaryDataBySampleID.get(ptdata.sampleid).get(ptdata.variableunits).sumnisp +")</span><br>";
                                html += "<span>Total Count: " + cntLabel + "</span></div>";
                                break;
                            case "MNI":
                                cntLabel = d3.format("c")(ptdata.value); //integer
                                var html ="";
                                if(ptdata.ecolgroupid){
                                    var taxonName = ptdata.taxonname ? " | " + ptdata.taxonname : " | (multiple)";
                                    html = "<h3>"+ptdata.ecolgroupid+ taxonName + "</h3>";
                                }
                                html += "<div class='point-label'><span>SampleID:"+ptdata.sampleid +"<span><br>";
                                html += "<span>"+metadata.yaxisunittype +": "+ sdcontext.lookupYValueBySampleID(ptdata.sampleid) + " " +metadata.yaxislabel + "</span><br>";
                                html += "<span>MNI: "+cntLabel + " (of "+summaryDataBySampleID.get(ptdata.sampleid).get(ptdata.variableunits).summni +")</span></div>";
                                break;      
                             default:
                                cntLabel = d3.format("c")(ptdata.value); //integer
                                var html ="";
                                if(ptdata.ecolgroupid){
                                    var taxonName = ptdata.taxonname ? " | " + ptdata.taxonname : " | (multiple)";
                                    html = "<h3>"+ptdata.ecolgroupid+ taxonName + "</h3>";
                                }
                                html += "<div class='point-label'><span>SampleID:"+ptdata.sampleid +"<span><br>";
                                html += "<span>"+metadata.yaxisunittype +": "+ sdcontext.lookupYValueBySampleID(ptdata.sampleid) + " " +metadata.yaxislabel + "</span><br>";
                                html += "<span>"+ptdata.variableunits+": "+cntLabel + " </span><br></div>";
                                break;      
                        }
                    }
                    
                    
                    
                    return html;
                    
                }

                //bottom axis
                var offset = height + 8;
                
                chartComponents.append("g")
                    .attr("class","x axis bottom")
                    .each(function(d,i){
                        //strataXScale.range(calcChartRange(d.maxAbundance));
                        strataXScale.range(sdcontext.calcChartRange(d.maxvalue));
                        //strataXScale.domain(calcChartDomain(d.maxAbundance));
                        strataXScale.domain(sdcontext.calcChartDomain(d.maxvalue));
                        //var intervals = Math.ceil(d.maxAbundance/5);
                        var intervals = Math.ceil(d.maxvalue/5);
                        abundAxisBottom.tickValues(sdcontext.calcTickMarks(intervals));
                        d3.select(this).call(abundAxisBottom);
                    })
                    .attr("transform", "translate(0,"+offset+")");
                

                //top x axis    
                chartComponents.append("g")
                    .attr("class","x axis top")
                    .each(function(d,i){
                        //strataXScale.range(calcChartRange(d.maxAbundance));
                        strataXScale.range(sdcontext.calcChartRange(d.maxvalue));
                        //strataXScale.domain(calcChartDomain(d.maxAbundance));
                        strataXScale.domain(sdcontext.calcChartDomain(d.maxvalue));
                        //var intervals = Math.ceil(d.maxAbundance/5);
                        var intervals = Math.ceil(d.maxvalue/5);
                        abundAxisBottom.tickValues(sdcontext.calcTickMarks(intervals));
                        d3.select(this).call(abundAxisBottom);
                    })
                    .attr("transform", "translate(0,-8)");

                //y axis
                var yAxisElement = d3.select(".g-taxa-group")
                    .append("g")
                    .attr("class","y axis")
                    .call(yAxis)
                    .attr("transform", "translate(-10,0)");

                //format axis ticks
                var ticks = d3.selectAll(".taxa-chart")
                    .selectAll(".tick")      
                      .attr("class",function(d,i){
                          if( i % 2 > 0){
                              return "odd";
                          } else {
                              return "even";
                          }
                });


                var oddTickLines = d3.selectAll(".taxa-chart")
                    .selectAll(".top")
                  .selectAll(".odd")
                  .selectAll("line")
                  .attr("y2", -12);

                var oddTickLines = d3.selectAll(".taxa-chart")
                    .selectAll(".top")
                  .selectAll(".even")
                  .selectAll("line")
                  .attr("y2", -6);
          
                
                this.updateYAxisLabel();

                this.updateXAxisLabel();

            },
            //end renderNewData()
            
            //expects yAxis domain object
            setYAxisDomain: function(value){
                //had yaxis domain changed
                //if( metadata.yAxisDomainName != value ){
                    //y axis is depth
                    if (value == "Depth"){
                        metadata.yaxislabel = "cm";
                        metadata.yaxisunittype = "Depth";
                        metadata.yaxisdomainname = "Depth";
                        metadata.yaxisdomainextent = metadata.depthcollection.depthextent;//depthExtent;
                        metadata.yaxisdepthlookupfunction = metadata.depthcollection.depthlookup;//sampleDepths;
                        //metadata.yAxisAgeLookupFunction = null;
                    } else 
                    //y axis is age
                    {
                        var selectedAge = metadata.agecollection.filter(function(d){
                            return d.chronologyname == value;
                        })
                        var ageObj = selectedAge[0];
                        metadata.yaxislabel = ageObj.agetype;
                        metadata.yaxisunittype = "Age";
                        metadata.yaxisdomainname = ageObj.chronologyname;
                        metadata.yaxisdomainextent = ageObj.ageextent;
                        //metadata.yAxisDepthLookupFunction = null;
                        metadata.yaxisagelookupfunction = ageObj.agelookup;
                    }

                    //set yAxis lookup function
                    this.setYLookupFunction(value);
                    
                    //check if charts exist
                    var numberOfCharts = d3.selectAll(".taxa-group").size();
                    if(numberOfCharts && initialized){
                        this.updateCharts();
                    }
                //}
            },
            getCleanTaxonName: function(name){
              var cleanName;
              //replace space, period, forward slash
                  var cleanName = name.replace(/[\s]|[.]|[/]/g,"-");
                  //replace parentheses
                  var cleanName = cleanName.replace(/[()]/g,"_");
              return cleanName;
            },
            calcChartRange: function(maxValue){
              //allows scaling all chart widths to pixels allotted for every
              //5 units of measure 
              
              var range = [0]; 
              if(maxValue){
                var intervals = Math.ceil(maxValue/5);
                var taxonChartWidth = chartIntervalWidth * intervals;
                range.push(taxonChartWidth);
              } else {
                //define fixedWith as global var; see calcChartWidth
                range.push(fixedWidth)
              }
              return range;
            },
            calcChartWidth: function(maxValue, variableUnit){
              //handle multiple VariableUnit types
              //Cases:
              //NISP - scale 5 unit intervals
              //MNI - scale 5 unit intervals
              //present/absent - fixed width
              //valves/g - scale 5 unit intervals
              

              switch(variableUnit){
                case "present/absent":
                  var taxonChartWidth = fixedWidth;
                  break;
                //covers NISP, MNI, valves/g
                default:
                  //allows scaling all chart widths to pixels allotted for every
                  //5 units of measure  
                  var intervals = Math.ceil(maxValue/5);
                  var taxonChartWidth = chartIntervalWidth * intervals;
                  
                  break;
              }

              return taxonChartWidth;
              
            },
            calcChartDomain: function(maxValue){
              //calc range rounding up to 5 unit increments
              var domain = [0];
              if(maxValue){
                var intervals = Math.ceil(maxValue/5);
                var maxValue = 5 * intervals;
                domain.push(maxValue);
              } else {
                //present/absent
                domain.push(1);
              }
              return domain;
            },
            calcTickMarks: function(intervals){
              var chartTickValues = [];
                  for (var j=2;j <= intervals; j+=2){
                      chartTickValues.push(j*5);
                  }
                  return chartTickValues;
            },
            //transform data with new filter and aggregation, then redraw Charts
            updateChart: function(){
              //case#1: VariableUnit changes
              taxaRenderObjects = this.createTaxaObjectsToRenderAsChart(metadata.variableunit);
              
              //prepareUI callback
              sortedtaxaRenderObjects = this.sortFilterData(taxaRenderObjects);
              //renderData();
              this.renderNewData(sortedtaxaRenderObjects);
            },
            //redraw Charts with same data, new visual representation
            updateCharts: function(){
        
                var extent;

                extent = metadata.yaxisdomainextent;
                            
                strataYScale.domain(extent);



                d3.select(".y.axis")
                  .selectAll("g")
                  .remove();

                d3.select(".y.axis")
                  .transition().duration(500)        
                  .call(yAxis);


               var sdcontext = this;   
               if(metadata.charttypeselection == "FilledArea"){
                //redraw lines

               //always redraw; will hide based on cb5x state
               var exagPaths = d3.selectAll("path.exaggerate-5x")               
                        .transition().duration(500) 
                        .attr("d", function(d) { 
                            return taxaarea5x(d.values);
                        });
               //check cb5x state
               this.updateExaggeration();
               

                var paths = d3.selectAll("path.standard-scale")
                      .transition().duration(500)       
                      .attr("d", function(d) {
                          return taxaarea(d.values);
                      });

                var mouseoverpts = d3.selectAll(".g-points")
                  .selectAll("circle")    
                  .attr("cy", function(d){        
                      var yPosition;
                      yPosition = strataYScale(sdcontext.lookupYValueBySampleID(d.sampleid));
                      return yPosition;       
                  });
                }

                if(metadata.charttypeselection == "BarChart"){
                     var rects = d3.selectAll(".g-barcharts .rect")
                      .attr("width", function(d){
                          //console.log("value: "+d.value+" | metadata.xscaleinput: "+ metadata.xscaleinput + " | "+d[metadata.xscaleinput]);
                          return strataXScale(d[metadata.xscaleinput]);
                      })
                      //.attr("cy", lang.hitch(this,function(d){
                      .attr("y", function(d){
                          return strataYScale(sdcontext.lookupYValueBySampleID(d.sampleid)) - 2/2; 
                      })
                      .attr("x",0)
                      .attr("height",2)
                }

                if(metadata.charttypeselection == "Symbol Plot"){
                    console.log("plot symbols");
                }
                //check if 5x should be drawn  
                //toggleExaggeration();

                //update y axis label
                //var firstChart = d3.select(".y-axis-label")

                var firstChart = d3.select(".y-axis-label")
                  .text(metadata.yaxislabel);
            },
            createLegend: function(data){
                //var width = 200 - margin.left - margin.right,
                //height = 400 - margin.top - margin.bottom;


                d3.select(".legend-container").select("svg").remove();   

                var svg = d3.select(".legend-container")
                 .append("svg")
                   .attr("width", legendWidth + legendmargin.left + legendmargin.right)
                   .attr("height", legendHeight + legendmargin.top + legendmargin.bottom)
                 .append("g")
                   .attr("transform", "translate(" + legendmargin.left + "," + legendmargin.top + ")");

                //size is area
                var symWidth = 20;
                var symHt = 20;
                var box = d3.symbol().size(symWidth*symHt).type(d3.symbolSquare);

                var lgd = svg.selectAll(".entry")
                    .data(data)
                    .enter()
                    .append("g")
                    .attr("class",function(d){
                      return "entry "+d.ecolgroupid;
                    })
                       .attr("transform",function(d,i){
                         return "translate(0," + (i*(symHt+10)) + ")";
                       });
                       


                       
                var leftSym = lgd.append("path")
                    .attr("clip-path",function(d,i){
                           return "url(#clipObjLeft)";
                      })
                    .attr("d",function(d){
                      var test = box();
                      return test;
                    })
                    .attr("transform","translate(-10,0)")
                    .style("fill",function(d,i){
                      //return colors20(i);
                      var c = colorMap[d.ecolgroupid];
                      if(c){
                        return c;
                      } else {
                        return colors20(i)
                      }
                    })
                    .style("stroke",function(d,i){
                      return "#fff"
                    });

                var rightSym = lgd.append("path")
                    .attr("clip-path",function(d,i){
                         return "url(#clipObjRight)";
                      })
                    .attr("d",function(d){
                      var test = box();
                      return test;
                    })
                    .attr("transform","translate(10,0)")
                    .style("fill",function(d,i){
                      var c = colorMap[d.ecolgroupid];
                      if(c){
                        return c;
                      } else {
                        return colors20(i)
                      }
                    })
                    .style("fill-opacity",0.5)
                    .style("stroke",function(d,i){
                      return "#fff"
                    });

                var clipObjRight = svg.append("clipPath")
                      //.attr("clipPathUnits", "objectBoundingBox")
                      .attr("id", "clipObjRight")
                      .append("circle")
                      .attr("cx", -10)
                      .attr("cy", 0)
                      .attr("r", 10);

                var clipObjLeft = svg.append("clipPath")
                      //.attr("clipPathUnits", "objectBoundingBox")
                      .attr("id", "clipObjLeft")
                      .append("circle")
                      .attr("cx", 10)
                      .attr("cy", 0)
                      .attr("r", 10);

                var labels = lgd.append("text")
                  .text(function(d){
                    return d.ecolgroupid;//"label"
                  })
                  .attr("transform","translate(15,5)");
              },
            postCreate: function() {
                this.inherited(arguments);

                // listen to show and hide busy Standby
                topic.subscribe("diagrammer/ShowStandby",
                    lang.hitch(this, function () {
                        this.stratigraphicStandby.show();
                    })
                );
                topic.subscribe("diagrammer/HideStandby",
                    lang.hitch(this, function () {
                        this.stratigraphicStandby.hide();
                    })
                );
                
            }
        });
    });