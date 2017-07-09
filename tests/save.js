'use strict';

var test = require('tape');
var mongoose = require('mongoose');
var Promise = require('promise');

var Schema = mongoose.Schema;
var beautifulValidation = require('../');

mongoose.plugin(beautifulValidation);

/**
 * Assert that the given object is a correct validation error.
 *
 * @param {Object} assert Tape assertion object
 * @param {Object} err Object to test.
 * @param {Object} dups Map from fields that are duplicated to their value.
 * @param {string} [message=default] Ensure the given message is
 * thrown with the duplicate error's sub-errors
 */
function assertUniqueError(assert, err, dups, message) {
    assert.equal(err.name, 'ValidationError',
        'the thrown error should be of type ValidationError');

    var missing = Object.keys(dups).filter(function (key) {
        var suberr = err.errors[key];

        if (!err.errors[key]) {
            return true;
        }

        assert.equal(suberr.name, 'ValidatorError',
            'each sub-error should be of type ValidatorError');
        assert.equal(suberr.kind, 'Duplicate value',
            'each sub-error\'s kind should be "Duplicate value"');

        if (message !== undefined) {
            assert.equal(suberr.message, message,
                'each sub-error should carry over the custom message');
        }

        // with buffer values, only compare the inner "buffer" property
        assert.equal(
            suberr.properties.value.toString(), dups[key].toString(),
            'the sub-error should contain the duplicated value'
        );

        assert.equal(
            suberr.properties.path, key,
            'the sub-error should contain the duplicated value\'s path'
        );

        assert.equal(
            suberr.properties.type, 'Duplicate value',
            'the sub-error\'s type should be "Duplicate value"'
        );

        return false;
    });

    assert.equal(
        missing.length, 0,
        'should report a sub-error per duplicated field'
    );

    assert.equal(
        Object.keys(err.errors).length, Object.keys(dups).length,
        'should only report a sub-error per duplicated field'
    );
}

test('should report duplicates', function (assert) {
    var DuplicateSchema = new Schema({
        name: {
            type: String,
            unique: true
        },
        age: {
            type: Number
        },
        address: {
            type: String,
            unique: true
        }
    });

    var Duplicate = mongoose.model('Duplicate', DuplicateSchema);

    Duplicate.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        new Duplicate({
            name: 'John Doe',
            age: 13,
            address: '123 Fake St.'
        }).save().then(function () {
            return new Duplicate({
                name: 'Jane Doe',
                age: 13,
                address: '123 Fake St.'
            }).save();
        }, function (err) {
            assert.error(err, 'should save the first document successfully');
            assert.end();
        }).then(function () {
            assert.fail('should not save the duplicate document successfully');
            assert.end();
        }, function (err) {
            assertUniqueError(assert, err, {'address': '123 Fake St.'});
            assert.end();
        });
    });
});

test('should report duplicates with Model.create()', function (assert) {
    var CreateSchema = new Schema({
        name: {
            type: String,
            unique: true
        },
        age: {
            type: Number
        },
        address: {
            type: String,
            unique: true
        }
    });

    var Create = mongoose.model('Create', CreateSchema);

    Create.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        Create.create({
            name: 'John Doe',
            age: 13,
            address: '123 Fake St.'
        }).then(function () {
            return Create.create({
                name: 'Jane Doe',
                age: 13,
                address: '123 Fake St.'
            });
        }, function (err) {
            assert.error(err, 'should save the first document successfully');
            assert.end();
        }).then(function () {
            assert.fail('should not save the duplicate document successfully');
            assert.end();
        }, function (err) {
            assertUniqueError(assert, err, {'address': '123 Fake St.'});
            assert.end();
        });
    });
});

test('should report duplicates with Model.findOneAndUpd()', function (assert) {
    var FoauSchema = new Schema({
        address: {
            type: String,
            unique: true
        }
    });

    var Foau = mongoose.model('Foau', FoauSchema);

    Foau.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        // Create two non-conflicting instances and save them
        Promise.all([
            new Foau({
                address: '123 Fake St.'
            }).save(),
            new Foau({
                address: '321 Fake St.'
            }).save()
        ]).then(function () {
            // Update one of the instances to conflict with the first one
            Foau.findOneAndUpdate({
                address: '321 Fake St.'
            }, {
                address: '123 Fake St.'
            }).exec().then(function () {
                assert.fail('should not update duplicate successfully');
                assert.end();
            }, function (err) {
                assertUniqueError(assert, err, {'address': '123 Fake St.'});
                assert.end();
            });
        }).catch(function (err) {
            assert.error(err, 'should save original instance successfully');
            assert.end();
        });
    });
});

test('should report duplicates with Model.update()', function (assert) {
    var UpdateSchema = new Schema({
        address: {
            type: String,
            unique: true
        }
    });

    var Update = mongoose.model('Update', UpdateSchema);

    Update.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        // Create two non-conflicting instances and save them
        var upd1 = new Update({
            address: '123 Fake St.'
        });

        var upd2 = new Update({
            address: '321 Fake St.'
        });

        Promise.all([
            upd1.save(),
            upd2.save()
        ]).then(function () {
            // Update one of the instances to conflict with the first one
            return upd2.update({
                $set: {address: '123 Fake St.'}
            }).exec().then(function () {
                assert.fail('should not update duplicate successfully');
                assert.end();
            }, function (err) {
                assertUniqueError(assert, err, {address: '123 Fake St.'});
                assert.end();
            });
        }, function (err) {
            assert.error(err, 'should save original instances successfully');
            assert.end();
        });
    });
});

