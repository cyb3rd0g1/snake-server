const io = require('socket.io')();
const port = 1337;
const players = {};
let player = 0;
const width = 50;
const height = 50;
let gameState =  new Array(height).fill(0).map(() => new Array(width).fill("."));

      /*
        0: down
        1: up
        2: left
        3: right
      */
function reset() {
	gameState = new Array(height).fill(0).map(() => new Array(width).fill("."));
	placeFood();
	Object.keys(players).forEach(player => {
		setPlayerStart(players[player].socket);
		delete players[player];
	});
	player = 0;
	io.emit('gamestate', gameState);
}

function placeFood(){
      	var y = Math.floor(Math.random() * height);
      	var x = Math.floor(Math.random() * width);
      	while(gameState[y][x] !== "."){
        	y = Math.floor(Math.random() * height);
        	x = Math.floor(Math.random() * width);
      	}
      
      	gameState[y][x] = "*";
}

function move() {
	if (Object.keys(players).length > 0) {
		Object.keys(players).forEach(player => {
			const headDirection = players[player].headDirection;
			let head = [ ...players[player].head ];
			let tail = [ ...players[player].tail ];
			let tailDirections = [ ...players[player].tailDirections ];

			tailDirections.push(headDirection);

			if(headDirection === 0 && (head[0] + 1 < height) && ((gameState[head[0] + 1][head[1]] === ".") || (gameState[head[0] + 1][head[1]] === "*"))){
				head = [++head[0], head[1]];
			}else if (headDirection === 1 && (head[0] - 1 >= 0) && ((gameState[head[0] - 1][head[1]] === ".") || (gameState[head[0] - 1][head[1]] === "*"))){
				head = [--head[0], head[1]];
			}else if (headDirection === 2 && (head[1] - 1 >= 0) && ((gameState[head[0]][head[1] - 1] === ".") || (gameState[head[0]][head[1] - 1] === "*"))){
				head = [head[0], --head[1]];
			}else if (headDirection === 3 && (head[1] + 1 < width) && ((gameState[head[0]][head[1] + 1 ] === ".") || (gameState[head[0]][head[1] + 1 ] === "*"))){
				head = [head[0], ++head[1]];
			}else{
				setPlayerStart(players[player].socket);
				delete players[player];
				return;
			}

			//conditional logic to determine if snake grows
			if(gameState[head[0]][head[1]] !== "*"){
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

function clearPlayerSocket(player) {
	player.socket.removeAllListeners();
}

function setPlayerStart(socket) {

	//Verify we dont have any active listeners on a socket.
	socket.removeAllListeners();

	//Build player object from Socket
	let newPlayer = player;
	++player;
	players[newPlayer] = {socket: socket};

	let starty = Math.floor(height/2);
	let startx = Math.floor(width/2);
	
	//TODO: randomize start location for new players, for now we will just start at the center of the board
	/*while (gameState[starty][startx] !== ".") {
		starty = Math.floor(height/2);
		startx = Math.floor(width/2);
	}*/
	
	let direction = Math.floor(Math.random() * 4);
	gameState[starty][startx] = newPlayer;
	
	players[newPlayer].head = [starty, startx];
	players[newPlayer].tail = [starty, startx];
	players[newPlayer].headDirection = direction;
	players[newPlayer].tailDirections = [direction];

	//register movement listener
	players[newPlayer].socket.on('move', (data) => playerMoveEvent(data, newPlayer));

	//register reset event
	players[newPlayer].socket.on('reset', playerResetEvent);

	//register player disconnect
	players[newPlayer].socket.on('disconnect', () => {
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
}, 200);

//Starts the server listener
io.listen(port);
console.log('Listening on port ' + port + '...');
