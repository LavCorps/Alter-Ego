﻿const settings = include('settings.json');

const Die = include(`${settings.dataDir}/Die.js`);

module.exports.config = {
    name: "roll_moderator",
    description: "Rolls a die.",
    details: `Rolls a d${settings.diceMax}. If a stat and a player are specified, calculates the result plus the modifier of `
        + "the player's specified stat. If two players are specified, any status effects the second player has which affect the "
        + "first player will be applied to the first player, whose stats will be recalculated before their stat modifier is applied. "
        + "Additionally, if a strength roll is performed using two players, the second player's dexterity stat will be inverted and "
        + "applied to the first player's roll. Any modifiers will be mentioned in the result, but please note that the result sent "
        + "has already had the modifiers applied. Valid stat inputs include: `str`, `strength`, `int`, `intelligence`, `dex`, "
        + "`dexterity`, `spd`, `speed`, `sta`, `stamina`.",
    usage: `${settings.commandPrefix}roll\n`
        + `${settings.commandPrefix}roll int colin\n`
        + `${settings.commandPrefix}roll faye devyn\n`
        + `${settings.commandPrefix}roll str seamus terry\n`
        + `${settings.commandPrefix}roll strength shinobu shiori\n`
        + `${settings.commandPrefix}roll sta evad\n`
        + `${settings.commandPrefix}roll dexterity agiri`,
    usableBy: "Moderator",
    aliases: ["roll"],
    requiresGame: true
};

module.exports.run = async (bot, game, message, command, args) => {
    var statString = null, stat = null, attacker = null, defender = null;
    if (args.length === 3) {
        statString = args[0].toLowerCase();
        attacker = getPlayer(game, args[1].toLowerCase());
        if (typeof attacker === "string") return game.messageHandler.addReply(message, `Couldn't find player "${args[1]}".`);
        defender = getPlayer(game, args[2].toLowerCase());
        if (typeof defender === "string") return game.messageHandler.addReply(message, `Couldn't find player "${args[2]}".`);
    }
    else if (args.length === 2) {
        const arg0 = getPlayer(game, args[0].toLowerCase());
        if (typeof arg0 !== "string") {
            attacker = arg0;
            defender = getPlayer(game, args[1].toLowerCase());
            if (typeof defender === "string") return game.messageHandler.addReply(message, `Couldn't find player "${args[1]}".`);
        }
        else {
            statString = arg0;
            attacker = getPlayer(game, args[1].toLowerCase());
            if (typeof attacker === "string") return game.messageHandler.addReply(message, `Couldn't find player "${args[1]}".`);
        }
    }
    else if (args.length === 1) {
        const arg0 = getPlayer(game, args[0].toLowerCase());
        if (typeof arg0 !== "string") attacker = arg0;
        else return game.messageHandler.addReply(message, `Cannot roll for a stat without a given player.`);
    }
    if (statString) {
        if (statString === "str" || statString === "strength") stat = "str";
        else if (statString === "int" || statString === "intelligence") stat = "int";
        else if (statString === "dex" || statString === "dexterity") stat = "dex";
        else if (statString === "spd" || statString === "speed") stat = "spd";
        else if (statString === "sta" || statString === "stamina") stat = "sta";
        else return game.messageHandler.addReply(message, `"${statString}" is not a valid stat.`);
    }

    const die = new Die(stat, attacker, defender);
    if (die.modifier === 0) game.messageHandler.addGameMechanicMessage(message.channel, `Rolled a **${die.result}** with no modifiers.`);
    else game.messageHandler.addGameMechanicMessage(message.channel, `Rolled a **${die.result}** with modifiers ${die.modifierString}.`);
    
    return;
};

function getPlayer(game, name) {
    for (let i = 0; i < game.players_alive.length; i++) {
        if (game.players_alive[i].name.toLowerCase() === name)
            return game.players_alive[i];
    }
    return name;
}
