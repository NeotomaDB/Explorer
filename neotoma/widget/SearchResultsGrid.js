define(["dojo/_base/declare", "dgrid/Grid", "dgrid/Selection","neotoma/widget/_StoreMixin","dgrid/extensions/DijitRegistry", "dojo/on", "dojo/topic", "dojo/_base/array","neotoma/app/neotoma"],
    function (declare, Grid, Selection, StoreMixin, DijitRegistry, on, topic, array, neotoma) {
        return declare([Grid, Selection, StoreMixin, DijitRegistry], {
            selectionMode: "extended",
            class: "searchResultsGrid",
            getIds: function () {
                var ids = [];
                for (var key in this.selection) {
                    ids.push(parseInt(key));
                }
                return ids;
            },
            columns: [
                { label: 'SiteID', field: 'SiteID' },
                { label: 'DatasetID', field: 'DatasetID' },
                {
                    label: 'Type',
                    field: 'DatasetType',
                    formatter: function (value) {
                        // make sure image exists
                        if (dojo.config.app.iconStore.get(value) == null) {
                            alert("There is no icon for this dataset type");
                            return "";
                        }
                        return '<img src="resources/datasetIcons/' + dojo.config.app.iconStore.get(value).image + '" title="' + value + '"></img>';
                    }
                },
                { label: 'SiteName', field: 'SiteName' },
                { label: 'Latitude', field: 'Latitude' }, // llchange
                { label: 'Longitude', field: 'Longitude' }, // llchange
                { label: 'AgeOldest', field: 'AgeOldest' },
                { label: 'AgeYoungest', field: 'AgeYoungest' }
            ],
            postCreate: function() {
                this.inherited(arguments);

                // handle select event
                on(this, "dgrid-select",
                    function (evt) {
                        array.forEach(evt.rows,
                         function (row) {
                             topic.publish("neotoma/searchTable/RowSelected", row);
                         }
                     );
                    }
                );
            }
        });
    }
);