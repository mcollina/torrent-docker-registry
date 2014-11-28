#! /usr/bin/env node

'use strict';

var commist = require('commist')
var registry = require('./registry')
var pull = require('./pull')
var fs = require('fs')
var path = require('path')

function cli(args) {
  var program = commist()

  program.register('registry', registry)
  program.register('pull', function(opts) {
    pull(opts, function(err) {
      if (err) {
        console.log(err)
        process.exit(1)
      }
      if (!opts.keep) {
        process.exit(0)
      }
    })
  })

  return program.parse(args)
}

if (require.main === module) {
  var remaining = cli(process.argv.splice(2))

  if (remaining) {
    fs.createReadStream(path.join(__dirname, 'docs', 'help.txt'))
      .pipe(process.stdout)
  }
}

module.exports = {
    pull: pull
  , registry: registry
  , cli: cli
}
