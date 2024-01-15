﻿const settings = include('Configs/settings.json');
const constants = include('Configs/constants.json');
const playerdefaults = include('Configs/playerdefaults.json');
const serverconfig = include('Configs/serverconfig.json');

const Player = include(`${constants.dataDir}/Player.js`);

module.exports.config = {
    name: "play_eligible",
    description: "Joins a game.",
    details: "Adds you to the list of players for the current game.",
    usage: `${settings.commandPrefix}play`,
    usableBy: "Eligible",
    aliases: ["play"]
};

module.exports.run = async (bot, game, message, args) => {
    for (let i = 0; i < game.players.length; i++) {
        if (message.author.id === game.players[i].id)
            return message.reply("You are already playing.");
    }
    if (!game.canJoin) return message.reply("You were too late to join the game. Contact a moderator to be added before the game starts.");

    const member = await game.guild.members.fetch(message.author.id);

    var player = new Player(
        message.author.id,
        member,
        member.displayName,
        member.displayName,
        "",
        "neutral",
        playerdefaults.defaultStats,
        true,
        playerdefaults.defaultLocation,
        "",
        playerdefaults.defaultStatusEffects,
        playerdefaults.defaultDescription,
        new Array(),
        null
    );
    game.players.push(player);
    game.players_alive.push(player);
    member.roles.add(serverconfig.playerRole);
    message.channel.send(`<@${message.author.id}> joined the game!`);

    return;
};
