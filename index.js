'use strict';

var MongooseError = require('mongoose/lib/error');

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
 * Beautify an E11000 or 11001 (unique constraint fail) Mongo error
 * by turning it into a validation error
 *
 * @param {MongoError} err Error to process
 * @param {Object} messages Map fields to unique error messages
 * @return {ValidationError} Beautified error message
 */
function beautify(error, messages) {
    var valuesMap = ('getOperation' in error) ? error.getOperation() : {};
    var createdError = new MongooseError.ValidationError();

    // the index contains the field keys in the same order
    // (hopefully) as in the original error message. Create a
    // duplication error for each field in the index, using
    // valuesMap to get the duplicated values
    Object.keys(valuesMap).forEach(function (path) {
        // ignore Mongoose internals
        if (path.slice(0, 2) === '__') {
            return;
        }

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

    return createdError;
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
            next(beautify(error, messages));
        } else {
            // pass over normal errors
            next(error);
        }
    };

    schema.post('save', postHook);
    schema.post('findOneAndUpdate', postHook);
};
