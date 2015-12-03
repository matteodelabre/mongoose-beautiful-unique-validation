'use strict';

var MongooseError = require('mongoose/lib/error');
var Promise = require('promise');

var errorRegex = /index:\s*.+?\.\$(\S*)\s*dup key:\s*\{(.*?)\}/;

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
    var matches = errorRegex.exec(err.message),
        indexName = matches[1], rawValues = matches[2].trim() + ',',
        valueRegex = /\s*:\s*(\S*),/g;

    if (matches) {
        // look for the index contained in the MongoDB error
        collection.indexInformation(function (dbErr, indexes) {
            var prop, createdError, index;

            if (dbErr) {
                callback(dbErr);
                return;
            }

            index = indexes[indexName];

            if (!index) {
                callback(new Error(
                    'mongoose-beautiful-unique-validation error: ' +
                    'could not find index "' + indexName + '" among ' +
                    'the collection\'s indexes'
                ));
            }

            createdError = new MongooseError.ValidationError(err);

            // populate validation error with the index's fields
            index.forEach(function (item) {
                var value = valueRegex.exec(rawValues)[1],
                    path = item[0], props;

                // value is parsed directly from the error
                // string. Try to guess the value type (in a basic way)
                if (value[0] === '"' || value[0] === "'") {
                    value = value.substr(1, value.length - 2);
                } else if (!isNaN(value)) {
                    value = parseFloat(value);
                }

                props = {
                    type: 'Duplicate value',
                    path: path,
                    value: value
                };

                if (typeof map[path] === 'string') {
                    props.message = map[path];
                }

                createdError.errors[item[0]] =
                    new MongooseError.ValidatorError(props);
            });

            callback(createdError);
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
