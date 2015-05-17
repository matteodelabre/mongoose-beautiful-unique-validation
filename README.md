# mongoose-beautiful-unique-validation

A [Mongoose](https://github.com/Automattic/mongoose) plugin that beautifies
errors that are triggered on duplicate insertion.

Mongoose allows you to define an unique index on a Schema's path, like this:

```js
var userSchema = mongoose.Schema({
    name: {
        type: String,
        unique: true
    }
});
```

So that you don't end up with two users that have the same name.
However, the error that shows up when you try to save a duplicate
model is not really beautiful:

```json
{
    "name": "MongoError",
    "message": "E11000 duplicate key error index: example.users.$name_1 dup key: { : \"John\" }",
    "index": 0,
    "code": 11000,
    "errmsg": "E11000 duplicate key error index: example.users.$name_1 dup key: { : \"John\" }"
}
```

This plugin will turn these errors into standard Validator errors:

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

See [Mongoose Validation](http://mongoosejs.com/docs/validation.html)
for more information about validation errors.

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

You also need to use the `.trySave()` method instead of
the `.save()` one. The former will beautify the errors, leaving the
default method alone.

If you want to customize the error message, just use the
`unique` field as you would with the `required` validator:

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