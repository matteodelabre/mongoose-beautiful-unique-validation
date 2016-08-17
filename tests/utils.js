var Promise = require('promise');

/**
 * Return a promise that is resolved
 * nth milliseconds afterwards
 *
 * @param {number} time Time to wait in milliseconds
 * @return {Promise}
 */
function wait(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

function assertDuplicateFailure(assert, Model, doc, message) {
    // save the first instance
    new Model(doc).save().then(function () {
        // ensure the unique index is rebuilt
        return wait(500);
    }).then(function () {
        // try to save a duplicate (should not work)
        new Model(doc).save().then(function () {
            assert.fail('should not save duplicate successfully');
            assert.end();
        }, function (err) {
            assert.ok(err, 'err should exist');
            assert.equal(err.name, 'ValidationError', 'outer err should be of type ValidationError');

            Object.keys(doc).forEach(function (key) {
                var error = err.errors[key];
                var value = error.properties.value;

                // in case of buffers, only compare the inner "buffer" property
                if (typeof value === 'object' && value !== null && value._bsontype === 'Binary') {
                    value = value.buffer;
                }

                assert.equal(error.name, 'ValidatorError', 'inner err should be ValidatorError');
                assert.equal(error.kind, 'Duplicate value', 'kind of err should be Duplicate value');

                // check that our custom error message was passed down, if asked
                if (message !== undefined) {
                    assert.equal(error.message, message, 'message should be our custom value');
                }

                assert.equal(error.properties.path, key, 'err should be on the correct path');
                assert.equal(error.properties.type, 'Duplicate value');
                assert.looseEqual(value, doc[key], 'err should contain the problematic value');
            });

            assert.end();
        });
    }, function (err) {
        assert.error(err, 'should save original instance successfully');
        assert.end();
    });
}

exports.assertDuplicateFailure = assertDuplicateFailure;
