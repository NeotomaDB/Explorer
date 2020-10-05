define(["dojo/_base/declare", "dgrid/OnDemandGrid", "dgrid/Selection", "dgrid/selector"],
    function (declare, OnDemandGrid, Selection, selector) {
        return declare([OnDemandGrid, Selection], {
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
                    taxonname: "Taxon"
                }
            }
        );
    }
);