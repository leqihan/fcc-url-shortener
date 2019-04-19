'use strict';

var express = require('express');
var mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');



var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});
app.use(cors());

const Schema = mongoose.Schema;

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


const linkSchema = new Schema({
  url: String,
  seq: Number
});
const Link = mongoose.model('Link', linkSchema);

app.post('/api/shorturl/new', (req, res) => {
  let url = req.body.url;
  let re = /^https?:\/\/(?<domain>[a-z\d-\.]+).*$/i;
  
  if(re.test(url)) {
    dns.lookup(url.match(re).groups.domain, (err, addr) => {
      if (err) {
        res.json({err: 'Invalid Hostname'});
      } else {
        // check the url is already in db
        Link.findOne({url: url}, (err, link) => {
          if (link === null) {
            // create new link from last seq
            Link.findOne({}).sort({'$natural': 'desc'}).exec((err, link) => {
              console.log(err, link);
              if (link) {
                let newLink = new Link({url: url, seq: link.seq + 1});
                newLink.save((err, data) => {
                  if (err) {
                    res.json({err: err});
                  } else {
                    res.json({original_url: data.url, short_url: data.seq});
                  }
                });
              } else {
                // there're no links in the db, init one from seq: 1
                let newLink = new Link({url: url, seq: 1});
                newLink.save((err, data) => {
                  if (err) {
                    res.json({err: err});
                  } else {
                    res.json({original_url: data.url, short_url: data.seq});
                  }
                });
              }
            });
          } else {
            res.json({original_url: link.url, short_url: link.seq});
          }
        });
        
            
      }
    });
  } else {
    res.json({error: 'Invalid URL'});
  }
});


app.get('/api/shorturl/:urlId?', (req, res) => {
  let id = req.params.urlId;
  Link.findOne({seq: id}, (err, link) => {
    if (link) {
      res.redirect(link.url);
    } else {
      res.json({"error":"No short url found for given input"});
    }
  });
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});