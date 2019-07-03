const http = require("http");
const express = require("express");
const socketio = require("socket.io");

let app = express();
let server = http.createServer(app);

let io = socketio(server);

console.log('Serving static from Client folder');
app.use(express.static('__dirname/../Client'));

let players = [];
let cols = 40;
let fps = 40;
let grid = new Array(25);
let gridhp = new Array(25);
let speed = 1.25;
let size = 22;
let res = 20;
let range = 5*res;
let red = [];
let blue = [];
let teams = [red, blue];
let width = 800;
let height = 500;
let fireballs = [];
let gametime = 0;
let core = [200, 200];
let rebootTimer = -1;
let bulletpace = 40;

for(var i = 0; i < grid.length;i++) {
  grid[i] = new Array(cols);
  grid[i].fill(0);
  gridhp[i] = new Array(cols);
  gridhp[i].fill(0);
}
//On construit le core de chaque team
for(var i = 11; i<=13; i++) {
  grid[i][0]=3;
  grid[i][1]=3;
  // gridhp[i][0]=Math.infinity;
  // gridhp[i][1]=Math.infinity;
  grid[i][width/res-1]=3;
  grid[i][width/res-2]=3;
}


io.on('connection', (sock) => {
  console.log("Someone connected");
  sock.emit('message', 'Hi you are connected');
  let hisTeam = Math.round(Math.random(0,1));
  if(teams[0].length<teams[1].length){
    hisTeam = 0;
  }else if(teams[0].length>teams[1].length) {
    hisTeam = 1;
  }
  teams[hisTeam].push(sock.id);
  let startingx;
  if(hisTeam == 0) {
    startingx = 20;
  }else{
    startingx = width-20;
  }
  let startingy=-1;
  while((startingy>11*res&&startingy<14*res)||startingy==-1) {
    startingy = height*Math.random();

  }
  players.push(
    {
      id : sock.id,
      x : startingx,
      y : startingy,
      team : hisTeam,
      reload : 40,
      health:100,
      mousex : 0,
      mousey : 0,
      deathtimer : 201,
      blocks : 30,
      presstimer : 0,
      speed : speed,
      item : 0,
      range : 8*res
    });

//Disconnection handling


//Le joueur doit disparaitre si il n'est plus connecté
sock.on('disconnect', function () {
        console.log('user disconnected (id:) ' + sock.id);
        for(var i = 0; i<players.length;i++) {
          if(players[i].id == sock.id) {
            players.splice(i,1);
          }
        }
    });
//On analyse les postioins pour vérifier les collisions



    sock.on('left', () => {
      for(i = 0; i < players.length; i++) {
        if(sock.id == players[i].id) {
          players[i].x -= players[i].speed;
        }
      }
    });
    sock.on('right', () => {
      for(i = 0; i < players.length; i++) {
        if(sock.id == players[i].id) {
          players[i].x += players[i].speed;
        }
      }
    });
    sock.on('up', () => {
      for(i = 0; i < players.length; i++) {
        if(sock.id == players[i].id) {
          players[i].y -= players[i].speed;
        }
      }
    });
    sock.on('down', () => {
      for(i = 0; i < players.length; i++) {
        if(sock.id == players[i].id) {
          players[i].y += players[i].speed;
        }
      }
    });
    sock.on('gridchange', (data) => {


      if(data.a<cols && data.b<grid.length && players[data.i].blocks>0) {
      grid[data.b][data.a] = data.value;
      gridhp[data.b][data.a] = 50;
      players[data.i].blocks -=1;
    }
    });
    sock.on('damagegrid', (data) => {
      if(data.a<cols && data.b<grid.length) {
      gridhp[data.b][data.a] -= data.dmg;
    }
    });

    sock.on('fireball', (data) => {
      for(var i =0; i<players.length;i++) {
        if(sock.id == players[i].id) {
          let ftype;
          if(players[i].presstimer>=2*fps) {
            ftype = 2;
          }else {
            ftype = 1;
          }
          players[i].presstimer =0;
          fireballs.push(new Fireball(data.x, data.y, data.px, data.py, data.team, data.id, ftype));
          players[i].reload = 0;
        }
      }

    })

    sock.on('mousepos', (data) => {
      for(var i =0; i<players.length;i++) {
        if(sock.id == players[i].id) {
      players[i].mousex = data.mx;
      players[i].mousey = data.my;
    }
  }
    })
    sock.on('item', (data) => {
      for(var i =0; i<players.length;i++) {
        if(sock.id == players[i].id) {
          players[i].item = data;
      }
    }
    })
    sock.on('pressing', () => {
      for(var i =0; i<players.length;i++) {
        if(sock.id == players[i].id && players[i].item == 2 && players[i].reload>=bulletpace) {
          players[i].presstimer +=1;
        }
      }
    })
    sock.on('released', () => {
      for(var i =0; i<players.length;i++) {
        if(sock.id == players[i].id) {
        }
      }
    })
});

