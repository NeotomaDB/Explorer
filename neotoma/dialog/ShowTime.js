define(["dojo/_base/declare", "../widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/showTime.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/store/Memory", "dojo/_base/array", "dojo/dom", "dojo/dom-construct", "dojo/dom-class", "dojo/number", "dijit/popup", "dojo/request/script", "dijit/layout/ContentPane", "dojo/on", "dojo/aspect", "dojo/topic", "../form/ShowTime", "dijit/form/Button"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, array, dom, domConstruct, domClass, numberUtil, popup, script, ContentPane, on, aspect, topic) {
        // define widget
        return declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            playerClick: function (evt) {
                alert("name: " + evt.currentTarget.name);
                switch (evt.currentTarget.name) {
                    case "showtime.reset":
                        
                        break;
                }
            },
            postCreate: function () {
                this.inherited(arguments);

                //// subscribe to form topics
                //topic.subscribe("amagimap/search/spatial/resultPostionChanged",
                //    lang.hitch(this, function () {
                //        var config = arguments[0];
                //        this.siteCountDisplay.set("content", config.position + " of " + config.total);
                //    })
                //);
            }
        });
    });