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
 * @param {Document} doc The duplicated document
 * @param {Object} messages Map fields to unique error messages
 * @return {Promise.<ValidationError>} Beautified error message
 */
function beautify(error, doc, messages) {
    // recover the list of duplicated fields. Only available if the
    // driver provides access to the original collection (for retrieving
    // the duplicated index's fields)
    var next = Promise.resolve({});

    if ('collection' in doc) {
        var collection = doc.collection;

        // extract the failed duplicate index's name from the
        // from the error message (with a hacky regex)
        var matches = errorRegex.exec(error.message);

        if (matches) {
            var indexName = matches[1];

            // retrieve that index's list of fields
            next = getIndexes(collection).then(function (indexes) {
                var suberrors = {};

                // create a suberror per duplicated field
                if (indexName in indexes) {
                    indexes[indexName].forEach(function (field) {
                        var path = field[0];
                        var props = {
                            type: 'Duplicate value',
                            path: path,
                            value: doc[path]
                        };

                        if (typeof messages[path] === 'string') {
                            props.message = messages[path];
                        }

                        suberrors[path] = new MongooseError.ValidatorError(props);
                    });
                }

                return suberrors;
            });
        }
    }

    return next.then(function (suberrors) {
        var beautifiedError = new MongooseError.ValidationError();

        beautifiedError.errors = suberrors;
        return beautifiedError;
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

    // this hook gets called after any save or update
    // operation by Mongoose and filters unique errors
    var postHook = function (error, doc, next) {
        // if the next() function is missing, this might by
        // a sign that we use an outdated Mongoose
        if (typeof next !== 'function') {
            throw new Error(
                'mongoose-beautiful-unique-validation error: ' +
                'The hook was called incorrectly. Double check that ' +
                'you are using mongoose@>=4.5.0; if you need to use ' +
                'an outdated Mongoose version, please install this module ' +
                'in version 4.0.0'
            );
        }

        if (isUniqueError(error)) {
            // beautify unicity constraint failure errors
            beautify(error, doc, messages)
                .then(next)
                .catch(function (beautifyError) {
                    setTimeout(function () {
                        throw new Error(
                            'mongoose-beautiful-unique-validation error: ' +
                            beautifyError.stack
                        );
                    });
                });
        } else {
            // pass over normal errors
            next(error);
        }
    };

    schema.post('save', postHook);
    schema.post('findOneAndUpdate', postHook);
};
