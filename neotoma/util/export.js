define(["dojo/_base/array", "dojo/has", "dojo/dom", "dojo/dom-attr", "dojo/request/xhr"],
    function (array, has, dom, domAttr, xhr) {
        // module contains methods to save a file and convert from json structures to other formats
        return {
            csv: function(data) {
                // convert to csv
                var csv = [];

                // make sure there is data
                if (data.length === 0) {
                    alert("There is no data to download.");
                    return;
                }

                // add csv header row
                var rec1 = data[0];
                var fields = [];
                for (var prop in rec1) {
                    if (rec1.hasOwnProperty(prop)) {
                        fields.push(prop);
                    }
                }
                csv.push('"' + fields.join('","') + '"');

                // add data rows
                var values = null;
                array.forEach(data, function (jsonRec) {
                    values = [];
                    array.forEach(fields, function (fieldName) {
                        values.push(jsonRec[fieldName]);
                    }
                    );
                    csv.push(values.join(","));
                }
                );
                return csv.join("\n");
            },
            save: function (data, fileName) {
                // get values to modify link, or handle IE
                var downloadLink = null;
                var href = null;

                // get format
                var parts = fileName.split(".");
                if (parts.length < 2) {
                    alert("Can't determine file format for : " + fileName + ". The extension is missing.");
                    return;
                }
                var ext = parts[parts.length - 1];
                //console.log("in save. file name: " + fileName);
                //console.log("ext: " + ext);

                // remove restricted characters
                //fileName = fileName.replace(",", "-");


                // get download link node
                downloadLink = dom.byId("datasetDownloadLink");
                if (!downloadLink) {
                    alert("Can't find download link node.");
                    return;
                }

               

                if (typeof downloadLink.download != "undefined") { // download attribute is supported
                    // create href
                    switch (ext) {
                        case "csv":
                            href = 'data:application/csv;charset=utf-8,' + encodeURIComponent(data);
                            break;
                        case "json":
                            href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));
                            break;
                        default:
                            alert("Unknown file extension in util/export. Can't save file.");
                            return;
                            break;
                    }

                    // set href and click link
                    domAttr.set(downloadLink, {
                        download: fileName,
                        //download: "myName.csv",
                        href: href
                    });
                    //console.log("file name from link: " + domAttr.get(downloadLink, "download"));
                    downloadLink.click();
                }
                else { // download attribute is not supported
                    // encode data
                    var encodedData = null;
                    var contentType = null;
                    switch (ext) {
                        case "csv":
                            encodedData = encodeURIComponent(data);
                            contentType = "application/csv";
                            break;
                        case "json":
                            contentType = "application/json";
                            encodedData =  encodeURIComponent(JSON.stringify(data));
                            break;
                        default:
                            alert("Unknown file extension in util/export: " + ext + ". Can't save file.");
                            return;
                            break;
                    }

                    // post request to create file
                    xhr.post(dojo.config.app.saveProxyPath + "?name=" + fileName,
                        {
                            data: encodedData,
                            headers: {
                                "Content-Type": contentType
                                //"Content-Length": encodedData.length
                            }
                        }
                    ).then(
                        function (response) {
                            try {
                                // set href and click
                                domAttr.set(downloadLink, {
                                    href: response
                                });

                                // add click event if needed
                                if (!downloadLink.click) {
                                    //_alert("Add handler");

                                    // add event to link node
                                    var evObj = document.createEvent('MouseEvents');
                                    evObj.initMouseEvent('click', true, true, window);
                                    downloadLink.dispatchEvent(evObj);
                                }

                                downloadLink.click();
                                //// see if click is supported
                                //if (downloadLink.click) {
                                //    downloadLink.click();
                                //} else { // not supported
                                //    //_alert("click not supported");
                                //    downloadLink.click();
                                //}

                            } catch (e) {
                                //_alert("error saving file: " + e.message);
                            }
                        },
                        function (response) {
                            alert("error saving file in util/export: " + response);
                        }
                    );
                } 
            },
            emailDataset: function(datasetId) {
                var url = "mailto:?subject=Link%20to%20Neotoma%20dataset%20" + datasetId + "&body=http://apps.neotomadb.org/Explorer/?datasetid=" + datasetId;
                window.open(url);
            }
        };
    });