var express = require("express")
var players = [];

var Player = function(client) {
  var that = {
    x: 0,
    y: 0,
    client: client,
    asJson: function() {
      return ({
        x: this.x,
        y: this.y,
        sessionId: this.client.sessionId,
      });
    }
  };
  return that;
};

var app = express.createServer(); 
app.use(express.static(__dirname + '/public'));
//app.use(express.logger());
app.get('/', function(req, res){ 
   res.send('Hello World'); 
}); 
app.listen(3000); 
  

var sendPlayers = function() {
  
  jsonPlayers = [];
  
  for(i=0;i<players.length;i++) {
    jsonPlayers.push(players[i].asJson());
  }
  
  for(i=0;i<players.length;i++) {
    players[i].client.send({command: 'players', players: jsonPlayers});
  }
}

var io = require('socket.io'); 
var socket = io.listen(app); 
socket.on('clientDisconnect', function(client) {
  console.log("Disconnected:", client);
  for(i=0;i<players.length;i++) {
    if (players[i].client === client) {
      players.splice(i, 1);
      sendPlayers();
      break;
    }
  }  
});


socket.on('connection', function(client){
  players.push(Player(client));
  client.on('message', function(message) {
    console.log("Message", message);
    if (message.command === 'hello') {
      console.log("Got Hello from " + client);
      sendPlayers();
    } else if (message.command === 'position') {
      for(i=0;i<players.length;i++) {
        if (players[i].client === client) {
          players[i].x = message.x;
          players[i].y = message.y;
          break;
        }
      }
      sendPlayers();
    } else {
      console.log("UNKNOWN message", message);
    }
  });  
});