define(["dojo/_base/declare", "dgrid/Grid", "dgrid/Selection", "neotoma/widget/_StoreMixin", "dgrid/selector"],
    function (declare, OnDemandGrid, Selection, _StoreMixin, selector) {
        return declare([OnDemandGrid, Selection, _StoreMixin], {
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