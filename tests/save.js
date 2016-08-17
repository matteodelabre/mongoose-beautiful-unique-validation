'use strict';

var test = require('tape');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var assertDuplicateFailure = require('./utils').assertDuplicateFailure;
var beautifulValidation = require('../');

test('should save documents', function (assert) {
    var NormalSaveSchema = new Schema({
        name: String
    });

    NormalSaveSchema.plugin(beautifulValidation);

    var NormalSave = mongoose.model('NormalSave', NormalSaveSchema);
    var instance = new NormalSave({
        name: 'Test for Normal Save'
    });

    instance.save(function (saveError) {
        assert.error(saveError, 'should save an instance successfully');

        NormalSave.find({
            name: 'Test for Normal Save'
        }, function (findError, result) {
            assert.error(findError, 'should find back the saved instance');
            assert.looseEqual(result[0].name, 'Test for Normal Save', 'should keep the document intact');
            assert.end();
        });
    });
});

test('should provide a promise', function (assert) {
    var PromiseSaveSchema = new Schema({
        name: String
    });

    PromiseSaveSchema.plugin(beautifulValidation);

    var PromiseSave = mongoose.model('PromiseSave', PromiseSaveSchema);
    var instance = new PromiseSave({
        name: 'Test for Promise Save'
    });

    instance.save().then(function () {
        PromiseSave.find({
            name: 'Test for Promise Save'
        }, function (findError, result) {
            assert.error(findError, 'should find back the saved instance');
            assert.looseEqual(result[0].name, 'Test for Promise Save', 'should keep the document intact');
            assert.end();
        });
    }).catch(function (error) {
        assert.error(error, 'should save an instance successfully');
    });
});

test('should report duplicates', function (assert) {
    var DuplicateSchema = new Schema({
        address: {
            type: String,
            unique: true
        }
    });

    DuplicateSchema.plugin(beautifulValidation);
    var Duplicate = mongoose.model('Duplicate', DuplicateSchema);

    assertDuplicateFailure(assert, Duplicate, {
        address: '123 Fake St.'
    });
});

test('should report duplicates on fields containing spaces', function (assert) {
    var SpacesSchema = new Schema({
        'display name': {
            type: String,
            unique: true
        }
    });

    SpacesSchema.plugin(beautifulValidation);
    var Spaces = mongoose.model('Spaces', SpacesSchema);

    assertDuplicateFailure(assert, Spaces, {
        'display name': 'Testing display names'
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

    CompoundSchema.plugin(beautifulValidation);
    var Compound = mongoose.model('Compound', CompoundSchema);

    assertDuplicateFailure(assert, Compound, {
        name: 'John Doe',
        age: 42
    });
});

test('should report duplicates with the custom validation message', function (assert) {
    var MessageSchema = new Schema({
        address: {
            type: String,
            unique: 'this is our custom message!'
        }
    });

    MessageSchema.plugin(beautifulValidation);
    var Message = mongoose.model('Message', MessageSchema);

    assertDuplicateFailure(assert, Message, {
        address: '123 Fake St.'
    }, 'this is our custom message!');
});

test('should report duplicates on compound indexes with the custom validation message', function (assert) {
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

    CompoundMessageSchema.plugin(beautifulValidation);
    var CompoundMessage = mongoose.model('CompoundMessage', CompoundMessageSchema);

    assertDuplicateFailure(assert, CompoundMessage, {
        name: 'John Doe',
        age: 42
    }, 'yet another custom message');
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

    AnyTypeSchema.plugin(beautifulValidation);
    var AnyType = mongoose.model('AnyType', AnyTypeSchema);

    assertDuplicateFailure(assert, AnyType, {
        name: 'test',
        group: new mongoose.Types.ObjectId,
        age: 42,
        date: new Date,
        blob: new Buffer('abc'),
        isVerified: false,
        list: [1, 2, 3]
    });
});
