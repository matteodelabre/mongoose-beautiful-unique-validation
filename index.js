'use strict';

var MongooseError = require('mongoose/lib/error');
var Promise = require('promise');
var mongoose = require('mongoose');

// Regex matching 2 kinds of error messages
// E11000 duplicate key error index: mydb.users.$email_1 dup...
// E11000 duplicate key error collection: mydb.users index: email_1 dup...
var errorRegex = /E11.*?\s*(?:collection: .+?\.(.+?)\s*)?index:\s*(?:.+?\.(.+?)\.\$)?(.*?)\s*dup/;

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
 * Extract collection name and failed duplicate index's name
 * from the error message (with a hacky regex)
 *
 * @param {Object} err Error to analyze
 * @return {Object} Either collection and index name or undefined 
 */
function uniqueErrorInfo(err) {
    var matches = errorRegex.exec(err.message);
    return matches && !matches[1] != !matches[2] ? { collectionName: matches[1] || matches[2], indexName: matches[3] } : undefined;
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

    // Retrieve collection name and the index name
    var info = uniqueErrorInfo(error);
    if (info) {

        // This check is a workaround for mongoose 4.11.1 and below
        // See https://github.com/Automattic/mongoose/issues/5405
        var validDoc = doc && doc !== error;
    
        var collection = validDoc && 'collection' in doc ? doc.collection : mongoose.connection.db.collection(info.collectionName);
    
        if (collection) {

            // retrieve that index's list of fields
            next = getIndexes(collection).then(function (indexes) {
                var suberrors = {};

                // create a suberror per duplicated field
                if (info.indexName in indexes) {
                    indexes[info.indexName].forEach(function (field) {
                        var path = field[0];
                        var props = {
                            type: 'Duplicate value',
                            path: path,
                            value: validDoc ? doc.get(path) : 'Sorry, value not available :('
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
