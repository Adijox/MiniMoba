
const sock = io();

sock.on('message', (msg) => {
  console.log(msg);
});


let players = [];
let clientID;
let grid = [];
let gridhp = [];
let res;
let cols = 40;
let size = 22;
let range;
let disMouse = 0;
let hotbar = new Array(3);
let item = 0;
let scrollamount = 0;
let team;
let fireballs = [];
let release = false;
let counter = true;
let lasta = 0;
let lastb = 0;
let core = [];
let endg0 = false;
let endg1 = false;
let hp;
let rb;
let img;
let bulletpace = 40;

function preload() {
  img = loadImage('Images/drill.png');
}

p5.disableFriendlyErrors = true;
function setup() {
  createCanvas(800, 500);
  background(51);
  res = width/cols;
  range = 8*res;
}

function draw() {
  background(255);
  range = 8*res;


  //On récupère le data actualisé du server

  sock.on('players', (data) => {
    players = data;
  });
  sock.on('grid', (data) => {
    grid = data;
  });
  sock.on('core', (data) => {
    core = data;
  });
  sock.on('gridhp', (data) => {
    gridhp = data;
  });
  sock.on('fireballs', (data) => {
    fireballs = data;
  });


  drawGrid();

  for(let i = 0; i < players.length; i++) {
    //On colorie les membres des teams
    if(players[i].team == 0) {
      fill(255, 0, 0)
    }else {
      fill(0, 0, 255);
    }
    //On teste les commandes spécifiques au Client
    if(players[i].id == sock.id && players[i].deathtimer>=200) {
      team = players[i].team;
      Move(i);
      Click(i);

      //On dessine la portée du joueur en gris
      push();
      noStroke();
      fill(80, 80, 100, 80);
      ellipse(players[i].x, players[i].y, range, range);
      pop();
      Hotbar(i);
    }

    //On dessine les joueurs en dernier
    ellipse(players[i].x, players[i].y, size, size);

    //avec une fireball si ils en ont 1 en stock
    if(players[i].reload>bulletpace) {
      noStroke();
      let decal = createVector(players[i].x - players[i].mousex, players[i].y - players[i].mousey);
      decal.normalize();
      if(players[i].team == 0) {
        fill(255, 130, 100)
      }
      if(players[i].team == 1){
        fill(100, 130, 255);
      }
      //ici 2*fps!
      let preballsize;
      if(players[i].presstimer>=2*40) {
        preballsize = 20;
      }else {
        preballsize = 10;
      }
      ellipse(players[i].x-20*decal.x,players[i].y-20*decal.y, preballsize, preballsize);
    }

    //avec leur barre de vie respective
    push();
    noStroke();
    fill(0, 0, 0, 100);
    rect(players[i].x - 10, players[i].y - 20, 20, 5);
    fill(255*(1-(players[i].health/100)), 200-255*(1-(players[i].health/100)), -100);
    rect(players[i].x - 10, players[i].y - 20, (players[i].health/100)*20, 5);

    //et les barres de vie des cores
    fill(0, 0, 0, 100);
    rect(res/4, 10*res+res/2-5, 30, 10);
    fill(255*(1-(core[0]/200)), 200-255*(1-(core[0]/200)), -100);
    rect(res/4, 10*res+res/2-5, (core[0]/200)*30, 10);

    fill(0, 0, 0, 100);
    rect(width-res/4-30, 10*res+res/2-5, 30, 10);
    fill(255*(1-(core[1]/200)), 200-255*(1-(core[1]/200)), -100);
    rect(width-res/4-30, 10*res+res/2-5, (core[1]/200)*30, 10);

    pop();
  }

  //on affiche ensuite les fireballs
  for(var j=0;j<fireballs.length;j++) {
    if(fireballs[j].team == 0) {
      fill(255, 130, 100)
    }
    if(fireballs[j].team == 1){
      fill(100, 130, 255);
    }
    noStroke()
    ellipse(fireballs[j].x, fireballs[j].y, 10*fireballs[j].type, 10*fireballs[j].type);
  }

  //On reset le traxcker de release
  release = false;
//On affiche le hud au-dessus de tout
  Hud();
  sock.emit('item', item);

  //Chaque joueur envoie régulierement ses coord de souris
  sock.emit('mousepos', {
    mx : mouseX,
    my : mouseY
  });
  //fin draw
}

