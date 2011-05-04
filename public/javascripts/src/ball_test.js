(function() {

  var socket = new io.Socket(); 
  socket.connect();
  socket.on('connect', function(data){ console.log("connect", data); 
    socket.send({command: 'hello'});
  }); 
  socket.on('message', function(data){ console.log("message", data); });
  socket.on('disconnect', function(){ console.log("disconnect"); socket.connect(); });


  var MODE_INTERACTIVE = 0;
  var MODE_PLAY = 1;
  var playTimer = 0;

  var SCALE = 10;
  
  var mode = MODE_INTERACTIVE;
  var ctx;
  var canvas;
  var world;
  var bodies = [];
  var ball;
  var b2Vec2 = Box2D.Common.Math.b2Vec2
    , b2BodyDef = Box2D.Dynamics.b2BodyDef
    , b2Body = Box2D.Dynamics.b2Body
    , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
    , b2Fixture = Box2D.Dynamics.b2Fixture
    , b2World = Box2D.Dynamics.b2World
    , b2MassData = Box2D.Collision.Shapes.b2MassData
    , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
    , b2DebugDraw = Box2D.Dynamics.b2DebugDraw
    ;
  
  var InitBalls = function(canvasId) {
    $("#" + canvasId).each(function() {
      canvas = this;
    });
    ctx = canvas.getContext("2d");

    
    
    world = new b2World(
         new b2Vec2(0, 0)    //gravity
      ,  true                 //allow sleep
    );
    var fixDef = new b2FixtureDef;
    fixDef.density = 1.0;
    fixDef.friction = 1.2;
    fixDef.restitution = 1;

    var bodyDef = new b2BodyDef;
    bodyDef.angularDamping = 2;


    var addPlayer = function(x,y) {
      fixDef.density = 1.0;
      bodyDef.type = b2Body.b2_dynamicBody;
      bodyDef.linearDamping = 4;
      fixDef.shape = new b2CircleShape(1);
      bodyDef.position.x = x;
      bodyDef.position.y = y;
      var body = world.CreateBody(bodyDef);
      bodies.push(body);
      body.CreateFixture(fixDef);
    };
    var addBall = function(x,y) {
      fixDef.density = 0.5;
      bodyDef.type = b2Body.b2_dynamicBody;
      bodyDef.linearDamping = 1;
      bodyDef.radialDamping = 2;
      fixDef.shape = new b2CircleShape(0.5);
      bodyDef.position.x = x;
      bodyDef.position.y = y;
      ball = world.CreateBody(bodyDef);
      //bodies.push(body);
      ball.CreateFixture(fixDef);
    };
     
    addPlayer(5,5);
    addPlayer(6,5);
    addPlayer(9,6);
    addPlayer(12,5);
    addBall(13,6)
    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(ctx);
    debugDraw.SetDrawScale(SCALE);
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    world.SetDebugDraw(debugDraw);

      
    applyReverseMagnetism = function() {
      var length = bodies.length;
      for(var i=0; i<length; i++) {
        for(var j = 0; j < length;  j++) {
          if (bodies[i] !== bodies[j]) {
            var body1 = bodies[i];
            var body2 = bodies[j];
            var diffVec = body1.GetPosition().Copy();
            diffVec.Subtract(body2.GetPosition());
            var distance = diffVec.Length();
            diffVec.Normalize();
            if (distance < 5) {
              distance = distance / 2;
              if (distance === 0) distance = 0.000001;
              diffVec.Multiply(200/(distance * distance * distance));
              body1.ApplyForce(diffVec, body2.GetPosition());
            }              
          }
        }
      }        
    };

    var last_second = 0;

    var update = function() {
      
      
      if (Math.round(playTime() / 1000))
      if (mode === MODE_PLAY) {
        applyReverseMagnetism();
        if (playTime() > 5000 && !ball.IsAwake()) {
          stop();
        }
      } else {
        var second = 5 - Math.floor(playTime() / 1000);
        if (second !== last_second) {
          $('#timer').html(second);
          last_second = second;
        }
        if (playTime() > 5000) play();
      }
      world.Step(
         1 / 60   //frame-rate
         ,  10       //velocity iterations
         ,  10       //position iterations
      );
      world.DrawDebugData();
      world.ClearForces();
      requestAnimFrame(update);
      
    };
    
    var isMoving = 0;

    var move = function(e) {
      if (mode === MODE_PLAY) return;
      var offset = $(this).offset();
      var x = e.pageX - offset.left;
      var y = e.pageY - offset.top;
      console.log(x,y);
      console.log(bodies[0]);
      bodies[0].SetPosition(new b2Vec2(x / SCALE,y / SCALE));
      sendPosition(x / SCALE, y / SCALE);
    };

    var startMove = function() {
      if (mode === MODE_PLAY) return;
      console.log("startmove");
      $(canvas).mousemove(move);
    };

    var endMove = function(e) {
      if (mode === MODE_PLAY) return;
      var offset = $(this).offset();
      var x = e.pageX - offset.left;
      var y = e.pageY - offset.top;
      $(canvas).unbind('mousemove');
      bodies[0].SetPosition(new b2Vec2(x / SCALE,y / SCALE));
      sendPosition(x / SCALE, y / SCALE);
    };
    
    var sendPosition = function(x,y) {
      socket.send({command: 'position', x: x, y: y});
    };
    
    var play = function() {
      $('#timer').html("");
      socket.send({command: 'playable'});
      
      
      console.log("PLAY");
      mode = MODE_PLAY;
      playTimer = new Date().getTime();
    };
    
    var stop = function() {
      console.log("STOP");
      mode = MODE_INTERACTIVE;
      playTimer = new Date().getTime();
    };
    
    var playTime = function() {
      return (new Date().getTime()) - playTimer;
    }

    $(canvas).mousedown(startMove).mouseup(endMove);
      
    
    stop();
    update();
    
    
  };
  

  
  
  
  $(function() {
    InitBalls("playfield");
  });
})();