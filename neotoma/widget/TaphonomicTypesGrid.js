define(["dojo/_base/declare", "dgrid/Grid", "dgrid/Selection", "neotoma/widget/_StoreMixin", "dgrid/selector"],
    function (declare, Grid, Selection, StoreMixin,selector) {
        return declare([Grid, Selection, StoreMixin], {
                selectionMode: "extended",
                allowSelectAll: true,
                getIds: function () {
                    var ids = [];
                    for (var key in this.selection) {
                        ids.push(parseInt(key));
                    }
                    return ids;
                },
                "class":"advancedTaxa",
                columns: {
                    selCol: selector({ label: "Select"}),
                    TaphonomicType: "Taphonomic Type"
                },
                clear: function () {
                    this.clearSelection();
                }
            }
        );
    }
);