setInterval(refresh, 1000/fps);
function refresh() {
gametime+=1;
if(rebootTimer >=0) {
  rebootTimer+=1;
}
EndGameTest();

Collision();
for(var i=0; i<players.length;i++) {
  players[i].speed = speed;
  //gestion de la speed de chaque joueur
  //SI on est mouseDown, on est ralenti
  if(players[i].presstimer>= 10) {
    players[i].speed = 0.25;
  }
  //gestion de la range de chaque joueur
  if(players[i].item == 0 ||players[i].item == 1) {
    players[i].range == 8*res;
  }
  if(players[i].item == 2) {
    players[i].range == 16*res;
  }
  //On augmente de 1 les timers de chaque joueur
  players[i].reload+=1;
  players[i].deathtimer +=1;
}

if(gametime%100 == 0) {
  for(var i=0; i<players.length;i++) {
    players[i].blocks+=1;
  }
}



Fireballs();
  //On tue les joeurs morts
  for(var i =0; i<players.length;i++) {
    if(players[i].health<=0) {
      players[i].deathtimer = 0;
      players[i].x = -100;
      players[i].y = -100;
      players[i].health = 100;
    }
    if(players[i].deathtimer == 200) {


      if(players[i].team == 0) {
        players[i].x = 20;
      }else{
        players[i].x = width-20;
      }
      players[i].y = height*Math.random();
    }
  }


//on envoie les données en fin de boucle refresh
  io.emit('players', players);
  io.emit('grid', grid);
  io.emit('gridhp', gridhp);
  io.emit('fireballs', fireballs);
  io.emit('core', core);

}

function testMax(max, arg) {
  if(arg==max&&max!=0) {
    return -1
  }else{
    return 0
  }
}

function Collision() {

  //On vérifie si certaines cases n'ont plus de hp
    for(var i= 0;i<grid.length; i++){
      for(var j =0; j<cols;j++) {
        if(gridhp[i][j]<0) {
          grid[i][j] = 0;
          gridhp[i][j]=0;
        }
      }
    }

  // Test de collision cercle-rect
    for(k = 0; k < players.length; k++) {

      players[k].col = 0;
      players[k].lcol = 0;
      players[k].rcol = 0;
      players[k].ucol = 0;
      players[k].dcol = 0;
    for(var i= 0;i<grid.length; i++){
      for(var j =0; j<cols;j++) {
        if((grid[i][j]==1||grid[i][j]==2||grid[i][j]==3)&&Math.abs(res*i-players[k].y)<80&&Math.abs(res*j-players[k].x)<80) {
          let x = players[k].x;
          let y = players[k].y;
          let r = size/2;
          let diag =res/Math.sqrt(2);
          let dist = Math.sqrt(Math.pow(Math.abs(x-res*j-res/2),2)+Math.pow(Math.abs(y-res*i-res/2),2));
          //détection coin haut gauche
          if(x<res*j&&y<res*i&&dist<=diag+r) {
            players[k].lcol+=1;
            players[k].ucol+=1;
          }
          //pareil pour les autres coins
          if(x<res*j&&y>res*i+res&&dist<=diag+r) {
            players[k].lcol+=1;
            players[k].dcol+=1;
          }
          if(x>res*j+res&&y<res*i&&dist<=diag+r) {
            players[k].rcol+=1;
            players[k].ucol+=1;
          }
          if(x>res*j+res&&y>res*i+res&&dist<=diag+r) {
            players[k].rcol+=1;
            players[k].dcol+=1;
          }

          //On teste désormais les collsions parallèles aux cotés des carrés
          if(x<res*j&&y>res*i&&y<res*i+res&&Math.abs(x-res*j-res/2)<=res/2+r){
            players[k].lcol+=1;
          }
          if(x>res*j+res&&y>res*i&&y<res*i+res&&Math.abs(x-res*j-res/2)<=res/2+r){
            players[k].rcol+=1;
          }
          if(y<=res*i&&x>=res*j&&x<=res*j+res&&Math.abs(y-res*i-res/2)<=res/2+r){
            players[k].ucol+=1;
          }
          if(y>=res*i+res&&x>=res*j&&x<=res*j+res&&Math.abs(y-res*i-res/2)<=res/2+r){
            players[k].dcol+=1;
          }
        }
      }
    }
    //On reère le max des collisions directionnelles (il peut etre vérifié par plusieurs directions)
    let max = Math.max(players[k].lcol,players[k].rcol,players[k].ucol,players[k].dcol);
    players[k].lcol = testMax(max, players[k].lcol);
    players[k].rcol = testMax(max, players[k].rcol);
    players[k].ucol = testMax(max, players[k].ucol);
    players[k].dcol = testMax(max, players[k].dcol);

  // on ajoute une priorité syur les collsiions : les bods de la map
    if(players[k].x<size/2) {
      players[k].rcol=-1;
    }
    if(players[k].x>width-size/2) {
      players[k].lcol=-1;
    }
    if(players[k].y<size/2) {
      players[k].dcol=-1;
    }
    if(players[k].y>height-size/2) {
      players[k].ucol=-1;
    }
  }
  //fin des collisions
}

