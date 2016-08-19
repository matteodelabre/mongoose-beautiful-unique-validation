'use strict';

var MongooseError = require('mongoose/lib/error');
var Promise = require('promise');

var errorRegex = /index:\s*(?:.+?\.\$)?(.*?)\s*dup/;
var indexesCache = {};

/**
 * Check if given error is an unique error
 *
 * @param {Object} err Error to test
 * @return {bool} True if it is an unique error
 */
function isUniqueError(err) {
    return err && err.name === 'MongoError' &&
        (err.code === 11000 || err.code === 11001);
}

/**
 * Retrieve index information using collection#indexInformation
 * or previously cached data
 *
 * @param {Object} collection Mongoose collection
 * @return {Promise} Resolved with index information data
 */
function getIndexes(collection) {
    return new Promise(function (resolve, reject) {
        if (indexesCache[collection.name]) {
            resolve(indexesCache[collection.name]);
            return;
        }

        collection.indexInformation(function (dbErr, indexes) {
            if (dbErr) {
                reject(dbErr);
                return;
            }

            indexesCache[collection.name] = indexes;
            resolve(indexes);
        });
    });
}

/**
 * Beautify an E11000 or 11001 (unique constraint fail) Mongo error
 * by turning it into a validation error
 *
 * @param {MongoError} err Error to process
 * @param {NativeCollection} collection Collection associated to the document
 * @param {Object} messages Map fields to unique error messages
 * @return {Promise} Resolved with the beautified error message
 */
function beautify(error, collection, messages) {
    return new Promise(function (resolve, reject) {
        // get the index name and duplicated values
        // from the error message (with a hacky regex)
        var matches = errorRegex.exec(error.message);

        if (!matches) {
            reject(new Error(
                'mongoose-beautiful-unique-validation error: ' +
                'Unrecognized error pattern. The error has not ' +
                'been processed.'
            ));
            return;
        }

        var indexName = matches[1];
        var valuesMap = error.getOperation() || {};

        // retrieve the index by name in the collection
        // fail if we do not find such index
        getIndexes(collection).then(function (indexes) {
            var index = indexes[indexName];

            if (!index) {
                reject(new Error(
                    'mongoose-beautiful-unique-validation error: ' +
                    'could not find index "' + indexName + '" among ' +
                    'the collection\'s indexes'
                ));
                return;
            }

            var createdError = new MongooseError.ValidationError();

            // the index contains the field keys in the same order
            // (hopefully) as in the original error message. Create a
            // duplication error for each field in the index, using
            // valuesList to get the duplicated values
            index.forEach(function (item) {
                var path = item[0];
                var props = {
                    type: 'Duplicate value',
                    path: path,
                    value: valuesMap[path]
                };

                if (typeof messages[path] === 'string') {
                    props.message = messages[path];
                }

                createdError.errors[path] =
                    new MongooseError.ValidatorError(props);
            });

            resolve(createdError);
        }).catch(reject);
    });
}

module.exports = function (schema) {
    var tree = schema.tree, key, messages = {};

    // fetch error messages defined in the "unique" field,
    // store them for later use and replace them with true
    for (key in tree) {
        if (tree.hasOwnProperty(key)) {
            if (tree[key] && tree[key].unique) {
                messages[key] = tree[key].unique;
                tree[key].unique = true;
            }
        }
    }

    schema._indexes.forEach(function (index) {
        if (index[0] && index[1] && index[1].unique) {
            Object.keys(index[0]).forEach(function (indexKey) {
                messages[indexKey] = index[1].unique;
            });

            index[1].unique = true;
        }
    });

    // this hook gets called after any save operation by Mongoose
    // and filters unique errors
    schema.post('save', function (error, doc, next) {
        if (isUniqueError(error)) {
            // we have a native E11000/11001 error, lets beautify it
            beautify(error, doc.collection, messages).then(function (beautifulError) {
                // successfully beautified the error
                next(beautifulError);
            }).catch(function (beautifyingErr) {
                // the error could not be beautified. Warn about
                // it and pass on the normal error
                console.warn(beautifyingErr);
                next(error);
            });
        } else {
            // otherwise, just pass on the error
            next(error);
        }
    });
};
