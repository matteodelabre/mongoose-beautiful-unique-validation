# mongoose-beautiful-unique-validation

Plugin for Mongoose that turns duplicate errors into regular Mongoose validation errors.

[![npm version](https://img.shields.io/npm/v/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-beautiful-unique-validation)
[![npm downloads](https://img.shields.io/npm/dm/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-beautiful-unique-validation)
[![build status](https://img.shields.io/travis/matteodelabre/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://travis-ci.org/matteodelabre/mongoose-beautiful-unique-validation)
[![dependencies status](http://img.shields.io/david/matteodelabre/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://david-dm.org/matteodelabre/mongoose-beautiful-unique-validation)

Mongoose's unicity constraint actually relies on MongoDB's `unique` indexes. It means that, if you have a schema like this one:

```js
mongoose.Schema({
    name: {
        type: String,
        unique: true
    }
});
```

Duplicates will be reported with a driver-level error of this kind:

```json
{
    "name": "MongoError",
    "message": "insertDocument :: caused by :: 11000 E11000 duplicate key error index: example.users.$name_1 dup key: { : \"John\" }",
    "index": 0,
    "code": 11000,
    "errmsg": "insertDocument :: caused by :: 11000 E11000 duplicate key error index: example.users.$name_1 dup key: { : \"John\" }"
}
```

Because these errors are not of the same kind as normal [Validation](http://mongoosejs.com/docs/validation.html) errors, you need to handle them as a special case that complicates the validation logic and leaves room for bugs. This plugin solves this problem by turning driver-level duplicate errors (E11000 and E11001) into regular Validation errors.

```json
{
    "name": "ValidationError",
    "message": "Model validation failed",
    "errors": {
        "name": {
            "name":"ValidatorError",
            "kind": "unique",
            "message": "Path `name` (John) is not unique.",
            "path": "name",
            "value": "John"
        }
    }
}
```

## Install

```sh
npm install --save mongoose-beautiful-unique-validation
```

### Supported versions of Mongoose

Starting from version 7.0.0, this module only supports Mongoose 4.11.4 and upper. Usage with older Mongoose versions might work, but is not supported. If we need to use outdated versions of Mongoose, use older versions of this package as documented in the table below.

_Note that only security fixes will be backported to older versions._

| This package’s version | Supported Mongoose versions |
| ----------------------:|:--------------------------- |
|                      7 | ≥ 4.11.4                    |
|                   5, 6 | ≥ 4.5.0                     |
|             1, 2, 3, 4 | ≥ 4.0.0                     |

### Supported versions of Node

This module currently supports Node.js 4, 5, 6, 7 and 8. If you find a bug while using one of these versions, please [fill a bug report!](https://github.com/matteodelabre/mongoose-beautiful-unique-validation/issues/new)

## Example

### Saving a duplicate document

```js
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const userSchema = mongoose.Schema({
    name: {
        type: String,

        // This value can either be `true` to use the default error
        // message or a non-empty string to use a custom one.
        // See `Usage` below for more on error messages.
        unique: 'Two users cannot share the same username ({VALUE})'
    }
});

// Enable beautifying on this schema
userSchema.plugin(beautifyUnique);

const User = mongoose.model('Model', userSchema);

// Wait for the indexes to be created before creating any document
User.on('index', err => {
    if (err) {
        console.error('Indexes could not be created:', err);
        return;
    }

    // Create two conflicting documents
    const admin1 = new User({
        name: 'admin'
    });

    const admin2 = new User({
        name: 'admin'
    });

    admin1.save()
        .then(() => console.log('Success saving admin1!'))
        .catch(err => console.error('admin1 could not be saved: ', err));

    admin2.save()
        .then(() => console.log('Success saving admin2!'))
        .catch(err => console.error('admin2 could not be saved: ', err));
});

// Will print:
// Success saving admin1!
// admin2 could not be saved: [ValidationError: User validation failed]
```

### Updating a document to be a duplicate

```js
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const userSchema = mongoose.Schema({
    name: {
        type: String,
        unique: 'Two users cannot share the same username ({VALUE})'
    }
});

userSchema.plugin(beautifyUnique);
const User = mongoose.model('Model', userSchema);

User.on('index', err => {
    if (err) {
        console.error('Indexes could not be created:', err);
        return;
    }

    // Create two distinct documents
    let admin1 = new User({
        name: 'admin1'
    });

    let admin2 = new User({
        name: 'admin2'
    });

    Promise.all([
        admin1.save(),
        admin2.save()
    ]).then(() => {
        // Try to update admin2 to be a duplicate of admin1
        admin2
            .update({
                $set: {name: 'admin1'}
            })
            .exec()
            .then(() => console.log('Success updating admin2!'))
            .catch(err => console.error('admin2 could not be updated:', err))
    }).catch(err => console.error('Could not save documents:', err));
});

// Will print:
// admin2 could not be updated: [ValidationError: User validation failed]
```

## Usage

Schemata in which this module is plugged in will produce beautified duplication errors. You can also use it as a [global plugin.](http://mongoosejs.com/docs/plugins.html#global)

**You need to plug in this module after declaring all indexes on the schema, otherwise they will not be beautified.**

The reported error has the same shape as normal validation errors. For each field that has a duplicate value, an item is added to the `errors` attribute. See examples above.

### Error messages

By default, the validation error message will be ``Path `{PATH}` ({VALUE}) is not unique.``, with `{PATH}` replaced by the name of the duplicated field and `{VALUE}` by the value that already existed.

To set a custom validation message on a particular path, add your message in the `unique` field (instead of `true`), during the schema's creation.

```diff
const userSchema = mongoose.Schema({
    name: {
        type: String,
+        unique: 'Two users cannot share the same username ({VALUE})'
-        unique: true
    }
});
```

When using the plugin globally or with a schema that has several paths with unique values, you might want to override the default message value. You can do that through the `defaultMessage` option while adding the plugin.

```js
userSchema.plugin(beautifyUnique, {
    defaultMessage: "This custom message will be used as the default"
});
```

> **Note**: Custom messages defined in the schema will always take precedence over the global default message.

## Contributions

This is free and open source software. All contributions (even small ones) are welcome. [Check out the contribution guide to get started!](CONTRIBUTING.md)

Thanks to all contributors:

* [Bohdan Tkachenko](https://github.com/BohdanTkachenko)
* [Savioo](https://github.com/Saviio)
* [Bhavik Vyas (bvyask)](https://github.com/bvyask)
* [Nick Sellen](https://github.com/nicksellen)
* [niftylettuce](https://github.com/niftylettuce)
* [David Misshula](https://github.com/misshula)
* [James Davis](https://github.com/davisjam)

## License

Released under the MIT license. [See the full license text.](https://github.com/matteodelabre/mongoose-beautiful-unique-validation/blob/master/LICENSE)
