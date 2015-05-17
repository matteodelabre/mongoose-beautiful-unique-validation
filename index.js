'use strict';

var MongooseError = require('mongoose/lib/error');
var regex = /index:\s*.+?\.\$(\S*)\s*dup key:\s*\{.*?:\s*"(.*)"\s*\}/;

/**
 * Beautifies an E11000 (unique constraint fail) Mongo error
 * by turning it into a validation error
 * 
 * @param {MongoError} err Error to beautify
 * @param {Object} collection Collection for the associated model
 * @param {Object} map Map fields -> unique error messages
 * @param {function} callback Called with the beautified error
 * @return {null}
 */
function beautify(err, collection, map, callback) {
    var matches = regex.exec(err.message), map;
    
    if (matches && typeof matches[1] === 'string') {
        collection.indexInformation(function (err, indexes) {
            var valError = new MongooseError.ValidationError(err),
                index = indexes && indexes[matches[1]];
            
            if (!err && index) {
                // populate validation error with the fields
                // contained in the index
                index.forEach(function (item) {
                    map = {
                        type: 'Duplicate value',
                        path: item[0],
                        value[matches[2]]
                    };
                    
                    if (typeof map[item[0]] === 'string') {
                        map.message = map[item[0]];
                    }
                    
                    valError.errors[item[0]] =
                        new MongooseError.ValidatorError(map);
                });
                
                callback(valError);
                return;
            }
            
            callback(err);
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
        var collection = this.collection;
        
		this.save(function (err, doc) {
            // we have a native E11000 error, lets beautify it
            if (err && err.name === 'MongoError' && err.code === 11000) {
                beautify(err, collection, map, function (newErr) {
                    callback(newErr, doc);
                });
                return;
            }
            
            callback(err, doc);
        });
    };
};
