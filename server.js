var express = require('express'),
  app = express(),
  port = process.env.PORT || 3000,
  bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var routes = require('./api/routes/ChatBotRoutes');
routes(app);

app.use(function(req, res) {
  res.status(404).send("")
});

app.listen(port);

console.log('ChatBot RESTful API server started on: ' + port);