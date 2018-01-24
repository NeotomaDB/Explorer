define(["dojo/_base/declare", "dojox/charting/action2d/Tooltip"],
    function (declare, Tooltip) {
        return declare([Tooltip], {
                process: function (o) {
                    this.inherited(arguments);
                    //console.log("o.type: " + o.type);
                }
            }
        );
    }
);