function drawGrid() {
  //On affiche les couleurs de la grid dont on a recu les infos en debut de draw (la grid au début car c est en arriere plan)
  stroke(0, 0, 0, 100);
  strokeWeight(1);
  for(var i= 0;i<grid.length; i++){
    line(0, res*i, width, res*i);
  }
  for(var j= 0;j<cols; j++){
    line(res*j, 0, res*j, height);
  }

  for(var i= 0;i<grid.length; i++){
    for(var j =0; j<grid[i].length;j++) {
      if(grid[i][j] == 1 || grid[i][j]==2 || grid[i][j] ==3) {
        if(grid[i][j]==2) {
          fill(50, 100, 200);
        }else if(grid[i][j]==1){
          fill(200, 70, 50);
        }else if(grid[i][j] == 3) {
          fill(40);
        }
        rect(res*j,res*i,20,20);
        //On dessine les losanges au dessus des cores
        push();
        fill(255, 0, 0)
        noStroke()
        beginShape();
        vertex(res, -res+height/2);
        vertex(res/2, height/2)
        vertex(res, res+height/2);
        vertex(1.5*res, height/2)
        endShape(CLOSE);

        fill(0, 0, 255)
        beginShape();
        vertex(width-res, -res+height/2);
        vertex(width-res/2, height/2)
        vertex(width-res, res+height/2);
        vertex(width-1.5*res, height/2)

        endShape(CLOSE);
        pop();
        //On finit par dessiner l'état de dommage des blocs
        if(grid[i][j] != 3) {
        push();
        fill(70, 70, 70, 170);
        noStroke();
        rectMode(CENTER);
        let dim = res - res*(gridhp[i][j]/50);
        //0.5+ en vertu des règles d'affichaghe
        rect(0.5 + res*j+res/2, 0.5 +res*i+res/2, dim, dim);
        pop();
      }
      }
    }
  }



}

function Click(i) {

  distMouse = Math.sqrt(Math.pow(mouseX-players[i].x,2)+Math.pow(mouseY-players[i].y,2));
  if(mouseIsPressed) {
    sock.emit('pressing');
  }
  if(release) {
    sock.emit('released');
  }
  if(mouseIsPressed && distMouse <= range/2) {
    //On calcule avec des congruences la cellule ciblée sur la grille et on lui donne la valeur de 1
    let a = (1/res)*(mouseX-(mouseX%20));
    let b = (1/res)*(mouseY-(mouseY%20));
    if(lasta != a || lastb !=b) {
      counter = true;
    }
    lasta = (1/res)*(mouseX-(mouseX%20));
    lastb = (1/res)*(mouseY-(mouseY%20));

    if(item==0 && grid[b][a]==0 && players[i].blocks>0 && counter) {
      value = team+1;
      grid[b][a] = team+1;
      counter= false;
      sock.emit('gridchange',
      { a: a,
        b: b,
        value: value,
        i : i
      });
    }
    else if(item==1 && (grid[b][a]==1||grid[b][a]==2)) {
      let dmg;
      if(grid[b][a] == team+1) {
        dmg=3;
      } else {
        dmg = 1;
      }

      sock.emit('damagegrid',
      { a: a,
        b: b,
        dmg: dmg
      });
    }


  }
  if(item==2) {
    range = 16*res;
  }
  if(release && item == 2 && players[i].reload>bulletpace) {

    players[i].reload = 0;
    let mousedir = createVector(players[i].x - mouseX, players[i].y - mouseY);
    let decalage = mousedir.normalize();
    sock.emit('fireball', {
      px:players[i].x,
      py:players[i].y,
      x:players[i].x-20*decalage.x,
      y:players[i].y-20*decalage.y,
      team: players[i].team,
      id : players[i].id
    });
  }
}


function mouseWheel(event) {
  scrollamount = event.delta;
}

