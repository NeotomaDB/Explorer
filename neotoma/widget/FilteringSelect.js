define(["dojo/_base/declare", "dijit/form/FilteringSelect"],
    function (declare, FilteringSelect) {
        // define widget
        return declare([FilteringSelect], {
            //onFocus: function () {
            //    try {
            //        this.inherited(arguments);
            //        this.set("value", "");
            //        this.set("displayedValue", "");
            //    } catch (e) {
            //        alert("Error in widget/FilteringSelect.onFocus: " + e.message);
            //    }
            //}
            maxHeight: 250
            /*
            focus: function () {
                try {
                    this.inherited(arguments);
                    this.set("value", "");
                    this.set("displayedValue", "");
                    console.log("in focus");
                } catch (e) {
                    alert("Error in widget/FilteringSelect.onFocus: " + e.message);
                }
            }
            */
        });
    });