function Fireballs() {
  //On actualise les fireballs

    for(var k=fireballs.length-1; k>=0; k--) {
      fireballs[k].update();
      let dead = false;
      let fsize = 10*fireballs[k].type;
  //detection des collsions fireball-mur (approximation par deux cercles)
      for(var i= 0;i<grid.length; i++){
        for(var j =0; j<cols;j++) {
          if((grid[i][j]==1||grid[i][j]==2 ||grid[i][j]==3)) {
          let tiledist = Math.sqrt(Math.pow(res*j+res/2-fireballs[k].x,2)+Math.pow(res*i+res/2-fireballs[k].y,2));
          if(tiledist <= res/2+fsize/2) {
            if(grid[i][j] == 3) {
              let coredmg = 10;
              if(fireballs[k].type == 2) {
                coredmg = 35;
              }
              if(fireballs[k].team == 0 && fireballs[k].x > width/2) {
                core[1]-=coredmg;
              }
              if(fireballs[k].team == 1 && fireballs[k].x < width/2) {
                core[0]-=coredmg;
              }
            }

            if(grid[i][j]!=3) {
              let fdamg = 15;
              if(fireballs[k].type == 2) {
                fdamg = 45;
              }
            gridhp[i][j] -=fdamg;
          }
            fireballs.splice(k,1);
            i = grid.length;
            j = cols;
            dead = true;
          }
        }
        }
      }
  //détection de collisions joueur-fireball (représentation exacte par 2 cercles)
      if(!dead) {
      for(var i = 0; i< players.length;i++) {
        if(players[i].team != fireballs[k].team) {
        let distplayer = Math.sqrt(Math.pow(players[i].x-fireballs[k].x,2)+Math.pow(players[i].y-fireballs[k].y,2));
        if(distplayer <= fsize/2+size/2) {
          if(fireballs[k].team != players[i].team) {
            let fdmg = 8;
            if(fireballs[k].type == 2) {
              fdmg = 25;
            }
          players[i].health-=fdmg;
        }
          fireballs.splice(k,1);
          dead = true;
          break

        }
      }
    }
  }
    //Suppression des fireball qui sortent du terrain
    if(!dead) {
    if(fireballs[k].x-5 > width || fireballs[k].x+5 < 0 || fireballs[k].y-5 > height || fireballs[k].y+5 < 0) {
      fireballs.splice(k, 1);
      dead = true;
    }
  }
    //Supression des fireballs en dehors de la range ACTUELLE du joueur emetteur
    if(!dead) {
    for(var i = 0; i<players.length;i++) {
      if(!dead) {
      if(players[i].id == fireballs[k].id) {

        let sourcedist = Math.sqrt(Math.pow(players[i].x-fireballs[k].x,2)+Math.pow(players[i].y-fireballs[k].y,2));
        if(sourcedist > players[i].range) {
          fireballs.splice(k,1);
          dead = true;
        }
      }
      }
    }
  }
    }
}

server.on('error', (err) => {
  console.error("Erreur du serveur: " + err);
});

server.listen((process.env.PORT||8080),() => {
  console.log("Game started on 8080");
});


function Fireball(x, y, px, py, team, id, type) {
  this.px = px;
  this.py = py;
  this.x = x;
  this.y = y;
  this.team = team;
  this.id = id;
  this.type = type;
  this.dir = [this.x-this.px, this.y-this.py];
  this.vel = normalize(this.dir, 4);
  this.update = function() {
    if(this.type == 1) {
      this.x+=this.vel[0];
      this.y+=this.vel[1];
    }else if(this.type == 2){
      this.x+=1.5*this.vel[0];
      this.y+=1.5*this.vel[1];
    }

  }
}

function normalize(point, scale) {
  var norm = Math.sqrt(point[0] * point[0] + point[1] * point[1]);
  if (norm != 0) { // as3 return 0,0 for a point of zero length
    return [scale * point[0] / norm, scale * point[1] / norm]
  }
}

function EndGameTest() {
  // End Game handling
  if(core[0]<=0) {
    io.emit('EndGame', {
      winTeam : 1,
      hp : core[1],
      rb: 7*fps-rebootTimer
    });
    if(rebootTimer==-1) {
      rebootTimer = 0;
    }
  }else if(core[1]<= 0) {
    io.emit('EndGame', {
      winTeam : 0,
      hp : core[0],
      rb: 150-rebootTimer
    });
    if(rebootTimer==-1) {
      rebootTimer = 0;
    }
  }
    if(rebootTimer>=7*fps) {
      rebootTimer = -1;
      process.exit(0);
    }
}
