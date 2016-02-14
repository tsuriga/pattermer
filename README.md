# REMMY

Remmy is a mass file renaming desktop program that uses regular expression
searches mapped to variables to rename files according to a given pattern.
It's useful when you find yourself often renaming a bunch of files that have or
will have similar naming patterns.

It is built using ES6 and HTML5 technologies on Electron (v0.36.5) and Photon (v0.1.2).

* [Electron](http://electron.atom.io/)
* [Photon](http://photonkit.com/)

![Remmy](remmy-screenshot.png?raw=true "Remmy")

## RUNNING THE PROGRAM ##

0. Install [NodeJS](https://nodejs.org/en/)
1. `$ npm install`
2. `$ npm start`

For usage instructions consult the program's internal Help.

## TODO / KNOWN BUGS ##

- Support for string replacement functions as variables
- Saving a preset should perhaps also save the renaming pattern
- Preset loading should display a list of the saved presets
- Add keyboard support for window closing and item deletion
- Add support for preprogrammed variables such as a numeric increment
- Notify of any unsaved changes when exiting the program
- Code cleanup & unit tests*
- The scrollbar fixes are imperfect to say the least - they only work correctly
  if there's a scrollbar for one pane.

\* It's really quick and dirty code where I just wanted to learn how things work,
  which I think is fine for a project like this. But should this grow into a
  proper program with more users than just me, the codebase definitely needs a
  rehaul for better testability and extendability.

## CHANGELOG ##

* v1.0.0 (2016-02-12): first release after alpha
* v1.0.1 (2016-02-14): usage instructions and new library name
