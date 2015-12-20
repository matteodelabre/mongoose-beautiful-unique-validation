# mongoose-beautiful-unique-validation

Plugin for Mongoose that turns duplicate errors into regular Mongoose validation errors.

[![npm version](https://img.shields.io/npm/v/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-beautiful-unique-validation)
[![npm downloads](https://img.shields.io/npm/dm/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-beautiful-unique-validation)
[![build status](https://img.shields.io/travis/matteodelabre/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://travis-ci.org/matteodelabre/mongoose-beautiful-unique-validation)
[![dependencies status](http://img.shields.io/david/matteodelabre/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://david-dm.org/matteodelabre/mongoose-beautiful-unique-validation)

Mongoose's unique constraint actually relies on MongoDB's `unique` field
property. It means that, if you have a schema like that one:

```js
var userSchema = mongoose.Schema({
    name: {
        type: String,
        unique: true
    }
});
```

Unique constraint failures will look like this:

```json
{
    "name": "MongoError",
    "message": "E11000 duplicate key error index: example.users.$name_1 dup key: { : \"John\" }",
    "index": 0,
    "code": 11000,
    "errmsg": "E11000 duplicate key error index: example.users.$name_1 dup key: { : \"John\" }"
}
```

This doesn't look like normal
[Validator](http://mongoosejs.com/docs/validation.html)
errors. While this might be suitable in most cases,
[there are times where you just want to have a consistent output from the .save() method](https://github.com/Automattic/mongoose/issues/2284).

This plugin will turn unique errors (E11000 and E11001) into
[Validator](http://mongoosejs.com/docs/validation.html) errors:

```json
{
    "name": "ValidationError",
    "message": "Validation failed",
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

## Usage

Just use this as a Mongoose plugin on your schema.
Taking the previous example:

```js
var userSchema = mongoose.Schema({
    name: {
        type: String,
        unique: true
    }
});

userSchema.plugin(require('mongoose-beautiful-unique-validation'));
```

You also need to use `.trySave()` instead of `.save()` when
persisting a model to the database. This ensures that this behaviour
is not triggered where it is not expected to.

If you need to customize the error message, use the
`unique` field as you would with another constraint:

```js
var userSchema = mongoose.Schema({
    name: {
        type: String,
        unique: 'Custom error message'
    }
});

userSchema.plugin(require('mongoose-beautiful-unique-validation'));
```

## Contributing

Check out the [contribution guide.](https://github.com/matteodelabre/blob/master/CONTRIBUTING.md)

## License

See the [LICENSE.](https://github.com/matteodelabre/blob/master/LICENSE)
