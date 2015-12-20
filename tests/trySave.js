'use strict';

var test = require('tape');
var crypto = require('crypto');
var mongoose = require('mongoose');
var beautifulValidation = require('../');

/**
 * Create an unique model name
 * (should be sufficiently unique for a few tests)
 *
 * @return {string} Random model name
 */
function makeUniqueName() {
    return crypto.randomBytes(8).toString('hex');
}

/**
 * Create a model with an unique "name"
 * property and a random name
 *
 * @param {string} custom Custom unique validation message
 * @return {Model} Moongoose model
 */
function makeModel(custom) {
    var schema = new mongoose.Schema({
        name: {
            type: String,
            unique: custom || true
        }
    });

    schema.plugin(beautifulValidation);
    return mongoose.model(makeUniqueName(), schema);
}

/**
 * Create a model with a compound unique index
 *
 * @return {Model} Mongoose model
 */
function makeCompoundModel() {
    var schema = new mongoose.Schema({
        name: String,
        email: String
    });

    schema.plugin(beautifulValidation);
    schema.index({
        name: 1,
        email: 1
    }, {unique: true});

    return mongoose.model(makeUniqueName(), schema);
}

mongoose.connect('mongodb://localhost/test');
mongoose.connection.on('open', function () {
    test('should work like save', function (assert) {
        var Model = makeModel(),
            instance, name = 'testing';

        instance = new Model({
            name: name
        });

        instance.trySave(function (saveErr) {
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
        var Model = makeModel(),
            instance, name = 'testing';

        instance = new Model({
            name: name
        });

        instance.trySave().then(function () {
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
        var Model = makeModel(),
            originalInst, duplicateInst, name = 'duptest';

        originalInst = new Model({
            name: name
        });

        originalInst.trySave().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            duplicateInst = new Model({
                name: name
            });

            return duplicateInst.trySave();
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

    test('should work with compound unique indexes', function (assert) {
        var Model = makeCompoundModel(),
            name = 'duptest', email = 'duptest@example.com',
            originalInst, duplicateInst;

        originalInst = new Model({
            name: name,
            email: email
        });

        originalInst.trySave().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            duplicateInst = new Model({
                name: name,
                email: email
            });

            return duplicateInst.trySave();
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
        var message = 'works!', Model = makeModel(message),
            originalInst, duplicateInst, name = 'duptest';

        originalInst = new Model({
            name: name
        });

        duplicateInst = new Model({
            name: name
        });

        originalInst.trySave().catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        }).then(function () {
            return duplicateInst.trySave();
        }).then(function () {
            assert.fail('should not save duplicate successfully');
            assert.end();
        }, function (err) {
            assert.equal(err.errors.name.message, message, 'message should be our custom value');
            assert.end();
        });
    });

    test('closing connection', function (assert) {
        mongoose.disconnect();
        assert.end();
    });
});
