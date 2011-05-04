var express = require("express")
var players = [];
var waiting = [];
var waiting_for_play = [];
var waiting_for_finish = [];
var MODE_WAITING = 0;
var MODE_INTERACTIVE = 1;
var MODE_PLAY = 2;
var mode = MODE_WAITING;

var Player = function(client) {
  var that = {
    x: Math.random() * 80,
    y: Math.random() * 60,
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
  

var sendPlayers = function(client) {
  
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
  for(i=0;i<players.length;i++) {
    if (players[i].client === client) {
      players.splice(i, 1);
      sendPlayers(client);
      break;
    }
  }  
});

var queuePlayers = function() {
  var dest = [];
  players.forEach(function(e) {
    dest.push(e);
  });
  return(dest);
};

var sendStart = function() {
  // console.log("Go!", socket.clients);
  console.log("Sending Start");
  socket.broadcast({command: "start"});
  mode = MODE_INTERACTIVE;
  // is there a faster way to clone an array?
  console.log(players);
  waiting_for_play = queuePlayers();
  console.log(waiting_for_play);
};

var dequeueWaitingPlayers = function() {
  console.log("Dequeing", waiting.length);
  var len = waiting.length;
  for(i=0;i<len;i++) {
    players.push(waiting.pop());
  }
  console.log("Now in players:", players);
};

var checkStartCondition = function() {
  if (mode !== MODE_WAITING) return;
  if (players.length + waiting.length >= 2) {
    dequeueWaitingPlayers();
    sendStart();
  }
};

socket.on('connection', function(client){
  waiting.push(Player(client));
  
  checkStartCondition();
  
  client.on('message', function(message) {
    console.log("Message", message);
    if (message.command === 'hello') {
      console.log("Got Hello from " + client);
      client.send({command: "hello", you: client.sessionId})
      sendPlayers();
    } else 
    if (message.command === 'playable') {
      console.log(waiting_for_play);
      var toRemove = -1;
      for(i=0;i<waiting_for_play.length;i++) {
        if (waiting_for_play[i].client.sessionId === client.sessionId) {
          toRemove = i;
          break;
        }
      }
      console.log(toRemove);
      if (toRemove >= 0) waiting_for_play.splice(toRemove, 1);
      console.log("waiting_for_play", waiting_for_play.length);
      if (waiting_for_play.length === 0) {
        mode = MODE_PLAY;
        socket.broadcast({command: 'play'});
        waiting_for_finish = queuePlayers();
      }
    } else 
    if (message.command === 'finished_play') {
      var toRemove = -1;
      for(i=0;i<waiting_for_finish.length;i++) {
        if (waiting_for_finish[i].client.sessionId === client.sessionId) {
          toRemove = i;
          break;
        }
      }
      console.log(toRemove);
      if (toRemove >= 0) waiting_for_finish.splice(toRemove, 1);
      console.log("waiting_for_finish", waiting_for_finish.length);
      if (waiting_for_finish.length === 0) {
        mode = MODE_INTERACTIVE;
        socket.broadcast({command: 'start'});
        waiting_for_play = queuePlayers();
      }
      
    } else 
    if (message.command === 'position') {
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