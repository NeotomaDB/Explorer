define(["dojo/_base/declare", "dojo/parser", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/stratigraphicDiagram.html", "dijit/_WidgetsInTemplateMixin",  "dijit/registry", "dojo/_base/lang","dojo/topic"],
    function (declare, parser, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, registry, lang, topic) {
        var strataYScale = null;
        var strataXScale = null;
        var plot_size = { h: 280, w: 300 };
        var margin = { top: 15, right: 50, bottom: 28, left: 80 };
        var diagrammer = null; // reference to diagrammer to use without needing lang.hitch

        // define widget
        return declare([ContentPane,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            chartIntervalWidth: 8,
            chartGapLeft: 5,
            chartGapRight: 12,
            width: plot_size.w - margin.left - margin.right,
            height: plot_size.h - margin.top - margin.bottom,
            tooltip: d3.select("body").append("div")   
                .attr("class", "tooltip")               
                .style("opacity", 0),
            depthExtent: null,
            ageExtents: null,
            ageExtent: null,
            horizonParameter: null,
            depthList: null,
            depthMap: null,
            sampleIDs: null,
            chronologies: [],
            _currentChronology: null,
            taxaline: null,
            taxaline5x: null,
            horizonAxis:  null,
            abundAxis: null,
            abundAxisTop: null,
            _getMarginAttr: function() {
                return margin;
            },
            _getStrataYScaleAttr: function() {
                return strataYScale;
            },
            _getCurrentChronology: function(){
              return this._currentChronology;
            },
            _setCurrentChronology: function(value){
              this._currentChronology = value;
              this.setScales();
            },
            handleYAxisChange: function(value){
              if(value[0]){
                this._setCurrentChronology(value[0]);
                this.setScales();
                this.updateCharts();
              }
            },
            clearChart: function () {
                d3.select(".charts").selectAll("*").remove();
                d3.select(".taxa-labels").selectAll("*").remove();

                d3.select(".charts").select("x-axis-label").remove();
                    
            },
            constructChart: function(taxon, chartIndex){    
                var targetTaxon = taxon.name;
                var targetTaxonID = targetTaxon.replace(/[\s]|[.]|[/]/g,"-");

                //replace parentheses
                var targetTaxonID = targetTaxonID.replace(/[()]/g,"_");

                //get scale domains and set values
                //update domains based on extrema, which has pluses and minuses
    
     
                    var abundanceExtent = d3.extent(taxon.values,function(d){
                        return +d.abundance;
                    });

                    var intervals = Math.ceil(abundanceExtent[1]/5);
                    var domainUpperExtent = intervals*5;
                    var taxonChartWidth = this.chartIntervalWidth * intervals;

    
                    strataXScale.domain([0,domainUpperExtent]);
                    strataXScale.range([0,taxonChartWidth]);
                    //strataYScale.domain(depthExtent);

                    //set axis scales
                    //horizonAxis.scale(strataYScale);    
                    //abundAxis.scale(strataXScale);
                    var chartTickValues = [];
                    for (var j=1;j <= intervals; j++){
                        chartTickValues.push(j*5);
                        /*
                         if( j % 2 > 0){
                            chartTickValues.push(null); 
                         } else {
                          chartTickValues.push(j*5);
                         }
                         */      
                    }

                    diagrammer.abundAxis.tickValues(chartTickValues);
                    diagrammer.abundAxisTop.tickValues(chartTickValues);

                    var chartDiv = d3.selectAll(".charts")
                      .insert("div", ".x-axis-label")
                      //.append("div")
                      .attr("class","taxa-group "+targetTaxonID);

                    /*
                        var chartLabel = chartDiv
                          .append("h3")
                          .attr("class","taxon-label")
                          .text(targetTaxon);
                    */

                    var svg = chartDiv      
                      .append("svg")
                      .attr("width", function(){
                          if(chartIndex == 0){
                              return taxonChartWidth + margin.left + diagrammer.chartGapRight; //+ margin.right;
                          } else {
                              return taxonChartWidth + diagrammer.chartGapRight;
                          }
                      })
                      .attr("height", diagrammer.height + margin.top + margin.bottom)
                      .append("g")
                      .attr("transform",function(d){
                          if(chartIndex == 0){
                              return "translate(" + margin.left + "," + margin.top + ")"
                          } else {
                              //return "translate(" + diagrammer.chartGapLeft + "," + margin.top + ")"
                              return "translate(0," + margin.top + ")"
                          }         
                      })
                      .on("mouseout", function(d){
                          hidePoints();
                      })
                      .on("mouseover",function(d){
                          showPoints();
                      });

                    var taxaGroup = svg.selectAll(".g-taxa-group")
                        .data([taxon])
                        .enter()
                        .append("g")
                        .attr("class", "g-taxa-group")
                        .style("width", function(d){
                            return taxonChartWidth;
                        })

                    var clipRect = taxaGroup.append("clipPath")
                      .attr("id", "clip-"+targetTaxonID)
                      .append("rect")
                      .attr("x",0)
                      .attr("y", 0)
                      .attr("width", taxonChartWidth)
                      .attr("height", diagrammer.height)
                    /*
                        var taxaLabel = taxaGroup.append("text")
                          .attr("x", 18)
                          .attr("y", -18)
                          .attr("transform","rotate(-45 0,0)")
                          .attr("class","taxon-label")
                          .text(targetTaxon);
                    */
                    var exagPaths = taxaGroup.append("path")
                        .attr("clip-path","url(#clip-"+targetTaxonID+")")
                        .attr("class", function(d) { 
                            return d.group + " exaggerate-5x";
                        })
                        .attr("d", function (d) {
                            return diagrammer.taxaline5x(d.values); 
                        });    

                    var paths = taxaGroup.append("path")
                        .attr("class", function(d) { 
                            return d.group + " standard-scale";
                        })
                        .attr("d", function(d) { return diagrammer.taxaline(d.values); });
        
                    var lastVertexIdx = taxaGroup.data()[0].values.length-1;            
    
                    taxaGroup.append("g")
                          .attr("class", function(d) {
                              return "g-points "+d.group;
                          })
                          .selectAll("circle")
                          .data(function(d){
                              return d.values;
                          })
                          .enter()
                          .append("circle")
                          .attr("class",function(d,i){            
                              if(i==0 || i == lastVertexIdx){
                                  var ecogroup = this.parentElement.classList.toString() + " hide";
                              } else {
                                  var ecogroup = this.parentElement.classList.toString();
                              }
                              return ecogroup;
                          })
                          .attr("cx", function(d){
                              //console.log("d is "+d+" x_scale is "+x_scale(d));
                              return strataXScale(d.abundance);
                          })
                          .attr("cy", lang.hitch(this,function(d){
                              //return strataYScale(d.depth)
                              return strataYScale(this.lookupHorizonValueBySampleID(d.sampleid));
                          }))
                          .attr("r",0)
                          .on("mouseout", function(d){
            
                              diagrammer.tooltip.transition().duration(500).style("opacity", 0);                       
                          })
                          .on("mouseover",function(d){
            
                              //var labelFormat = '.3n';        
                              //var numFormatter = d3.format(labelFormat);//d3.format(',f');
            
                              //var labelData = JSON.parse(this.attributes["prop-data"].nodeValue);
                              var label = d3.format(".1%")(d.abundance/100);
                              diagrammer.tooltip.transition().duration(200).style("opacity", .9);
                              diagrammer.tooltip.html(label)
                              .style("left", (d3.event.pageX) + 5 + "px")     
                              .style("top", (d3.event.pageY) - 20 + "px"); 
                          });

                    function showPoints(){   
                        taxaGroup.selectAll("circle")
                          .attr("r",4);
                    }

                    function hidePoints(){
                        taxaGroup.selectAll("circle")
                          .attr("r",0);
                    }

                    //bottom axis
                    var offset = diagrammer.height + 8;
                    
                    svg.append("g")
                        .attr("class","x axis bottom")
                        .call(diagrammer.abundAxis)
                        .attr("transform", "translate(0,"+offset+")");
                    

                    //top x axis    
                    svg.append("g")
                        .attr("class","x axis top")
                        .call(diagrammer.abundAxisTop)
                        .attr("transform", "translate(0,-8)");
                    
                    

                    var ticks = svg.selectAll(".tick")      
                      .attr("class",function(d,i){
                          if( i % 2 > 0){
                              return "odd";
                          } else {
                              return "even";
                          }
                      });
    

                    var oddTickLines = svg.selectAll(".top")
                      .selectAll(".odd")
                      .selectAll("line")
                      .attr("y2", -12);

                    var oddTickLines = svg.selectAll(".top")
                      .selectAll(".even")
                      .selectAll("line")
                      .attr("y2", -6);
        
                    if(chartIndex == 0){
                        //add y-axis
                        svg.append("g")
                          .attr("class","y axis")
                          .call(diagrammer.horizonAxis)
                          .attr("transform", "translate(-10,0)");      
                    }

                    //add label


            },
            updateCharts: function () {
                var horizon = this._getCurrentChronology().ChronologyName;//chron.chronName;//document.getElementById("selectHorizon").value;   
                //horizonParameter;

                //TODO get ageType for chronology-- "Radiocarbon years BP" or "Calendar years BP"

                // lookup chronology selection and set extent
                var currentChronology = this.chronologies.filter(function (d) {
                    return d.Name == horizon;
                })

                if(currentChronology.length != 1){
                    console.log("Error--cannot find chronology "+horizon+" for this dataset");
                } else {
                    var extent = currentChronology[0].horizonExtent.extent;
                    strataYScale.domain(extent);

  

                    d3.select(".y.axis")
                      .selectAll("g")
                      .remove();

                    d3.select(".y.axis")
                      .transition().duration(500)        
                      .call(diagrammer.horizonAxis);
  
  

                    diagrammer.taxaline = d3.svg.line()
                        .x(function(d) { 
                            return strataXScale(d.abundance); 
                        })
                        .y(function(d) {
                            var depth;
                            depth = strataYScale(diagrammer.lookupHorizonValueBySampleID(d.sampleid));
                            return depth;
  
                        });

                    diagrammer.taxaline5x = d3.svg.line()
                        .x(function(d) { 
                            return strataXScale(d.abundance*5); 
                        })
                        .y(function(d) {
                            var depth;
                            depth = strataYScale(diagrammer.lookupHorizonValueBySampleID(d.sampleid));
                            return depth;         
        
                        });

                    //redraw lines
                    var exagPaths = d3.selectAll(".exaggerate-5x")               
                          .transition().duration(500) 
                          .attr("d", function(d) { 
                              return diagrammer.taxaline5x(d.values);
                          });    

                    var paths = d3.selectAll(".standard-scale")
                          .transition().duration(500)       
                          .attr("d", function(d) {
                              return diagrammer.taxaline(d.values);
                          });

                    var mouseoverpts = d3.selectAll(".g-points")
                      .selectAll("circle")    
                      .attr("cy", function(d){        
                          var depth;
                          depth = strataYScale(diagrammer.lookupHorizonValueBySampleID(d.sampleid));
                          return depth;       
                      });

                    //check if 5x should be drawn  
                    //toggleExaggeration();

                    //update y axis label
                    //var firstChart = d3.select(".y-axis-label")

                    var firstChart = d3.select(".y-axis-label")
                      .text(function(d){
                          if(horizon == "Depth"){
                              return "cm";
                          } else {
                              return diagrammer._getCurrentChronology().AgeType;//"Radiocarbon years BP";//or  "Calendar years BP"
                          }
                      });

                }//end if currentChronology.length != 1
            },
            lookupHorizonValueBySampleID: function (sampleid){
                //var chronologyName = document.getElementById("selectHorizon").value;
                var chronologyName;

                if( this._getCurrentChronology()){
                  chronologyName = this._getCurrentChronology().ChronologyName;
                }else{
                  chronologyName = "Depth";
                }

                var currentChronology = this.chronologies.filter(function (d) {
                    return d.Name == chronologyName;
                });//"Depth";

                if (currentChronology.length != 1){
                    //error chronology not found
                    console.log("Error -- chronology "+chronologyName+" not found for this dataset");
                } else {
                    var sampleidMap = currentChronology[0].chronology;
                    var obj = sampleidMap.get(sampleid);
                    var  horizonProperty = "Depth";
                    //determine horizon property
                    if(chronologyName != "Depth"){
                        horizonProperty = "Age"
                    }

                    var horizonValue = obj[horizonProperty];
                    return horizonValue;
                }
            },

            ready: function (error, data, config) {
              if (error) return console.warn(error);

                    dataObjects = data.data;

                    //chronologies--GET UNIQUE chronologyid values
                    //remove depth entries from chronList
                    var chronList = dataObjects.filter(function(d){
                        return d.ChronologyID != null;
                    });

                    this.depthList = dataObjects.filter(function(d){
                        return d.ChronologyID == null;
                    });

                    //create Map with sampleid key
                    this.depthMap = d3.map(this.depthList, function(d){
                        return d.SampleID;
                    });

                    var allChronIDs = d3.map(chronList, function(d){    
                        return d["ChronologyID"];
                    });

                    var uniqueChronIDs = allChronIDs.keys();

                    var allTaxaNames = this.depthList.map(function(d){
                        return d["TaxonName"];
                    });

                    var uniqueTaxaNames = d3.set(allTaxaNames).values();

                    var allSampleIDValues = this.depthList.map(function(d){
                        return d["SampleID"];    
                    })
                    this.sampleIDs = d3.set(allSampleIDValues).values();

  

                    //lookups: depth, Age for ChronologyID
                    //1. chronologyid == value
                    //2. chronologyid != null
                    //name: <chron. name>, id: <chron. id>, chronology: [{<sampleid>: <value>}, ...]
                    function createSampleIDDepthLookup(){    
                        var depthList = dataObjects.filter(function(d){
                            return d.ChronologyID == null;
                        });
    
                        var depthMap = d3.map(depthList, function(d){
                            return d.SampleID;
                        });
    
    
                        var chronologyLookup = {};
                        chronologyLookup.Name = "Depth";
                        chronologyLookup.id = null;
                        chronologyLookup.chronology = depthMap;
                        return chronologyLookup;

                    }

                    function createSampleIDChronologyLookup(chronid){    
                        var chronList = dataObjects.filter(function(d){
                            return d.ChronologyID == chronid;
                        });
    
                        var chronMap = d3.map(chronList, function(d){
                            return d.SampleID;
                        });
    
    
                        var chronologyLookup = {};
                        chronologyLookup.Name = chronList[0].ChronologyName;
                        chronologyLookup.id = chronid;
                        chronologyLookup.chronology = chronMap;
                        return chronologyLookup;

                    }

                    //create depth lookup & add to chronologies
                    dojo.config.diagrammer.chronologies.push(createSampleIDDepthLookup());

                    //for each uniq chronologyid, create a lookup object
                    uniqueChronIDs.forEach(function(d){
                        if(d){
                            var newChronology = createSampleIDChronologyLookup(d);
                            dojo.config.diagrammer.chronologies.push(newChronology);
                        }
                    })

/*DEPRACATED
                    //updata demo selector
                    var theChrons = d3.select("#selectHorizon")
                    theChrons.selectAll("option").remove();
                    this.chronologies.forEach(function (d) {
                        theChrons.append("option")
                          .attr("value",d.Name)
                          .text(d.Name)
                    })
*/
                    //set extents on each chronology
                    /*  NOTE: this.chronologies already set by DataExplorer */
                    this.chronologies = dojo.config.diagrammer.chronologies;
                    this.chronologies.forEach(function (d) {
                        var extentObj = {};
                        extentObj.name = d.Name;
                        extentObj.id = d.id;
                        var extent = [];
                        var key;
                        if(d.Name == "Depth"){
                            key = "Depth";
                        } else {
                            key = "Age"
                        }


                        var values = [];
                        d.chronology.forEach(function(e_key, e_value){
                            values.push(e_value[key]);
                        })

                        extent = d3.extent(values,function(f){
                            return f;
                        })
     
                        extentObj.extent = extent;
                        d.horizonExtent = extentObj;


                    })
                    

                    
                    // lookup chronology selection and set extent
                    //FIX, have simple chronology object and chronology object with
                    //extent properties; need better naming convention
                    var horizon;
                    if(dojo.config.diagrammer.config.chronology){
                      horizon = this._getCurrentChronology().ChronologyName;
                      //horizon = dojo.config.diagrammer.config.chronology.chronName;
                    } else {
                      horizon = "Depth";
                    }
                    //this.chronologies are parsed chronologies with defined extents
                    var currentParsedChronology = this.chronologies.filter(function (d) {
                        return d.Name == horizon;
                    })

                    if(currentParsedChronology.length != 1){
                        console.log("Error--cannot find chronology "+horizon+" for this dataset");
                    } else {
                        var extent = currentParsedChronology[0].horizonExtent.extent;
                        strataYScale.domain(extent);
                    }


  
                    //GlOBAL VARS:
                    var depthKeys, taxaData;
  
                    //create array of objects to plot
                    var arrTaxaSamples = [];
                    //build array of objects to plot
                    //first create sampleid key and add totalCount to each sampleid object
                    var arrAbundanceTotalBySiteID = [];
                    this.sampleIDs.forEach(function(d){
                        arrAbundanceTotalBySiteID["S"+d] = 0;
   
                        //use array of dataObjects filtered to represent samples at each depth 
                        diagrammer.depthList.forEach(function(e){
                            if(+e["SampleID"] == +d){
                                arrAbundanceTotalBySiteID["S"+d] += +e["Value"];
                            }
                        });
  
                    })

                    //next create set of values for each taxon
                    //use depthList to remove duplicate chronology value sets 
                    //before stepping through values by taxon
                    uniqueTaxaNames.forEach(function(d){ 

                        var samplesByTaxon = diagrammer.depthList.filter(function(e){
                            return e.TaxonName == d;
                        })

                        var obj = {};
                        obj.values = [];
                        //number of sampleids
                        var sampleLength = diagrammer.sampleIDs.length;//arrAbundanceTotalBySiteID.length;
                        //sample objects by siteid filtered for current taxon
                        samplesByTaxon.forEach(function(f){
                            //abundance summary for each sampleid
                            //arrSampleObjs  
                            if(obj.values.length == 0){      
                                //create origin pt to correctly close polygon
                                var pt = {};
                                pt.sampleid = f.SampleID;
                                pt.abundance = 0;     
                                obj.values.push(pt);
                            }
                            var pt = {};
                            pt.sampleid = f.SampleID;
                            if(arrAbundanceTotalBySiteID["S"+f.SampleID] > 0){
                                pt.abundance = (+f["Value"]/+arrAbundanceTotalBySiteID["S"+f.SampleID])*100;
                            } else {
                                pt.abundance = 0;
                            };//calc % abundance for depth/age
                            obj.values.push(pt);

                            if(obj.values.length == sampleLength+1){
                                //create end pt to correctly close polygon
                                var pt = {};
                                pt.sampleid = f.SampleID;
                                pt.abundance = 0;
                                obj.values.push(pt);
                            }
                        })
  
                        obj.name = samplesByTaxon[0]["TaxonName"];
                        obj.group = samplesByTaxon[0]["EcolGroupID"].toLowerCase();
                        arrTaxaSamples.push(obj);
  
                    });

                    //abundance stats by taxon
                    var extents = [];


                    //get extents for depth and chronologies
                    arrTaxaSamples.forEach(function(d){
                        var stats = {};
  
                        var extentAbd = d3.extent(d.values, function(e){
                            return e.abundance;
                        })
                        d.stats = {};
  
                        d.stats.aMin = extentAbd[0];
                        d.stats.aMax = extentAbd[1];
      
                    })


                    function sortMaxAbundance(a,b){
                        //descending
                        return b.stats.aMax - a.stats.aMax;
                    }

                    function sortEcologicalGroup(a,b){
                        return a.group - b.group;
                    }

                    function sortTaxonName(a,b){
                        if(a.group == b.group){
                            var x = a.name;
                            var y = b.name;

                            return x < y ? -1 : x > y ? 1 : 0;
                        }
                        var x = a.group;
                        var y = b.group;
                        return x < y ? -1 : x > y ? 1 : 0;
                    }

                    //TODO sort by group then genus appending Other... to this set
                    /////arrTaxaSamples.sort(sortMaxAbundance);
                    var all = arrTaxaSamples.filter(function(d){
                        return d.name.substr(0,5) != "Other" ;
                    })

                    /*
                    var uphe = arrTaxaSamples.filter(function(d){
                      return d.EcolGroupID == "TRSH" && d.TaxonName.subst(0,5) != "Other";
                    })
                    var vacr = arrTaxaSamples.filter(function(d){
                      return d.EcolGroupID == "TRSH" && d.TaxonName.subst(0,5) != "Other";
                    })
                    */
                    var other = arrTaxaSamples.filter(function(d){
                        return d.name.substr(0,5) == "Other";
                    })


                    all.sort(sortTaxonName);
                    /*
                    trsh.sort(sortTaxonName);
                    uphe.sort(sortTaxonName);
                    vacr.sort(sortTaxonName);
                    */
                    other.sort(sortTaxonName);

                    var clean = [];
                    clean = all.concat(other);

                    arrTaxaSamples = clean;


                    var numCharts = arrTaxaSamples.length;  
                    //var numCharts = arrSeriesToPlot.length;
                    for(var i=0; i< numCharts;i++){  
                        diagrammer.constructChart(arrTaxaSamples[i],i);
                        // constructChart(arrSeriesToPlot[i],i);
                    }

                    //set chart div width to enable labeling
                    var chartsWidth = 0;
                    var chartDivs = d3.selectAll(".taxa-group")
                      .each(function(d,i){    
                          var w = d3.select(this).style("width");
                          var wval = w.slice(0,w.length-2);
                          //console.log(wval);
                          chartsWidth += +wval;
                      })

                    //dojo layout bug fix
                    chartsWidth += 20;  

                    d3.select(".charts")
                      .style("width", chartsWidth+"px");

                    constructTaxaLabels();

                    //add x-axis label
                    d3.select(".charts")
                      .append("div")
                      .attr("class","x-axis-label")
                      .text("Abundance (%)");

                    //force diagramPane height
                    d3.select("#diagrammer")
                      .style("height", "306px");

                    function constructTaxaLabels(){

                        //g-taxa-group
                        var chartsData = d3.selectAll(".g-taxa-group").data();
                        var xpos = [margin.left];
                        chartsData.forEach(function(d,i){
                            var abundanceExtent = d3.extent(d.values,function(e){
                                return +e.abundance;
                            });

                            var intervals = Math.ceil(abundanceExtent[1]/5);
                            var domainUpperExtent = intervals*5;
                            var taxonChartWidth = diagrammer.get("chartIntervalWidth") * intervals;
      
                            xpos.push(taxonChartWidth + xpos[i]+ diagrammer.get("chartGapRight"));
      
      
                            var targetTaxon = d.name;
                            //replace space, period, slash
                            //var targetTaxonID = targetTaxon.replace(/[\s]|[.]|[/]/g,"-");
                            //var el = d3.select("."+targetTaxonID)[0][0];

                            //var tmpWidth = window.getComputedStyle(el,null).getPropertyValue('width')
      
                        });
    
                        /*REMOVE */
                        //label height space: 115
                        var lbl_ht = 115;
                        //fix dojo layout issue
                        var chart_width_offset = 145;
                        var longLabels = d3.select(".taxa-labels")      
                          .insert("svg",".charts")
                          .attr("class", "taxa-full-labels")
                          .attr("width", chartsWidth+chart_width_offset)
                          .attr("height", lbl_ht)
                          .selectAll(".long-label")
                          .data(chartsData)
                          .enter()
                          .append("text")
                          .attr("x", function(d,i){
                              return xpos[i]+5;
                          })
                          .attr("y", lbl_ht)      
                          .attr("class","long-label")
                          .attr("transform",function(d,i){
                              var xval= +xpos[i];
                              xval += 5;
                              return "rotate(-45 "+xval+","+lbl_ht+")";    
                          })
                          .text(function(d,i){
                              //truncate
                              var label = d.name;
                              if(label.length > 25){
                                label = label.substr(0,24) + "...";
                              }
                              return label;
                          });
            
                        //var horizon = dojo.config.diagrammer.config.chronology.chronName;
                        //console.log("old horizon is: "+horizon);
                        var horizon = diagrammer._getCurrentChronology().ChronologyName;//"Depth";//config.horizon;
                        //console.log("new horizon is: "+horizon);
                        //add y-axis label
                        ///var firstChart = d3.select(".taxa-full-labels")
                        var firstChart = d3.select(".charts").select("svg")        
                          //.insert("text","text")
                          .append("text")
                          .attr("class","y-axis-label")
                          .attr("x", 30)
                          .attr("y", 145)
                          .attr("transform",function(d,i){          
                              //return "rotate(-90 0,150)";    
                              return "rotate(-90 25,150)";
                          })
                          .text(function(d){
                            if(horizon == "Depth"){
                                return "cm";
                            } else {
                                return diagrammer._getCurrentChronology().AgeType;//"Radiocarbon years BP";//or  "Calendar years BP"
                            }
                          });
                          /*
                          .text(function(d){
                              if(diagrammer.get("horizonParameter") == "depth" || !diagrammer.get("horizonParameter")){
                                  return "cm";
                              } else {
                                  return diagrammer._getCurrentChronology().ageType;//"Radiocarbon years BP";//or  "Calendar years BP"
                              }
                          });
                          */

                    }
                },


            setScales: function () {
                var diagrammer = this;
               
                if (diagrammer.chronologies.length > 0 && diagrammer._getCurrentChronology()) {
                    var chronName = diagrammer._getCurrentChronology().ChronologyName;  
                    var currentChronology = this.chronologies.filter(function (d) {
                        return d.Name == chronName;//"Depth";//config.horizon;
                    })

                    if (currentChronology.length != 1) {
                        console.log("Error--cannot find chronology " + chronName + " for this dataset");
                    } else {
                        var extent = currentChronology[0].horizonExtent.extent;
                        strataYScale.domain(extent);
                    }

                    console.log("found chrons");
                }
            },
            setAxes: function() {
                // adundAxis
                this.abundAxis = d3.svg.axis()
                  .orient("bottom")
                  .scale(strataXScale)
                  .tickPadding([6])
                  .innerTickSize([6])
                  .outerTickSize([10])
                  .tickFormat(d3.round);

                // adundAxisTop
                this.abundAxisTop = d3.svg.axis()
                  .orient("top")
                  .scale(strataXScale)
                  .tickPadding([10])
                  .innerTickSize([6])
                  .outerTickSize([12]);

                // horizonAxis
                this.horizonAxis = d3.svg.axis()
                  .orient("left")
                  .scale(strataYScale)
                  .innerTickSize([3])
                  .outerTickSize([6])
                  .tickPadding([8]);
            },
            postCreate: function() {
                this.inherited(arguments);

                // set strata scales
                strataYScale = d3.scale.linear().range([0, this.height]);
                strataXScale = d3.scale.linear().range([0, this.width]);

                /// update scales
                this.setScales();

                // set axes
                this.setAxes();

                // set taxalines
                this.taxaline = d3.svg.line()
                  .x(function (d) {
                      return strataXScale(d.abundance);
                  })
                  .y(function (d) {
                      //return strataYScale(d.depth); 
                      var depth;
                      //depth = strataYScale(diagrammer.lookupHorizonValueBySampleID(d.sampleid));
                      depth = strataYScale(this.lookupHorizonValueBySampleID(d.sampleid));
                      return depth;

                  });

                this.taxaline5x = d3.svg.line()
                  .x(function (d) {
                      return strataXScale(d.abundance * 5); 
                  })
                  .y(function(d) { 
                      //return strataYScale(d.depth);
                      var depth;
                      //depth = strataYScale(diagrammer.lookupHorizonValueBySampleID(d.sampleid));
                      depth = strataYScale(this.lookupHorizonValueBySampleID(d.sampleid));
                      return depth;
        
                  });

                // set diagrammer reference
                diagrammer = this;

                topic.subscribe("diagrammer/ChronologyChange",function(evt){
                    console.log("diagrammer/ChronologyChange evt handled");
                    diagrammer.handleYAxisChange(evt);
                });
            }
        });
    });