test('should report duplicates on fields containing spaces', function (assert) {
    var SpacesSchema = new Schema({
        'display name': {
            type: String,
            unique: true
        }
    });

    var Spaces = mongoose.model('Spaces', SpacesSchema);

    Spaces.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        new Spaces({
            'display name': 'Testing display names'
        }).save().then(function () {
            return new Spaces({
                'display name': 'Testing display names'
            }).save();
        }, function (err) {
            assert.error(err, 'should save the first document successfully');
            assert.end();
        }).then(function () {
            assert.fail('should not save the duplicate document successfully');
            assert.end();
        }, function (err) {
            assertUniqueError(assert, err,
                {'display name': 'Testing display names'});
            assert.end();
        });
    });
});

test('should report duplicates on compound indexes', function (assert) {
    var CompoundSchema = new Schema({
        name: String,
        age: Number
    });

    CompoundSchema.index({
        name: 1,
        age: 1
    }, {
        unique: true
    });

    var Compound = mongoose.model('Compound', CompoundSchema);

    Compound.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        new Compound({
            name: 'John Doe',
            age: 42
        }).save().then(function () {
            return new Compound({
                name: 'John Doe',
                age: 42
            }).save();
        }, function (err) {
            assert.error(err, 'should save the first document successfully');
            assert.end();
        }).then(function () {
            assert.fail('should not save the duplicate document successfully');
            assert.end();
        }, function (err) {
            assertUniqueError(assert, err, {
                name: 'John Doe',
                age: 42
            });

            assert.end();
        });
    });
});

test('should use custom validation messages', function (assert) {
    var MessageSchema = new Schema({
        address: {
            type: String,
            unique: 'this is our custom message!'
        }
    });

    var Message = mongoose.model('Message', MessageSchema);

    Message.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        new Message({
            address: '123 Fake St.'
        }).save().then(function () {
            return new Message({
                address: '123 Fake St.'
            }).save();
        }, function (err) {
            assert.error(err, 'should save the first document successfully');
            assert.end();
        }).then(function () {
            assert.fail('should not save the duplicate document successfully');
            assert.end();
        }, function (err) {
            assertUniqueError(assert, err, {
                address: '123 Fake St.'
            }, 'this is our custom message!');

            assert.end();
        });
    });
});

test('should use custom validation messages w/ compound', function (assert) {
    var CompoundMessageSchema = new Schema({
        name: String,
        age: Number
    });

    CompoundMessageSchema.index({
        name: 1,
        age: 1
    }, {
        unique: 'yet another custom message'
    });

    var CompoundMessage = mongoose.model(
        'CompoundMessage',
        CompoundMessageSchema
    );

    CompoundMessage.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        new CompoundMessage({
            name: 'John Doe',
            age: 42
        }).save().then(function () {
            return new CompoundMessage({
                name: 'John Doe',
                age: 42
            }).save();
        }, function (err) {
            assert.error(err, 'should save the first document successfully');
            assert.end();
        }).then(function () {
            assert.fail('should not save the duplicate document successfully');
            assert.end();
        }, function (err) {
            assertUniqueError(assert, err, {
                name: 'John Doe',
                age: 42
            }, 'yet another custom message');

            assert.end();
        });
    });
});

test('should report duplicates on any mongoose type', function (assert) {
    var AnyTypeSchema = new Schema({
        name: String,
        group: Schema.Types.ObjectId,
        age: Number,
        date: Date,
        blob: Buffer,
        isVerified: Boolean,
        list: []
    });

    AnyTypeSchema.index({
        name: 1,
        group: 1,
        age: 1,
        date: 1,
        blob: 1,
        isVerified: 1,
        list: 1
    }, {
        unique: true
    });

    var groupId = new mongoose.Types.ObjectId;
    var date = new Date();
    var AnyType = mongoose.model('AnyType', AnyTypeSchema);

    AnyType.on('index', function (indexErr) {
        assert.error(indexErr, 'indexes should be built correctly');

        new AnyType({
            name: 'test',
            group: groupId,
            age: 42,
            date: date,
            blob: new Buffer('abc'),
            isVerified: false,
            list: [1, 2, 3]
        }).save().then(function () {
            return new AnyType({
                name: 'test',
                group: groupId,
                age: 42,
                date: date,
                blob: new Buffer('abc'),
                isVerified: false,
                list: [1, 2, 3]
            }).save();
        }, function (err) {
            assert.error(err, 'should save the first document successfully');
            assert.end();
        }).then(function () {
            assert.fail('should not save the duplicate document successfully');
            assert.end();
        }, function (err) {
            assertUniqueError(assert, err, {
                name: 'test',
                group: groupId,
                age: 42,
                date: date,
                blob: new Buffer('abc'),
                isVerified: false,
                list: [1, 2, 3]
            });

            assert.end();
        });
    });
});
