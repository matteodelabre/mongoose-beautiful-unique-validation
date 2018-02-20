'use strict';

var mongoose = require('mongoose');

var errorRegex = /index: (.+) dup key:/;
var indexesCache = {};

/**
 * Check if the given error is a unique error.
 *
 * @param {Object} err Error to test.
 * @return {bool} True if and only if it is an unique error.
 */
function isUniqueError(err) {
    return err
        && (err.name === 'BulkWriteError' || err.name === 'MongoError')
        && (err.code === 11000 || err.code === 11001);
}

/**
 * Search for the value matching a path in dotted notation
 * inside an object.
 *
 * @example
 * - getValueByPath({a: {b: 2}}, 'a.b') -> 2
 * - getValueByPath({}, 'a.b') -> undefined
 * @param {Object} obj Nested object to search.
 * @param {string} path Path of the value to search for.
 * @return {*} Matching value, or undefined if none.
 */
function getValueByPath(obj, path) {
    var segments = path.split('.');
    var result = obj;

    for (
        var i = 0;
        i < segments.length
            && result !== null
            && result !== undefined;
        ++i
    ) {
        result = result[segments[i]];
    }

    return result;
}

/**
 * Recursively collect all messages inside a schema tree and
 * change string values to `true`.
 *
 * @param {Object} tree Schema tree to update and collect from.
 * @return {Object} Map of collected messages.
 */
function collectMessages(tree) {
    var result = {};

    for (var key in tree) {
        if (tree.hasOwnProperty(key)) {
            if (
                typeof tree[key] === 'object'
                && tree[key] !== null
            ) {
                if (typeof tree[key].unique === 'string') {
                    // Schema property that has a custom
                    // unique message
                    result[key] = tree[key].unique;
                    tree[key].unique = true;
                } else {
                    // Nested schema
                    var subtree = collectMessages(tree[key]);

                    for (var subkey in subtree) {
                        if (subtree.hasOwnProperty(subkey)) {
                            result[key + '.' + subkey] = subtree[subkey];
                        }
                    }
                }
            }
        }
    }

    return result;
}

/**
 * Retrieve index information using collection#indexInformation
 * or previously cached data.
 *
 * @param {Object} collection Mongoose collection.
 * @return {Promise} Resolved with index information data.
 */
function getIndexes(collection) {
    return new global.Promise(function (resolve, reject) {
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
 * @param {Collection} collection Mongoose collection.
 * @param {Object} values Hashmap containing data about duplicated values
 * @param {Object} messages Map fields to unique error messages
 * @param {String} defaultMessage Default message formatter string
 * @return {Promise.<ValidationError>} Beautified error message
 */
function beautify(error, collection, values, messages, defaultMessage) {
    // Try to recover the list of duplicated fields
    var onSuberrors = global.Promise.resolve({});

    // Extract the failed duplicate index's name from the
    // from the error message (with a hacky regex)
    var matches = errorRegex.exec(error.message);

    if (matches) {
        var indexName = matches[1];

        // Retrieve that index's list of fields
        onSuberrors = getIndexes(collection).then(function (indexes) {
            var suberrors = {};

            // Create a suberror per duplicated field
            if (indexName in indexes) {
                indexes[indexName].forEach(function (field) {
                    var path = field[0];
                    var props = {
                        type: 'unique',
                        path: path,
                        value: getValueByPath(values, path),
                        message: typeof messages[path] === 'string'
                            ? messages[path] : defaultMessage
                    };

                    suberrors[path] = new mongoose.Error.ValidatorError(props);
                });
            }

            return suberrors;
        });
    }

    return onSuberrors.then(function (suberrors) {
        var beautifiedError = new mongoose.Error.ValidationError();

        beautifiedError.errors = suberrors;
        return beautifiedError;
    });
}

module.exports = function (schema, options) {
    options = options || {};

    if (!options.defaultMessage) {
        options.defaultMessage = 'Path `{PATH}` ({VALUE}) is not unique.';
    }

    // Fetch error messages defined in the "unique" field,
    // store them for later use and replace them with true
    var tree = schema.tree;
    var messages = collectMessages(tree);

    schema._indexes.forEach(function (index) {
        if (index[0] && index[1] && index[1].unique) {
            Object.keys(index[0]).forEach(function (indexKey) {
                messages[indexKey] = index[1].unique;
            });

            index[1].unique = true;
        }
    });

    // Post hook that gets called after any save or update
    // operation and that filters unique errors
    var postHook = function (error, _, next) {
        // Mongoose ≥5 does no longer pass the document as the
        // second argument of 'update' hooks, so we use this instead
        var doc = this;

        // If the next() function is missing, this might be
        // a sign that we are using an outdated Mongoose
        if (typeof next !== 'function') {
            throw new Error(
                'mongoose-beautiful-unique-validation error: '
                + 'The hook was called incorrectly. Double check that '
                + 'you are using mongoose@>=4.5.0; if you need to use '
                + 'an outdated Mongoose version, please install this module '
                + 'in version 4.0.0'
            );
        }

        if (isUniqueError(error)) {
            // Beautify unicity constraint failure errors
            var collection, values;

            if (this.constructor.name == 'Query') {
                collection = this.model.collection;
                values = this._update;

                if ('$set' in values) {
                    values = Object.assign({}, values, values.$set);
                    delete values.$set;
                }
            } else {
                collection = doc.collection;
                values = doc;
            }

            beautify(
                error, collection, values,
                messages, options.defaultMessage
            )
                .then(next)
                .catch(function (beautifyError) {
                    setTimeout(function () {
                        throw new Error(
                            'mongoose-beautiful-unique-validation error: '
                            + beautifyError.stack
                        );
                    });
                });
        } else {
            // Pass over other errors
            next(error);
        }
    };

    schema.post('save', postHook);
    schema.post('update', postHook);
    schema.post('findOneAndUpdate', postHook);
};
