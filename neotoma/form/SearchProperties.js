define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./template/searchProperties.html","dojo/_base/lang", "dojo/topic", "dijit/TitlePane", "dijit/form/TextBox", "dijit/Toolbar", "neotoma/widget/GroupToggleButton", "dijit/ColorPalette"],
    function (declare, ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin, template, lang, topic) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: template,
                setName: function (name) {
                    this.searchName.set("value", name);
                },
                setShape: function (shape) {
                    // select the correct button
                    var shapeButtons = this.shapeToolbar.getChildren();
                    var numButtons = shapeButtons.length;
                    for (var i = 0; i < numButtons; i++) {
                        var thisButton = shapeButtons[i];
                        if (thisButton.get("label").toString().toLowerCase() === shape.toLowerCase()) {
                            thisButton.set("checked", true);
                            this.set("shape", shape);
                        } else {
                            thisButton.set("checked", false);
                        }
                    }
                },
                setSize: function (size) {
                    // select the correct button
                    var sizeButtons = this.sizeToolbar.getChildren();
                    var numButtons = sizeButtons.length;
                    for (var i = 0; i < numButtons; i++) {
                        var thisButton = sizeButtons[i];
                        if (thisButton.get("label").toString().toLowerCase() === size.toLowerCase()) {
                            thisButton.set("checked", true);
                            this.set("size", size);
                        } else {
                            thisButton.set("checked", false);
                        }
                    }
                },

                setColor: function (color) {
                    // make sure any letters are lower case and starts with #
                    color = color.toLowerCase();
        
                    if (color.substring(0, 1) !== "#") {
                        color = "#" + color;
                    }
                    var palette = this.colorPalette;
                    palette.set("value", null); // make sure previous color is gone
                    palette.set("value", color);
                    
                    // make sure the color was set
                    if (!palette.get("value")) {
                        alert("This search's color is not in this palette. Please select a color.");
                        return;
                    }
                },
                currentSearch: null,
                setSearch: function (search) {
                    this.setName(search.name);
                    this.setSize(search.symbol.size);
                    this.setShape(search.symbol.shape);
                    this.setColor(search.symbol.color);
                    this.set("currentSearch",search);
                },
                getProperties: function () {
                    try {
                        // get shape
                        var buttons = this.shapeToolbar.getChildren();
                        var shape = null;
                        var numButtons = buttons.length;
                        for (var i = 0; i < numButtons; i++) {
                            var btn = buttons[i];
                            if (btn.get("checked")) {
                                shape = btn.get("name");
                                continue;
                            }
                        }
                        // get size
                        var buttons = this.sizeToolbar.getChildren();
                        var size = null;
                        var numButtons = buttons.length;
                        for (var i = 0; i < numButtons; i++) {
                            var btn = buttons[i];
                            if (btn.get("checked")) {
                                size = btn.get("name");
                                continue;
                            }
                        }

                        // format color correctly
                        var color = this.colorPalette.get("value");
                        if (!color) {
                            alert("Please select a color.");
                            return null;
                        }
                        color = color.toLowerCase().replace("#", "");

                        // get current properties from form
                        var props = {
                            id: this.get("currentSearch").id,
                            name: this.searchName.get("value"),
                            symbol: {
                                color: color,
                                shape: shape,
                                size: size
                            }
                        };

                        // mix into original to get properties that aren't editable
                        return lang.mixin(this.currentSearch, props);
                    } catch (e) {
                        alert("Error in form/SearchProperties.getProperties: " + e.message);
                    } 
                },
                _actionToolbarClick: function (evt) {
                    try {
                        var target = evt.currentTarget;
                        switch (target.name) {
                            case "save":
                                topic.publish("neotoma/search/SearchPropertiesChanged", this.getProperties());
                                break;
                            case "close":
                                topic.publish("neotoma/search/SearchPropertiesClosed");
                                break;
                        }
                    } catch (e) {
                        alert("Error in form/SearchProperties._actionToolbarClick: " + e.message);
                    }
                },
                _shape: "",
                _size: "",
                _getShapeAttr: function () {
                    return this._shape;
                },
                _setShapeAttr: function (shape) {
                    this._shape = shape;
                }
            }
        );
    });