
'use strict';

var create    = require('create-torrent')
var tar       = require('tar-fs')
var path      = require('path')
var fs        = require('fs')
var rimraf    = require('rimraf')
var mkdirp    = require('mkdirp')
var async     = require('async')

function build(registry, folder, image, cb) {
  var workdir     = path.join(folder, 'torrents', image.id)
  var tarfile     = workdir + '.tar'
  var srcLayer    = path.join(folder, 'layers', image.id)
  var destLayer   = path.join(workdir, 'layer.tar')
  var version     = path.join(workdir, 'VERSION')
  var dataFile    = path.join(workdir, 'json')
  var torrentFile = path.join(folder, 'torrents', image.id + '.torrent')
  var torrent     = null

  mkdirp(workdir, function(err) {
    if (err) return cb(err)

    fs.link(srcLayer, destLayer, function(err) {
      if (err) return cleanup(err)

      fs.writeFile(version, '1.0', function(err) {
        if (err) return cleanup(err)

        fs.writeFile(dataFile, JSON.stringify(image), function(err) {
          if (err) return cleanup(err)

          var pack = tar.pack(workdir, {
            map: function(header) {
              header.name = image.id + '/' + header.name
              return header
            }
          })

          var dest = fs.createWriteStream(tarfile)

          pack
            .pipe(dest)
            .on('finish', buildTorrent)
            .on('error', cleanup)

        })
      })
    })
  })

  function cleanup(err, a, b) {
    rimraf(workdir, function() {
      cb(err, a, b)
    })
  }

  function buildTorrent() {
    // weird hack, we need to wait node to flush
    setImmediate(function() {
      create(tarfile, { announceList: [['']]}, function(err, data) {
        if (err) return cleanup(err)

        torrent = data

        fs.writeFile(torrentFile, torrent, function(err) {
          cleanup(err, torrent, torrentFile)
        })
      })
    })
  }
}


module.exports = build