function Move(i) {
  if(keyIsDown(81) && players[i].rcol!=-1) {
    sock.emit('left');
  }else if(keyIsDown(68) && players[i].lcol!=-1) {
    sock.emit('right' );
  }
  if(keyIsDown(90) && players[i].dcol!=-1) {
    sock.emit('up');
  }else if(keyIsDown(83) && players[i].ucol!=-1) {
    sock.emit('down');
  }
}


function Hotbar(i) {
  if(scrollamount==100) {
    item+=1;
  }else if(scrollamount==-100) {
    item-=1;
  }
  if(item>hotbar.length-1) {
    item =0;
  }
  if(item<0){
    item = hotbar.length-1;
  }
  if(keyIsDown(49)) {
    item = 0;
  }
  if(keyIsDown(50)) {
    item = 1;
  }
  if(keyIsDown(51)) {
    item = 2;
  }
//On informe l'obet players[i] de item afin de communiquer la hotbar du joueur au server
  players[i].item = item;

// On annule le dernier scroll pour la prochaine boucle draw
  scrollamount = 0;

}
function Hud() {
  push();
  noStroke();
  fill(13, 40, 30, 200);
  rect(width/2-85+60*0, 20, 50, 50, 20);
  //image de tuile
  if(team == 0) {fill(200, 70, 50);}
  if(team == 1) {fill(50, 100, 200);}

  rect(width/2-70, 35, 20, 20);
  fill(13, 40, 30, 200);
  rect(width/2-85+60*1, 20, 50, 50, 20);
  fill(13, 40, 30, 200);
  rect(width/2-85+60*2, 20, 50, 50, 20);
  stroke(0, 80, 0);
  strokeWeight(10);
  noFill();
  rect(width/2-85+60*item, 20, 50, 50, 20);
  //On affiche le nb de tuiles restantes
  for(var i = 0; i<players.length;i++) {
    if(players[i].id == sock.id) {
      noStroke();
      fill(151)
      textSize(12);
      text(players[i].blocks, width/2 - 50, 60);
    }
}
//On affiche la deuxieme icone : une drill
      image(img, width/2-17, 27, 32, 32);
//On affiche la troisième icone : une fireball de la couleur appropriée
if(team == 0) {
  fill(255, 130, 100)
}else if(team == 1){
  fill(100, 130, 255);
}
  noStroke();
  let iconsize = 20;
  for(var i = 0; i<players.length;i++) {
    if(players[i].id == sock.id) {
  if(players[i].presstimer>2*40) {
    iconsize = 40;
  }
  if(players[i].reload >= bulletpace) {
    ellipse(width/2+60, 45, iconsize, iconsize);
  }
}
}

  pop();

  for(var i = 0; i<players.length;i++) {
    if(players[i].id == sock.id && players[i].deathtimer<200) {
      console.log('efe')
      fill(0, 102, 153);
      textSize(32);
      text('Respawning in', width/2 - 100, 100);
      fill(0, 102, 153);
      textSize(50);
      let txt = (10 - Math.round((players[i].deathtimer/20))).toString()
      text(txt, width/2 - 20, 150);
    }
  }
  sock.on('EndGame', (data) => {
    if(data.winTeam == 0) {
      rb = data.rb;
      hp = data.hp;
      endg0 = true;

    }
    if(data.winTeam == 1) {
      rb = data.rb;
      hp = data.hp;
      endg1 = true;

    }
  })
  if(endg0) {

    textSize(25);
    fill("red")
    stroke(51);
    strokeWeight(2);
    text("RED TEAM WINS! And blue team had " + hp + "/200 hp left",width/8, height*0.4);
    text("Server rebooting in " + Math.round(rb/30), width/3, height*0.5)
    text("Please press F5 to join next game", width/4, height*0.6)
  }
  if(endg1) {
    textSize(25)
    fill("blue")
    stroke(51);
    strokeWeight(2);
    text("BLUE TEAM WINS! And red team had " + hp + "/200 hp left",width/8, height*0.4);
    text("Server rebooting in " + Math.round(rb/30), width/3, height*0.5)
    text("Please press F5 to join next game", width/4, height*0.6)
  }

}

function mouseReleased(event) {
  release = true;
}
