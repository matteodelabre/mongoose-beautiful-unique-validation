'use strict';

var MongooseError = require('mongoose/lib/error');
var mongooseModelSave = require('mongoose/lib/model').prototype.save;
var Promise = require('promise');

var errorRegex = /index:\s*(?:.+?\.\$)?(\S*)\s*dup key:\s*\{(.*?)\}/;
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
 * @param {Object} model Model associated to the document
 * @param {Object} messages Map fields to unique error messages
 * @return {Promise} Resolved with the beautified error message
 */
function beautify(error, model, messages) {
    var matches, indexName, rawValues, valueRegex;

    return new Promise(function (resolve, reject) {
        // get index name from the error message
        matches = errorRegex.exec(error.message);

        if (!matches) {
            reject(new Error(
                'mongoose-beautiful-unique-validation error: ' +
                'Unrecognized error pattern. The error has not ' +
                'been processed.'
            ));
            return;
        }

        indexName = matches[1], rawValues = matches[2].trim() + ',';
        valueRegex = /\s*:\s*(\S*),/g;

        // look for the index contained in the MongoDB error
        getIndexes(model.collection).then(function (indexes) {
            var index = indexes[indexName];

            if (!index) {
                reject(new Error(
                    'mongoose-beautiful-unique-validation error: ' +
                    'could not find index "' + indexName + '" among ' +
                    'the collection\'s indexes'
                ));
                return;
            }

            var createdError = new MongooseError.ValidationError(model);

            // populate validation error with the index's fields
            index.forEach(function (item) {
                var value = valueRegex.exec(rawValues)[1],
                    path = item[0], props;

                // the value is parsed directly from the error
                // string. We try to guess the value type (in a basic way)
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

                if (typeof messages[path] === 'string') {
                    props.message = messages[path];
                }

                createdError.errors[item[0]] =
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

    /**
     * Save the schema in the database, beautify any
     * unique error produced in the process
     *
     * @param {Object} [options] Options for #save
     * @param {bool} [options.safe] Overrides schema's safe option
     * @param {bool} [options.validateBeforeSave] Set to false to save without validating
     * @param {bool} [options.beautifyUnique] Set to false to disable beautifying unique errors
     * @param {function} [callback] Callback called with any error and the document
     * @return {Promise} If no callback was provided, resolved with the
     * document and fails if any error was produced
     */
    schema.methods.save = function (options, callback) {
        var that = this;

        // default arguments
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        if (options === undefined) {
            options = {};
        }

        if (typeof callback !== 'function') {
            callback = function () {};
        }

        var beautifyUnique = options.beautifyUnique !== false;

        return new Promise(function (resolve, reject) {
            mongooseModelSave.call(that, options, function (err, document, numAffected) {
                // we have a native E11000/11001 error, lets beautify it
                if (isUniqueError(err) && beautifyUnique) {
                    beautify(err, that, messages).then(function (beautifiedErr) {
                        // successfully beautified the error
                        reject(beautifiedErr);
                        callback(beautifiedErr);
                    }).catch(function (beautifyingErr) {
                        // the error could not be beautified. Warn about
                        // it and pass on the normal error
                        console.warn(beautifyingErr);
                        reject(err);
                        callback(err);
                    });
                    return;
                }

                if (err) {
                    reject(err);
                    callback(err);
                    return;
                }

                resolve(document);
                callback(null, document, numAffected);
            });
        });
    };

    /**
     * Deprecated, use #save instead
     */
    schema.methods.trySave = function (callback) {
        // /!\ Deprecation warning
        console.warn(
            'mongoose-beautiful-unique-validation: Model#trySave() is ' +
            'deprecated, use Model#save() instead. To disable ' +
            'beautifying on plugged-in models, set the "beautifyUnique" ' +
            'option to false in this function\'s arguments'
        );

        return this.save({}, callback);
    };
};
