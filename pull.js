
var torrents  = require('torrent-stream')
var fs        = require('fs')
var spawn     = require('child_process').spawn
var request   = require('request')
var msgpack   = require('msgpack5')()

process.stdout.setMaxListeners(100)
process.stderr.setMaxListeners(100)

function load(file, cb) {
  var child = spawn('docker', ['load'], { stdio: 'pipe' })
  var dest = child.stdin

  console.log('downloading', file.name)

  file.createReadStream()
      .pipe(dest)

  child.stdout.pipe(process.stdout, { end: false })
  child.stderr.pipe(process.stderr, { end: false })

  child.on('exit', function() {
    console.log('completed', file.name)
    cb()
  })
}


function startEngines(torrent, seed) {
  var engine  = torrents(torrent, {
      dht: false
    , tracker: false
  })

  engine.files.forEach(function(f) {
    f.select()
  })

  engine.connect(seed)

  engine.listen()

  return engine;
}

function multiPull(data, seed, cb) {
  var torrents = msgpack.decode(data).torrents
  var engines  = torrents.map(function(torrent) {
    return startEngines(torrent, seed)
  })


  function pull() {
    var engine = engines.shift()
    if (engine)
      load(engine.files[0], pull)
    else
      cb()
  }

  pull()
}

function pullFile(file, seed, cb) {
  fs.readFile(file, function(err, data) {
    if (err) return cb(err)
    multiPull(data, seed, cb)
  })
}

function pullHttp(url, seed, cb) {
  request(url, { encoding: null }, function(err, response, body) {
    if (err) return cb(err)
    multiPull(body, seed, cb)
  })
}

function pull(opts, cb) {
  var torrents = opts._.shift()
  var func     = pullFile

  if (!opts.seed)
    return cb(new Error('missing seed option'))

  if (torrents.match(/^http/))
    func = pullHttp

  return func(torrents, opts.seed, cb)
}

module.exports = pull
