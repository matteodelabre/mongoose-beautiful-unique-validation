# mongoose-beautiful-unique-validation

Plugin for Mongoose that turns duplicate errors into regular Mongoose validation errors.

[![npm version](https://img.shields.io/npm/v/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-beautiful-unique-validation)
[![npm downloads](https://img.shields.io/npm/dm/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-beautiful-unique-validation)
[![build status](https://img.shields.io/travis/matteodelabre/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://travis-ci.org/matteodelabre/mongoose-beautiful-unique-validation)
[![dependencies status](http://img.shields.io/david/matteodelabre/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://david-dm.org/matteodelabre/mongoose-beautiful-unique-validation)

Mongoose's unique constraint actually relies on MongoDB's `unique` indexes. It means that, if you have a schema like that one:

```js
mongoose.Schema({
    name: {
        type: String,
        unique: true
    }
});
```

Unique constraint failures will be reported with this kind of error:

```json
{
    "name": "MongoError",
    "message": "insertDocument :: caused by :: 11000 E11000 duplicate key error index: example.users.$name_1 dup key: { : \"John\" }",
    "index": 0,
    "code": 11000,
    "errmsg": "insertDocument :: caused by :: 11000 E11000 duplicate key error index: example.users.$name_1 dup key: { : \"John\" }"
}
```

This is not the same kind of error as normal [Validation](http://mongoosejs.com/docs/validation.html)
errors: it will introduce more checks in your code if you want to handle them.
This plugin solves this problem by converting uniqueness errors (E11000 and E11001) into regular Validation errors.

```json
{
    "name": "ValidationError",
    "message": "Model validation failed",
    "errors": {
        "name": {
            "name":"ValidatorError",
            "properties": {
                "type": "Duplicate value",
                "message": "Custom error message",
                "path": "name",
                "value": "John"
            },
            "message": "Custom error message",
            "kind": "Duplicate value",
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

## Example

```js
let beautifyUnique = require('mongoose-beautiful-unique-validation');
let userSchema = mongoose.Schema({
    name: {
        type: String,
        // this will be the uniqueness error message
        // leave it to "true" to keep the default one:
        unique: 'Two users cannot share the same username'
    }
});

// enables beautifying
userSchema.plugin(beautifyUnique);

// let's create two conflicting documents
let User = mongoose.model('Model', userSchema);
let admin1 = new User({
    name: 'admin'
});

let admin2 = new User({
    name: 'admin'
});

admin1.save()
    .then(() => console.log('Success saving admin1!'))
    .catch(err => console.error('admin1 could not be saved: ', err));

admin2.save()
    .then(() => console.log('Success saving admin2!'))
    .catch(err => console.error('admin2 could not be saved: ', err));

// will print:
// Success saving admin1!
// admin2 could not be saved: [ValidationError: User validation failed]
```

## Usage

Schemata that will produce beautified errors need to be plugged
in with this module using the `.plugin()` method.

**You need to plug in this module after declaring all
indexes on the schema, otherwise they will not be beautified.**

By default, the `ValidatorError` message will be
`Validator failed for path xxx with value xxx`.
If you want to override it, add your custom message in the `unique` field (instead of `true`),
during the schema's creation.

This plugin overrides the `.save()` method to add beautifying
behavior. If you do not want it, you can pass the
`beautifyUnique` option to `false`:

```js
document.save({
    beautifyUnique: false
}).then(() => {
    // stuff
});
```

## Contributing

Check out the [contribution guide.](https://github.com/matteodelabre/mongoose-beautiful-unique-validation/blob/master/CONTRIBUTING.md)

## License

See the [LICENSE.](https://github.com/matteodelabre/mongoose-beautiful-unique-validation/blob/master/LICENSE)
