
'use strict';

var docker  = require('docker-registry-server')
var debug   = require('debug')('dolphin')
var path    = require('path')
var mkdirp  = require('mkdirp')
var fs      = require('fs')
var build   = require('./lib/build')
var share   = require('./lib/share')
var collect = require('./lib/collect')
var msgpack = require('msgpack5')()

function registry(opts) {
  var registryPort    = opts.registryPort || opts.r || 8042
  var ip              = opts.ip || opts.i || '127.0.0.1'
  var torrentPort     = opts.torrentPort || opts.e || 8881
  var root            = opts.path || opts.p || path.join(process.cwd(), 'dolphin')
  var torrents        = path.join(root, 'torrents')

  mkdirp.sync(root)

  var registry        = docker({ dir: root })

  registry.client.on('image', onImage)

  registry.listen(registryPort, function() {
    console.log('registry started on port', registryPort)
  })

  registry.get('/v1/images/{id}/torrents', function(req, res) {
    registry.client.get(req.params.id, function(err, image, metadata) {
      if (err) return res.error(err)
      collect(torrents, registry.client, image, function(err, torrents) {
        if (err) return res.error(err)

        res.end(msgpack.encode({
            id: image
          , torrents: torrents
        }).slice(0))
      })
    })
  })

  fs.readdir(torrents, function(err, files) {
    // there is no torrent folder yet, so swallow
    if (err)  return

    files.forEach(function(file) {
      if (!file.match(/\.torrent$/)) return ;
      var fullpath = path.join(torrents, file)
      fs.readFile(fullpath, function(err, torrent) {
        share(torrent, fullpath, torrentPort, function(err) {
          if (err) throw err
          debug('sharing layer', file.replace('.torrent', ''))
        })
      })
    })
  })

  return registry

  function onImage(id, data) {
    function onLayer(layerId) {
      if (layerId === id) {
        buildAndShare(data, function(err) {
          if (err) {
            // unable to deal with this
            return registry.emit('error', err)
          }

          registry.client.removeListener('layer', onLayer)
        })
      }
    }
    registry.client.on('layer', onLayer)
  }

  function buildAndShare(data, cb) {
    build(this, root, data, function(err, torrent, torrentFile) {
      if (err) {
        // unable to deal with this
        return registry.emit('error', err)
      }

      share(torrent, torrentFile, torrentPort, function(err) {
        debug('sharing layer', data.id)
        cb(err)
      })
    })
  }
}

module.exports = registry
