/* eslint-env node */
/* eslint-disable no-console */
const http = require( "http" ),
  url = require( "url" ),
  path = require( "path" ),
  mime = require( "mime" ),
  fs = require( "fs" ),
  SocketIOFileUploadServer = require( "./socketio-file-upload" ),
  socketio = require( "socket.io" ),
  express = require( "express" ),
  redis = require( "redis" ),
  dl = require( 'datalib' );

const redisOptions = {
  port: 6379,
  host: 'redis',
  detect_buffers: true,
  socket_keepalive: true
};

const redisClient = redis.createClient( redisOptions );

redisClient.on( "error", function ( error ) {
  console.error( error );
} );

let app,
  io;
// Simple Static File Server.  Used under the terms of the BSD license.
//   http://classes.engineering.wustl.edu/cse330/index.php/Node.JS
app = http.createServer( function ( req, resp ) {
  var filename = path.join( __dirname, "public", url.parse( req.url ).pathname );
  ( fs.exists || path.exists )( filename, function ( exists ) {
    if ( exists ) {
      fs.readFile( filename, function ( err, data ) {
        if ( err ) {
          // File exists but is not readable (permissions issue?)
          resp.writeHead( 500, { "Content-Type": "text/plain" } );
          resp.write( "Internal server error: could not read file" );
          resp.end();
          return;
        }
        // File exists and is readable
        var mimetype = mime.lookup( filename );
        resp.writeHead( 200, { "Content-Type": mimetype } );
        resp.write( data );
        resp.end();
        return;
      } );
    }
  } );
} );
//app.listen(3456);
//io = socketio.listen(app);
//SocketIOFileUploadServer.listen(app);
app = express()
  .use( SocketIOFileUploadServer.router )
  .use( express.static( __dirname + "/out" ) )
  .use( express.static( __dirname + "/public" ) )
  .listen( 8089 );

io = socketio( app );

io.on( "connection", function ( socket ) {
  var siofuServer = new SocketIOFileUploadServer();
  socket.on( 'redisCodes', function ( data ) {
    let code_list = data[ 'data' ];
    for ( code in code_list ) {
      readRedisData( socket, redisClient, code_list[code], data['freq'], data[ 'intervalSec' ] );
    }
  } )
  siofuServer.on( "saved", function ( event ) {
    console.log( event.file );
    event.file.clientDetail.base = event.file.base;
    readCSVData( socket );
  } );
  siofuServer.on( "error", function ( data ) {
    console.log( "Error: " + data.memo );
    console.log( data.error );
  } );
  siofuServer.on( "start", function ( event ) {
    if ( /\.exe$/.test( event.file.name ) ) {
      console.log( "Aborting: " + event.file.id );
      siofuServer.abort( event.file.id, socket );
    }
  } );
  siofuServer.dir = "uploads";
  siofuServer.maxFileSize = 200000000;
  siofuServer.listen( socket );
} );
function readCSVData( socket ) {
  let data = dl.csv( __dirname + '/uploads' + '/temp.csv', {
    parse: {
      'datetime': 'string',
      'code': 'string',
      'name': 'string',
      'open': 'number',
      'high': 'number',
      'low': 'number',
      'close': 'number',
      'vol': 'number'
    }
  } );
  let groupdata = dl
    .groupby( 'code' )
    .execute( data );
  let code_list = [],
    intervalSec = 5000;
  for ( let i = 0; i < groupdata.length; i++ ) {
    code_list.push( groupdata[ i ].code )
  };

  socket.emit( 'code_list', { data: code_list } );
  socket.on( 'intervalSec', function ( data ) {
    intervalSec = data[ 'data' ];
    for ( code in code_list ) {
      send_data( socket, code_list[code], groupdata[ code ].values, intervalSec );
    }
  } );
}
function readRedisData( socket, redisClient, code, freq, intervalSec ) {
  redisClient.get( 'history_' + code + '_' + freq, function ( err, reply ) {
    if ( reply === null ) {
      console.log( `${ code } did not has any data` )
    } else {
      reply = JSON.parse( reply )
      let name = Object
        .keys( reply )
        .includes( 'name' )
          ? code + ' ' + reply.name[ 0 ]
          : code;
      let i = 0;
      let intervalID = setInterval( function () {
        if ( i === [...Object.keys( reply.datetime )].length ) {
          clearInterval( intervalID );
        } else {
          socket.emit( code, {
            data: {
              datetime: reply.datetime[i],
              open: reply.open[i],
              high: reply.high[i],
              low: reply.low[i],
              close: reply.close[i],
              vol: reply.vol[ i ]
            },
            code: name //reply.code[i] + ' ' + reply.name[i]
          } );
          i += 1;
        }
      }, intervalSec )
    }
  } )
}
function send_data( socket, code, data, intervalSec ) {
  let name = Object
    .keys( data[ 0 ] )
    .includes( 'name' )
      ? code + ' ' + data[ 0 ].name
      : code;
  let i = 0;
  let intervalID = setInterval( function () {
    if ( i === data.length ) { //data[ i ].datetime === null ||
      clearInterval( intervalID );
    } else {
      socket.emit( code, {
        data: data[i],
        code: name
      } );
      i += 1;
    }
  }, intervalSec );
}
