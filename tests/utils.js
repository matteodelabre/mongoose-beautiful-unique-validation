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

/**
 * Assert that saving the given two documents containing
 * duplicate fields throws a beautified duplicate error
 *
 * @param {Object} assert Tape assertion object
 * @param {function} creator Callback for saving the documents
 * @param {Object} doc1 The first document to save
 * @param {Object} doc2 The second document to save
 * @param {Array.<string>} dups The list of duplicated keys between the 2 docs
 * @param {string} [message=default] Ensure the given message is
 * thrown with the duplicate error's sub-errors
 */
function assertDuplicateFailure(assert, creator, doc1, doc2, dups, message) {
    // save the first document
    creator(doc1).then(function () {
        // wait to ensure the unique index is rebuilt
        return wait(500);
    }).then(function () {
        // try to save the duplicate document (should not work)
        return creator(doc2);
    }, function (err) {
        assert.error(err, 'should save the first document successfully');
        assert.end();
    }).then(function () {
        assert.fail('should not save the second (duplicate) document successfully');
        assert.end();
    }, function (err) {
        assert.equal(err.name, 'ValidationError', 'the thrown error should be of type ValidationError');

        var missing = dups.filter(function (key) {
            var suberr = err.errors[key];

            if (!err.errors[key]) {
                return true;
            }

            assert.equal(suberr.name, 'ValidatorError', 'each sub-error should be of type ValidatorError');
            assert.equal(suberr.kind, 'Duplicate value', 'each sub-error\'s kind should be "Duplicate value"');

            if (message !== undefined) {
                assert.equal(suberr.message, message, 'each sub-error should carry over the custom message');
            }

            // with buffer values, only compare the inner "buffer" property
            assert.equal(suberr.properties.value.toString(), doc2[key].toString(), 'the sub-error should contain the duplicated value');
            assert.equal(suberr.properties.path, key, 'the sub-error should contain the duplicated value\'s path');
            assert.equal(suberr.properties.type, 'Duplicate value', 'the sub-error\'s type should be "Duplicate value"');

            return false;
        });

        assert.equal(missing.length, 0, 'should report a sub-error per duplicated field');
        assert.equal(
            Object.keys(err.errors).length, dups.length,
            'should only report a sub-error per duplicated field'
        );

        assert.end();
    }).catch(function (err) {
        assert.error(err);
    });
}

exports.wait = wait;
exports.assertDuplicateFailure = assertDuplicateFailure;
