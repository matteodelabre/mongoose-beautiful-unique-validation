'use strict';

var test = require('tape');
var crypto = require('crypto');
var mongoose = require('mongoose');

// Pass our Promise implementation
// (see http://mongoosejs.com/docs/promises.html)
mongoose.Promise = global.Promise;

// Connect to a random database
var mongouri = 'mongodb://127.0.0.1/mongoose-buv-'
    + crypto.randomBytes(8).toString('hex');

console.log('Connecting to ' + mongouri + '...');

mongoose.connect(mongouri, {useMongoClient: true}).then(function () {
    // Run tests
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
