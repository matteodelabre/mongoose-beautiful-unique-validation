'use strict';

var test = require('tape');
var crypto = require('crypto');
var mongoose = require('mongoose');
var beautifulValidation = require('../');

/**
 * Generate a 8-chars random string
 * (should be sufficiently unique for a few tests)
 *
 * @return {string} Random string
 */
function uniqueString() {
    return crypto.randomBytes(8).toString('hex');
}

/**
 * Create a randomly-named model with any number
 * of fields. This model has an unique index over
 * all created fields
 *
 * @param {Array<string>|string} fieldNames Names of the fields
 * @param {string} [message=default message] Custom unique validation message
 * @return {Model} Mongoose model
 */
function makeModel(fieldNames, message) {
    var schema;

    if (Array.isArray(fieldNames) && fieldNames.length > 1) {
        // if there is more than one field,
        // we create a compound index
        var index = {}, fields = {};

        fieldNames.forEach(fieldName => {
            fields[fieldName] = String;
            index[fieldName] = 1;
        });

        schema = new mongoose.Schema(fields);
        schema.index(index, {
            unique: message || true
        });
    } else {
        // otherwise, we create a simple index
        if (Array.isArray(fieldNames)) {
            fieldNames = fieldNames[0];
        }

        schema = new mongoose.Schema({
            [fieldNames]: {
                type: String,
                unique: message || true
            }
        });
    }

    schema.plugin(beautifulValidation);
    return mongoose.model(uniqueString(), schema);
}

// connect to a database with a random name
mongoose.connect('mongodb://127.0.0.1/mongoose-buv-' + uniqueString());
mongoose.connection.on('open', function () {
    test('should work like save', function (assert) {
        var Model = makeModel('name'),
            instance, name = 'testing';

        instance = new Model({
            name: name
        });

        instance.save(function (saveErr) {
            assert.error(saveErr, 'should save instance successfully');

            Model.find({
                name: name
            }, function (findErr, found) {
                assert.error(findErr, 'should run find correctly');
                assert.equal(found[0].name, name, 'should keep props & values');
                assert.end();
            });
        });
    });

    test('should work with promises', function (assert) {
        var Model = makeModel('name'),
            instance, name = 'testing';

        instance = new Model({
            name: name
        });

        instance.save().then(function () {
            Model.find({
                name: name
            }, function (err, found) {
                assert.error(err, 'should run find correctly');
                assert.equal(found[0].name, name, 'should keep props & values');
                assert.end();
            });
        }).catch(function (err) {
            assert.error(err, 'should save instance successfully');
            assert.end();
        });
    });

    test('should emit duplicate validation error', function (assert) {
        var Model = makeModel('name'),
            originalInst, duplicateInst, name = 'duptest';

        originalInst = new Model({
            name: name
        });

        originalInst.save().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            duplicateInst = new Model({
                name: name
            });

            return duplicateInst.save();
        }).then(function () {
            assert.fail('should not save duplicate successfully');
            assert.end();
        }, function (err) {
            assert.ok(err, 'err should exist');
            assert.equal(err.name, 'ValidationError', 'outer err should be of type ValidationError');
            assert.equal(err.errors.name.name, 'ValidatorError', 'inner err should be ValidatorError');
            assert.equal(err.errors.name.kind, 'Duplicate value', 'kind of err should be Duplicate value');
            assert.equal(err.errors.name.properties.path, 'name', 'err should be on the correct path');
            assert.equal(err.errors.name.properties.type, 'Duplicate value');
            assert.equal(err.errors.name.properties.value, name, 'err should contain the problematic value');

            assert.end();
        });
    });

    test('should work with spaces in field name', function (assert) {
        var message = 'works!', Model = makeModel('display name', message),
            originalInst, duplicateInst, name = 'duptest';

        originalInst = new Model({
            'display name': name
        });

        duplicateInst = new Model({
            'display name': name
        });

        originalInst.save().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            return duplicateInst.save();
        }).then(function () {
            assert.fail('should not save duplicate successfully');
            assert.end();
        }, function (err) {
            assert.equal(err.errors['display name'].properties.path, 'display name', 'should keep the key with spaces');
            assert.end();
        });
    });

    test('should work with spaces in field value', function (assert) {
        var message = 'works!', Model = makeModel('name', message),
            originalInst, duplicateInst, name = 'dup test';

        originalInst = new Model({
            name: name
        });

        duplicateInst = new Model({
            name: name
        });

        originalInst.save().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            return duplicateInst.save();
        }).then(function () {
            assert.fail('should not save duplicate successfully');
            assert.end();
        }, function (err) {
            assert.equal(err.errors.name.message, message, 'should have correct error message');
            assert.end();
        }).catch(function (err) {
            console.error(err.stack);
            assert.fail('correct error message not found');
            assert.end();
        });
    });

    test('should work with compound unique indexes', function (assert) {
        var Model = makeModel(['name', 'email']),
            name = 'duptest', email = 'duptest@example.com',
            originalInst, duplicateInst;

        originalInst = new Model({
            name: name,
            email: email
        });

        originalInst.save().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            duplicateInst = new Model({
                name: name,
                email: email
            });

            return duplicateInst.save();
        }).then(function () {
            assert.fail('should not save duplicate successfully');
            assert.end();
        }, function (err) {
            assert.ok(err, 'err should exist');
            assert.equal(err.name, 'ValidationError', 'outer err should be of type ValidationError');
            assert.equal(err.errors.name.name, 'ValidatorError', 'inner err should be ValidatorError');
            assert.equal(err.errors.name.kind, 'Duplicate value', 'kind of err should be Duplicate value');
            assert.equal(err.errors.name.properties.path, 'name', 'err should be on the correct path');
            assert.equal(err.errors.name.properties.type, 'Duplicate value');
            assert.equal(err.errors.name.properties.value, name, 'err should contain the problematic value');

            assert.end();
        });
    });

    test('should use custom validation message', function (assert) {
        var message = 'works!', Model = makeModel('name', message),
            originalInst, duplicateInst, name = 'duptest';

        originalInst = new Model({
            name: name
        });

        duplicateInst = new Model({
            name: name
        });

        originalInst.save().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            return duplicateInst.save();
        }).then(function () {
            assert.fail('should not save duplicate successfully');
            assert.end();
        }, function (err) {
            assert.equal(err.errors.name.message, message, 'message should be our custom value');
            assert.end();
        });
    });

    test('should use custom validation message (compound index)', function (assert) {
        var message = 'works!', Model = makeModel(['name', 'email'], message),
            originalInst, duplicateInst, name = 'duptest';

        originalInst = new Model({
            name: name
        });

        duplicateInst = new Model({
            name: name
        });

        originalInst.save().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            return duplicateInst.save();
        }).then(function () {
            assert.fail('should not save duplicate successfully');
            assert.end();
        }, function (err) {
            assert.equal(err.errors.name.message, message, 'message should be our custom value (compound)');
            assert.end();
        });
    });

    test('closing connection', function (assert) {
        // clean up the test database
        mongoose.connection.db.dropDatabase().then(function () {
            mongoose.disconnect();
            assert.end();
        }).catch(function (err) {
            assert.error(err, 'should clean up the test database');
            assert.end();
        });
    });
});
