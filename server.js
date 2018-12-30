const io = require('socket.io')();
const port = 1337;
const players = {};
let player = 0;
const width = 40;
const height = 40;
let colors = {};
let gameState =  new Array(height).fill(0).map(() => new Array(width).fill("."));

      /*
        0: down
        1: up
        2: left
        3: right
      */

function reset() {
	//fill board with .'s
	gameState = new Array(height).fill(0).map(() => new Array(width).fill("."));
	//place food
	placeFood();
	//for each player
	Object.keys(players).forEach(player => {
		console.log("Player: ", player );
		randomizePlayerPosition(player);
	});
	io.emit('gamestate', gameState);
}

function validatePlayerPosition (position) {
	let y = position[0];
	let x = position[1];

	if(gameState[y][x] !== "."){
		return false;
	} 
	return true;
}

function randomizePlayerPosition(playerID) {

	//choose random spawn for player
	let position = [Math.floor(Math.random() * height), Math.floor(Math.random() * width)];
	
	//validate space
	while(!validatePlayerPosition(position)){
		position = [Math.floor(Math.random() * height), Math.floor(Math.random() * width)];
	}

	//if space is valid, set player head, and tail to current position and randomize head direction
	let starty = position[0];
	let startx = position[1]; 
	let direction = Math.floor(Math.random() * 4);
	gameState[starty][startx] = playerID;
	
	players[playerID].head = [ ...position ];
	players[playerID].tail = [ ...position ];
	players[playerID].headDirection = direction;
	players[playerID].tailDirections = [direction];
	
	//TODO check that player is at least three spaces away from a wall or another player

	/* Search this area for collisions
		   .
		  ...
		 .....
		...X...
		 .....
	      ...
		   .
	*/
}

function placeFood(){
      	var y = Math.floor(Math.random() * height);
      	var x = Math.floor(Math.random() * width);
      	while(gameState[y][x] !== "."){
        	y = Math.floor(Math.random() * height);
        	x = Math.floor(Math.random() * width);
      	}
      
      	gameState[y][x] = "@";
}

function killSnake(playerID) {
	let tail = [ ...players[playerID].tail ];
	while (players[playerID].tailDirections.length > 0){
		let tailDirection = players[playerID].tailDirections.shift();
		gameState[tail[0]][tail[1]] = "X";
		if(tailDirection === 0 && (tail[0] + 1 < height)){
			tail = [++tail[0], tail[1]];
		}else if (tailDirection === 1 && (tail[0] - 1 >= 0)){
			tail = [--tail[0], tail[1]];
		}else if (tailDirection === 2 && (tail[1] - 1 >= 0)){
			tail = [tail[0], --tail[1]];
		}else if (tailDirection === 3 && (tail[1] + 1 < width)){
			tail = [tail[0], ++tail[1]];
		}	
	}
}

function move() {
	if (Object.keys(players).length > 0) {
		Object.keys(players).forEach(player => {
			const headDirection = players[player].headDirection;
			let head = [ ...players[player].head ];
			let tail = [ ...players[player].tail ];
			let tailDirections = [ ...players[player].tailDirections ];

			tailDirections.push(headDirection);

			if(headDirection === 0 && (head[0] + 1 < height) && ((gameState[head[0] + 1][head[1]] === ".") || (gameState[head[0] + 1][head[1]] === "@"))){
				head = [++head[0], head[1]];
			}else if (headDirection === 1 && (head[0] - 1 >= 0) && ((gameState[head[0] - 1][head[1]] === ".") || (gameState[head[0] - 1][head[1]] === "@"))){
				head = [--head[0], head[1]];
			}else if (headDirection === 2 && (head[1] - 1 >= 0) && ((gameState[head[0]][head[1] - 1] === ".") || (gameState[head[0]][head[1] - 1] === "@"))){
				head = [head[0], --head[1]];
			}else if (headDirection === 3 && (head[1] + 1 < width) && ((gameState[head[0]][head[1] + 1 ] === ".") || (gameState[head[0]][head[1] + 1 ] === "@"))){
				head = [head[0], ++head[1]];
			}else{
				killSnake(player);
				randomizePlayerPosition(player);
				return;
			}

			//conditional logic to determine if snake grows
			if(gameState[head[0]][head[1]] !== "@"){
				let tailDirection = tailDirections.shift();
				gameState[tail[0]][tail[1]] = ".";
				if(tailDirection === 0 && (tail[0] + 1 < height)){
					tail = [++tail[0], tail[1]];
				}else if (tailDirection === 1 && (tail[0] - 1 >= 0)){
					tail = [--tail[0], tail[1]];
				}else if (tailDirection === 2 && (tail[1] - 1 >= 0)){
					tail = [tail[0], --tail[1]];
				}else if (tailDirection === 3 && (tail[1] + 1 < width)){
					tail = [tail[0], ++tail[1]];
				}
			}else{
				placeFood();
			}

			gameState[head[0]][head[1]] = player;      
			players[player].head = [ ...head ];
			players[player].tail = [ ...tail ];
			players[player].headDirection = headDirection;
			players[player].tailDirections = [ ...tailDirections ];
		});
		
		io.emit('gamestate', gameState);
	}
}

//Called by reset Listener
function playerResetEvent() {
	console.log("resetting...");
	reset();
}

//Called by Move listener
function playerMoveEvent(data, newPlayer) {
	console.log(data);

		var headDirection = players[newPlayer].headDirection;
      		var tailDirections = [ ...players[newPlayer].tailDirections ];

      		if(data === "down" && headDirection !== 1){
        		headDirection = 0;
      		}else if(data === "up" && headDirection !== 0){
        		headDirection = 1;
      		}else if(data === "left" && headDirection !== 3){
        		headDirection = 2;
      		}else if(data === "right" && headDirection !== 2){
        		headDirection = 3;
      		}	

      		if(headDirection !== players[newPlayer].headDirection){
        		tailDirections.pop();
        		tailDirections.push(headDirection);
      		}

        	players[newPlayer].headDirection = headDirection;
        	players[newPlayer].tailDirections = [ ...tailDirections ];
}

function getRandomColor() {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
	  color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
  }

function randomizePlayerColor(playerID) {
	colors[playerID] = getRandomColor();
	io.emit('colors', colors);
}

function setPlayerStart(socket) {

	//Verify we dont have any active listeners on a socket.
	socket.removeAllListeners();

	//Build player object from Socket
	let newPlayer = player;
	++player;
	players[newPlayer] = {socket: socket};

	randomizePlayerPosition(newPlayer);

	randomizePlayerColor(newPlayer); 

	//register movement listener
	players[newPlayer].socket.on('move', (data) => playerMoveEvent(data, newPlayer));

	//register reset event
	players[newPlayer].socket.on('reset', playerResetEvent);

	//register player disconnect
	players[newPlayer].socket.on('disconnect', () => {
		killSnake(newPlayer);
		players[newPlayer].socket.disconnect();
		delete players[newPlayer];
	});

	//Return gamestate to client
	io.emit('gamestate', gameState);
}

//On connection start new Player and handle sockets
io.on('connection', (socket) => {
	setPlayerStart(socket);	
});

//Initial place food call
placeFood();

//Set update timer
setInterval(() => {
	move();
}, 150);

//Starts the server listener
io.listen(port);
console.log('Listening on port ' + port + '...');
