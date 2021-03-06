// *******************************************
// DATABASE STUFF ****************************
// *******************************************
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
mongoose.Promise = global.Promise;

var quoteSchema = mongoose.Schema({
        content: String,
        author: String,
        index: Number
});

var quotecount;
var Quote = mongoose.model('Quote', quoteSchema)
// Find the highest quote number for creating new index
Quote.findOne().sort({"index": -1}).exec(function(err, quote){
   quotecount = quote.index;
});
// *******************************************

var Hapi = require('hapi');
var Inert = require('inert');
var Path = require('path');

var server = new Hapi.Server();
server.connection({ port: 8080 });
server.register(require('inert'), function(err) {
  
  if (err) {
    throw err;
  }
  
  // Register static path
  server.route({
    method : 'GET', path : '/demo/{path*}', handler : {
      directory : {
        path : '../static',
        listing : false,
        index : true
      }
    }
  })
});

server.route([
  // Get Quote List
  {
    method: 'GET',
    path: '/api/quotes',
    config: { json: { space: 2 } },
    handler: function(request, reply) {
   	   var result = Quote.find().sort({'index': -1}).limit(10);
   	   result.exec(function(err, quotes) {
		     reply(quotes);
	     })
    }
  },
  // Create new quote
  {
    method: 'POST',
    path: '/api/quotes',
    config: { json: { space: 2 } },
    handler: function(request, reply) {
        if(!request.payload.content) {
          return reply('Error 400: Post syntax incorrect.').code(400);
        }
        quotecount = quotecount+1; 
        var newQuote;
        if (request.payload.author) {
          newQuote = new Quote({'content': request.payload.content, 'author': request.payload.author, 'index': quotecount});
        } else {
          newQuote = new Quote({'content': request.payload.content, 'index': quotecount});
        }
        newQuote.save(function (err, newQuote) {
          if (err) return console.error(err);
          reply({"index":quotecount}).code(201);
        });
    }
  },
  // Random quote
  {
    method: 'GET',
    path: '/api/quotes/random',
    config: { json: { space: 2 } },
    handler: function(request, reply) {
      var random = Math.floor(Math.random() * quotecount);
      var result = Quote.findOne({"index":random});
      result.exec(function(err, quote) {
        reply(quote);
      });
    }
  },

  // Get single quote
  {
    method: 'GET',
    path: '/api/quotes/{index}',
    config: { json: { space: 2 } },
    handler: function(request, reply) {
      var result = Quote.findOne({"index":request.params.index});
      result.exec(function(err, quote) {
        reply(quote);
      });
    }
  },
  // Update existing quote
  {
    method: 'PUT',
    path: '/api/quotes/{index}',
    config: { json: { space: 2 } },
    handler: function(request, reply) {
        if((!request.payload.content) && (!request.payload.author)) {
          return reply('Error 400: Post syntax incorrect.').code(400);
        }
        var query = {'index':request.params.index};
        var newQuote = new Quote();
        if (request.payload.author) {
         newQuote.author = request.payload.author;
        };
        if (request.payload.content) {
         newQuote.content = request.payload.content;
        };
        var upsertData = newQuote.toObject();
        delete upsertData._id;
        Quote.findOneAndUpdate(query, upsertData, {upsert:true}, function(err, doc){
          if (err)  {
            return reply({ error: err }).code(500);
          }
          return reply({"index":request.params.index}).code(201);
        });
    }
  },
  // Delete existing quote
  {
    method: 'DELETE',
    path: '/api/quotes/{index}',
    handler: function(request, reply) {
        Quote.findOneAndRemove({"index":request.params.index},
          function (err, result) {
            if (!err) {
	            reply().code(204)
            }
        });
     }
  },
  {
    method: 'GET',
    path: '/',
    handler: function(request, reply) {
      reply('Hello world from hapi');
    }
  }
]);

server.start(function() {
  console.log('Hapi is listening to http://localhost:8080');
});
