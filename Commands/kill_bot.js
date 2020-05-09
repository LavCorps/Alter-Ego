const settings = include('settings.json');

module.exports.config = {
    name: "kill_bot",
    description: "Makes a player dead.",
    details: "Moves the listed players from the living list to the dead list. "
        + "The player will be removed from whatever room channel they're in as well as any whispers. "
        + "A dead player will retain any items they had in their inventory, but they will not be accessible "
        + "unless they are manually added to the spreadsheet. A dead player will retain the Player role. "
        + "When a dead player's body is officially discovered, use the reveal command to remove the Player role "
        + "and give them the Dead role. If you use \"player\" in place of a list of players, then the player who "
        + "triggered the command will be killed. If the \"room\" argument is used instead, then all players in the "
        + "room will be killed.",
    usage: `${settings.commandPrefix}kill natalie\n`
        + `${settings.commandPrefix}die shiori corin terry andrew aria\n`
        + `${settings.commandPrefix}kill player\n`
        + `${settings.commandPrefix}die room`,
    usableBy: "Bot",
    aliases: ["kill", "die"]
};

module.exports.run = async (bot, game, command, args, player, data) => {
    const cmdString = command + " " + args.join(" ");
    if (args.length === 0) {
        game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". No players were specified.`);
        return;
    }

    // Determine which player(s) are being killed.
    var players = [];
    if (args[0].toLowerCase() === "player" && player !== null)
        players.push(player);
    else if (args[0].toLowerCase() === "room" && data !== null && data.hasOwnProperty("ongoing")) {
        // Command was triggered by an Event. Get occupants of all rooms affected by it.
        for (let i = 0; i < game.rooms.length; i++) {
            if (game.rooms[i].tags.includes(data.roomTag) && game.rooms[i].occupants.length > 0)
                players = players.concat(game.rooms[i].occupants);
        }
    }
    else if (args[0].toLowerCase() === "room" && player !== null)
        players = player.location.occupants;
    else {
        player = null;
        for (let i = 0; i < game.players_alive.length; i++) {
            for (let j = 0; j < args.length; j++) {
                if (args[j].toLowerCase() === game.players_alive[i].name.toLowerCase()) {
                    players.push(game.players_alive[i]);
                    args.splice(j, 1);
                    break;
                }
            }
        }
        if (args.length > 0) {
            const missingPlayers = args.join(", ");
            return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find player(s): ${missingPlayers}.`);
        }
    }

    for (let i = 0; i < players.length; i++)
        players[i].die(game);

    return;
};
