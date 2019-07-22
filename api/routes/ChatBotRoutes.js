'use strict';
module.exports = function(app) {
  var chatBot = require('../controllers/ChatBotController');

  app.route('/webhook')
    .get(chatBot.webhook)
    .post(chatBot.webhook);
};