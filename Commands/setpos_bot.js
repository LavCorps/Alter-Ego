﻿const settings = include('settings.json');

module.exports.config = {
    name: "setpos_bot",
    description: "Sets a player's position.",
    details: `Sets the specified player's position. If the "player" argument is used in place of a name, `
        + `then the player who triggered the command will have their position updated. If the "room" argument `
        + `is used instead, then all players in the same room as the player who triggered the command will have their `
        + `positions updated. Lastly, if the "all" argument is used, then all players will have their positions updated. `
        + `You can set individual coordinates with the "x", "y", or "z" arguments and the value to set it to. Otherwise, `
        + `a space-separated list of coordinates in the order **x y z** must be given.`,
    usage: `${settings.commandPrefix}setpos player 200 5 350\n`
        + `${settings.commandPrefix}setpos room 400 -10 420\n`
        + `${settings.commandPrefix}setpos vivian x 350\n`
        + `${settings.commandPrefix}setpos player y 10\n`
        + `${settings.commandPrefix}setpos all z 250\n`,
    usableBy: "Bot",
    aliases: ["setpos"]
};

module.exports.run = async (bot, game, command, args, player, data) => {
    const cmdString = command + " " + args.join(" ");

    if (args.length < 2) {
        game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Insufficient arguments.`);
        return;
    }

    // Determine which player(s) are having their positions updated.
    var players = new Array();
    if (args[0].toLowerCase() === "player" && player !== null)
        players.push(player);
    else if (args[0].toLowerCase() === "room" && player !== null)
        players = player.location.occupants;
    else if (args[0].toLowerCase() === "room" && data !== null && data.hasOwnProperty("location"))
        players = data.location.occupants;
    else if (args[0].toLowerCase() === "all") {
        for (let i = 0; i < game.players_alive.length; i++)
            players.push(game.players_alive[i]);
    }
    else {
        player = null;
        for (let i = 0; i < game.players_alive.length; i++) {
            if (game.players_alive[i].name.toLowerCase() === args[0].toLowerCase()) {
                player = game.players_alive[i];
                break;
            }
        }
        if (player === null) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find player "${args[0]}".`);
        players.push(player);
    }

    if (args[1] === "x" && args[2]) {
        let x = parseInt(args[2]);
        if (isNaN(x)) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". "${args[2]}" is not a valid X-coordinate.`);

        for (let i = 0; i < players.length; i++)
            players[i].pos.x = x;
    }
    else if (args[1] === "y" && args[2]) {
        let y = parseInt(args[2]);
        if (isNaN(y)) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". "${args[2]}" is not a valid Y-coordinate.`);

        for (let i = 0; i < players.length; i++)
            players[i].pos.y = y;
    }
    else if (args[1] === "z" && args[2]) {
        let z = parseInt(args[2]);
        if (isNaN(z)) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". "${args[2]}" is not a valid Z-coordinate.`);

        for (let i = 0; i < players.length; i++)
            players[i].pos.z = z;
    }
    else if ((args[1] === "x" || args[1] === "y" || args[1] === "z") && !args[2])
        return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". An individual coordinate was specified, but no number was given.`);
    else {
        let coordinates = args.slice(1);
        if (coordinates.length !== 3) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Invalid coordinates given.`);
        for (let i = 0; i < coordinates.length; i++) {
            if (isNaN(coordinates[i])) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Invalid coordinates given.`);
        }

        for (let i = 0; i < players.length; i++) {
            players[i].pos.x = parseInt(coordinates[0]);
            players[i].pos.y = parseInt(coordinates[1]);
            players[i].pos.z = parseInt(coordinates[2]);
        }
    }

    return;
};
