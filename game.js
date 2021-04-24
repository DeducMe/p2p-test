const {GRID_SIZE} = require('./constants');


module.exports = {
    joinNewPlayer,
    gameLoop,
    getUpdatedVelocity
}

function getRandomColor(){
    return "#" + ((1<<24)*Math.random() | 0).toString(16)
}

function getRandomPosition(state, blocksFromPlayer = 1){
    const pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
    }
    for (let i = 0; i < state.players.length; i++){
        for (let cell of state.players[i].snake){
            if (cell.x === pos.x && cell.y === pos.y){
                return getRandomPosition(state)
            }
            if (Math.abs(cell.x - pos.x) < blocksFromPlayer && Math.abs(cell.y - pos.y) < blocksFromPlayer){
                return getRandomPosition(state)
            }
        }
    }
    return pos
}

function getRandomVelocity(){
    const result = {
        x: Math.floor(Math.random() * (2 - -1)) -1,
        y: Math.floor(Math.random() * (2 - -1)) -1
    }

    if (
        (result.x === 0 && result.y === 0) 
    ||  (result.x === 1 && result.y === 1)
    ||  (result.x === -1 && result.y === -1)
    ||  (result.x === 1 && result.y === -1)
    ||  (result.x === -1 && result.y === 1)

    )
    return getRandomVelocity()
    else return result
}

function createNewSnake(state, id){
    let player = {}
    player.id = id
    player.pos = getRandomPosition(state, 4)
    player.vel = getRandomVelocity()
    player.snake = []
    for (let i = 3; i > -1; i--){
        player.snake.push({x: player.pos.x - player.vel.x * i, y: player.pos.y - player.vel.y * i},)
    }
    player.snakeColor = getRandomColor()
    return player
}

function createEmptyState(){
    return {
        players: [],
        food: [],
        gridsize: GRID_SIZE,
    };
}

function joinNewPlayer(state, id){
    state = !state ? createEmptyState() : state
    state.players.push(createNewSnake(state, id))
    randomFood(state)
    return state
}

function gameLoop(state){
    let result = false
    if(!state) {
        return;
    }
    for (let i = 0; i < state.players.length; i++){
        let player = state.players[i]

        player.pos.x += player.vel.x;
        player.pos.y += player.vel.y;

        if(player.pos.x < 0 || player.pos.x > GRID_SIZE || player.pos.y < 0 || player.pos.y > GRID_SIZE){
            result = player.id
        }

        // state.players.map((item)=>{
        //     if (item.id !== player.id){
        //         item.snake.map((part)=>{
        //             if (player.snake.includes({x:part.x, y:part.y})){
        //                 // player.snake.find((item)=>part.x === item.x && part.y === item.y)
        //             }
        //         })
        //     }
        // })

        state.players.map((item)=>{
            if (item.id !== player.id){
                const collideIndex = item.snake.findIndex(item => player.pos.x === item.x && player.pos.y === item.y) 
                if (collideIndex !== -1){
                    if (collideIndex < 3){
                        result = item.id
                    }
                    else {
                        item.snake.splice(collideIndex)
                        player.snake.push({...player.pos})
                    }
                    

                }
            }
        })


        state.food.map((foodItem)=>{
            if (player.pos.x === foodItem.x && player.pos.y === foodItem.y){
                player.snake.push({...player.pos})
                player.pos.x += player.vel.x;
                player.pos.y += player.vel.y;
                if (state.players.length >= state.food.length)
                {
                    randomFood(state)
                }
                state.food.splice(state.food.findIndex((item) => item.x === foodItem.x && item.y === foodItem.y) ,1)
                
            }
        })
    
        if(player.vel.x || player.vel.y){
            for (let cell of player.snake){
                if (cell.x === player.pos.x && cell.y ===player.pos.y){
                    result = player.id
                }
            }
        }
    
        player.snake.push({...player.pos});
        player.snake.shift();
    }

    return result
}

function randomFood(state){
    const food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
    }

    for (let i = 0; i < state.players.length; i++){
        for (let cell of state.players[i].snake){
            if (cell.x === food.x && cell.y === food.y){
                return randomFood(state)
            }
        }
    }

    state.food.push(food);
}

function getUpdatedVelocity(vel, keyCode){
    let newVel
    switch (keyCode){
        case 37: {
            if (vel.x !== 1)
            return {x:-1, y:0};
            break;
        }
        case 38: {
            if (vel.y !== 1)
            return {x:0, y:-1};
            break;

        }
        case 39: {
            if (vel.x !== -1)
            return {x:1, y:0};
            break;

        }
        case 40: {
            if (vel.y !== -1)
            return {x:0, y:1};
            break;

        }
    }
    return vel
}