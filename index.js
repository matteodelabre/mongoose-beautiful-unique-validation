'use strict';

var MongooseError = require('mongoose/lib/error');
var Promise = require('promise');

var regex = /index:\s*.+?\.\$(\S*)\s*dup key:\s*\{.*?:\s*"(.*)"\s*\}/;

/**
 * Beautifies an E11000 or 11001 (unique constraint fail) Mongo error
 * by turning it into a validation error
 *
 * @param {MongoError} err Error to beautify
 * @param {Object} collection Collection for the associated model
 * @param {Object} map Map fields -> unique error messages
 * @param {function} callback Called with the beautified error
 * @return {null}
 */
function beautify(err, collection, map, callback) {
    var matches = regex.exec(err.message), props;

    if (matches && typeof matches[1] === 'string') {
        collection.indexInformation(function (dbErr, indexes) {
            var valError = new MongooseError.ValidationError(err),
                index = indexes && indexes[matches[1]];

            if (!dbErr && index) {
                // populate validation error with the fields
                // contained in the index
                index.forEach(function (item) {
                    props = {
                        type: 'Duplicate value',
                        path: item[0],
                        value: matches[2]
                    };

                    if (typeof map[item[0]] === 'string') {
                        props.message = map[item[0]];
                    }

                    valError.errors[item[0]] =
                        new MongooseError.ValidatorError(props);
                });

                callback(valError);
                return;
            }

            callback(dbErr);
        });
    }
}

module.exports = function (schema) {
    var tree = schema.tree, key, map = {};

    // fetch error messages defined in the
    // 'unique' field, and replace them with 'true'
    for (key in tree) {
        if (tree.hasOwnProperty(key)) {
            if (tree[key] && tree[key].unique) {
                map[key] = tree[key].unique;
                tree[key].unique = true;
            }
        }
    }

    schema.methods.trySave = function (callback) {
        var that = this, collection = this.collection, proxyFn;

        proxyFn = function (resolve, handler) {
            return function (err, doc) {
                // we have a native E11000/11001 error, lets beautify it
                if (err && err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
                    beautify(err, collection, map, function (newErr) {
                        handler(newErr, doc);
                    });
                    return;
                }

                if (resolve != null && err == null) {
                    resolve(doc);
                    return;
                }

                handler(err, doc);
            };
        };

        if (typeof callback === 'function') {
            this.save(proxyFn(null, callback));
        } else {
            return new Promise(function (resolve, reject) {
                that.save(proxyFn(resolve, reject));
            });
        }

    };
};
