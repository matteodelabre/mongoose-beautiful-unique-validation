'use strict';

var test = require('tape');
var crypto = require('crypto');
var mongoose = require('mongoose');
var semver = require('semver');

var version = require('mongoose/package.json').version;

// Pass our Promise implementation
// (see http://mongoosejs.com/docs/promises.html)
mongoose.Promise = global.Promise;

// Connect to a random database
var mongouri = 'mongodb://127.0.0.1/mongoose-buv-'
    + crypto.randomBytes(8).toString('hex');

console.log('Using mongoose@' + version);
console.log('Connecting to ' + mongouri + '...');

// Pass the useMongoClient flag to mongoose versions that need it
var options = {};

if (semver.satisfies(version, '< 5.0.0')) {
    options.useMongoClient = true;
}

mongoose.connect(mongouri, options).then(function () {
    // Run tests
    require('./save');

    // clean up the test database and disconnect after all tests
    test.onFinish(function () {
        mongoose.connection.db.dropDatabase().then(function () {
            return mongoose.disconnect();
        }).catch(function (err) {
            console.error(
                'Could not clean up or disconnect from the '
                + 'test database:', err
            );
        });
    });
}).catch(function (err) {
    console.error('Could not connect to the test database:', err);
});
