# Contributing

Thank you for your interest in contributing to this repo!  
All contributions (even small ones) are welcome.
In order to keep this repo consistent, please
try to follow these rules.

## 1. Commit tags

All commits should be tagged with emojis whenever possible
to make the commit list more readable.

| Emoji      | Commit content        |
|:----------:|:--------------------- |
| :book:     | Documentation updates |
| :bug:      | Bug fixes             |
| :ledger:   | Moving files          |
| :bulb:     | New features          |
| :lipstick: | Fixing coding style   |

## 2. Branches

Please use a branch name that differs from `master`
when making pull requests, so that the network
history is more readable.

For example, if you wanted to fix the issue
"improve documentation", you could have
chosen the following branch name: `improve-docs`.

## 3. Coding style

Javascript can be authored by following
[a](https://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
[lot](https://github.com/airbnb/javascript)
[of](https://github.com/felixge/node-style-guide)
[different](https://contribute.jquery.org/style-guide/js/)
[style guides](https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Coding_Style)
but we decided to be a bit soft on that.

As a rule of thumb, use [ESLint](http://eslint.org/) to check if your code complies
with our style conventions. Here are some of the rules:

* use the radix parameter in `parseInt()` calls;
* use the *one true brace style;*
* put one space after commas, and no space before;
* put your comma at the end of the lines;
* use simple quotes;
* use camelcase;
* use 4 spaces for indentation.
