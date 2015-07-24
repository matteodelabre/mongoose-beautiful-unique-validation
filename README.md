# mongoose-beautiful-unique-validation

Plugin for Mongoose that turns duplicate errors into regular Mongoose validation errors.

[![npm version](https://img.shields.io/npm/v/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-beautiful-unique-validation)
[![npm downloads](https://img.shields.io/npm/dm/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-beautiful-unique-validation)
[![build status](https://img.shields.io/travis/MattouFP/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://travis-ci.org/MattouFP/mongoose-beautiful-unique-validation)
[![dependencies status](http://img.shields.io/david/mattoufp/mongoose-beautiful-unique-validation.svg?style=flat-square)](https://david-dm.org/MattouFP/mongoose-beautiful-unique-validation)

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

All contributions are welcome!
In order to have a consistent repo, we however ask you
to comply to the following conventions
whenever possible.

### 1. Commit tags

All commits should be tagged with emojis to make
the commit list more readable.

| Emoji      | Commit content        |
|:----------:|:--------------------- |
| :book:     | Documentation updates |
| :bug:      | Bug fixes             |
| :ledger:   | Rename/move files     |
| :bulb:     | Features              |
| :lipstick: | Fix coding style      |

### 2. Branches

Please use a branch name that differs from `master` whenever possible,
when making pull requests, so that the network history is more
readable.

For example, if you wanted to fix the issue
"improve documentation", you could have
chosen the following branch name: `improve-docs`.

### 3. Coding style

Javascript can be authored by following
[a](https://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
[lot](https://github.com/airbnb/javascript)
[of](https://github.com/felixge/node-style-guide)
[different](https://contribute.jquery.org/style-guide/js/)
[style guides](https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Coding_Style)
but we decided to be a bit soft on that.

Just follow the conventions that are encoded into the `.eslintrc`
configuration file. By the way, be sure to [check out ESLint](http://eslint.org/),
which is a great toolable style checker.

* Use the radix parameter in `parseInt()` calls.
* Declare all your variables at the top of the functions.
* Use the *one true brace style*.
* Put one space after commas, and no space before.
* Put your comma at the end of the lines.
* Use simple quotes.
* Use camelcase.
* Use 4 spaces for indentation.

## License

See LICENSE.
