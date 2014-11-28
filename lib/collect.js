
'use strict';

var fs    = require('fs')
var path  = require('path')

function _collect(acc, folder, registry, image, cb) {
  fs.readFile(path.join(folder, image.id + '.torrent'), function(err, data) {
    if (err) return cb(err)

    acc.unshift(data)

    if (!image.parent) return cb(err, acc)

    registry.get(image.parent, function(err, image) {
      _collect(acc, folder, registry, image, cb)
    })
  })
}

function collect(folder, registry, image, cb) {
  _collect([], folder, registry, image, cb)
}

module.exports = collect
