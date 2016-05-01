# Changelog

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

