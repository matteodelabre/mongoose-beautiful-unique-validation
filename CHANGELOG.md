# Changelog

## v5.1.1

### Fixed bugs

* Fixed a bug where all fields of a Schema are reported as duplicated
even when only some of them are (bug #29).

## v5.1.0

### New features

* Also works with `#findOneAndUpdate` (but does not provide failing paths info).

## v5.0.1

### Fixed bugs

* Remove unwanted logging statement.
* Throw an error if this module is used with an outdated Mongoose version.

## v5.0.0

### Breaking changes

* Beautifies the errors using an error middleware instead of overriding
the `#save()` method. **Only supports Mongoose 4.5.0 and onwards.**

* Because `#save()` is not overriden anymore, the `beautifyUnique` option
is now ignored. To remove the beautifying behavior, remove the plugin.

### New features

* Also works on all other ways of saving models, not only `#save()`
(including `Model.create()`).

## v4.0.0

### Breaking changes

* Beautifies any kind of Mongoose field instead of passing
along the original error when working with `ObjectId`s, `Buffer`s
and `Date`s.

* The `trySave()` method, deprecated in v3.0.0, is removed.

## v3.0.2

### Fixed bugs

* Abandon parsing duplicated values using regexes and use
JSON.parse for a more robust result. This allows duplicated
values that contain spaces.

## v3.0.1

### Fixed bugs

* Throw a more meaningful error when the message from MongoDB
cannot be parsed correctly.

* Fix the parsing regex to allow fields containing whitespace.

## v3.0.0

### Breaking changes

* The `trySave()` method has been renamed to `save()`. This
shadows the original `save()` method provided by Mongoose, only
on models that are plugged in.

### New features

* `save()` now accepts an optional hash as its first argument
that mirrors Mongoose's `save()` options.

* To disable the beautifying behavior, you can set
the `beautifyUnique` option to `false`.

### Fixed bugs

* Some incompatibilities with various MongoDB versions have been
fixed. Refer to #13, #14 for more information.
