define(["dojo/_base/declare", "dojo/store/JsonRest","dojo/_base/lang", "dojo/request/script"],
    function (declare, JsonRest, lang, script) {
        return declare([JsonRest], {
            get: function (id, options) {
                // override get method to use script request instead of xhr
                options = options || {};
                var headers = lang.mixin({ Accept: this.accepts }, this.headers, options.headers || options);

                return script.get(this.target + id,
                    {
                        jsonp: "callback",
                        headers: headers
                    }
		        );
            }
        }
        );
    }
);