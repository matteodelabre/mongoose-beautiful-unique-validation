'use strict';

var test = require('tape');
var crypto = require('crypto');
var mongoose = require('mongoose');
var Promise = require('promise');

// pass our Promise implementation
// (see http://mongoosejs.com/docs/promises.html)
mongoose.Promise = Promise;

mongoose.connect(
    'mongodb://127.0.0.1/mongoose-buv-' +
    crypto.randomBytes(8).toString('hex')
).then(function () {
    // run tests
    require('./save');

    // clean up the test database and disconnect after all tests
    test.onFinish(function () {
        mongoose.connection.db.dropDatabase().then(function () {
            return mongoose.disconnect();
        }).catch(function (err) {
            console.error(
                'Could not clean up or disconnect from the ' +
                'test database:', err
            );
        });
    });
}).catch(function (err) {
    console.error('Could not connect to the test database:', err);
});
