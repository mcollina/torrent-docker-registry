
'use strict';

var torrents  = require('torrent-stream')
var path      = require('path')

function share(torrent, torrentFile, port, cb) {
  var engine = torrents(torrent, {
      tracker: false
    , dht: false
    , path: path.dirname(torrentFile)
  })

  engine.files.forEach(function(f) {
    f.select()
  })

  engine.listen(port, function() {
    cb(null, engine)
  })

  engine.on('peer', function() {
    console.log('new peer!')
  })

  return engine
}

module.exports = share
