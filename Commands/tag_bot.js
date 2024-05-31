const settings = include('Configs/settings.json');

module.exports.config = {
    name: "tag_bot",
    description: "Adds or removes a room's tags.",
    details: "-**add**/**addtag**: Adds a tag to the given room. Events that affect rooms with that tag will immediately "
        + "apply to the given room, and any tag that gives a room special behavior will immediately activate those functions.\n\n"
        + "-**remove**/**removetag**: Removes a tag from the given room. Events that affect rooms with that tag will immediately "
        + "stop applying to the given room, and any tag that gives a room special behavior will immediately stop functioning.\n\n"
        + "Note that unlike the moderator version of this command, you cannot add/remove multiple tags at once.",
    usage: `${settings.commandPrefix}tag add kitchen video surveilled\n`
        + `${settings.commandPrefix}tag remove kitchen audio surveilled\n`
        + `${settings.commandPrefix}addtag vault soundproof\n`
        + `${settings.commandPrefix}removetag freezer cold`,
    usableBy: "Bot",
    aliases: ["tag", "addtag", "removetag"]
};

module.exports.run = async (bot, game, command, args, player, data) => {
    const cmdString = command + " " + args.join(" ");
    var input = command + " " + args.join(" ");
    if (command === "tag") {
        if (args[0] === "add") command = "addtag";
        else if (args[0] === "remove") command = "removetag";
        input = input.substring(input.indexOf(args[1]));
        args = input.split(" ");
    }
    else input = args.join(" ");

    if (command !== "addtag" && command !== "removetag") return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Invalid command given. Use "add" or "remove".`);
    if (args.length < 2)
        return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Insufficient arguments.`);

    input = args.join(" ");
    var parsedInput = input.replace(/ /g, "-").toLowerCase();

    var room = null;
    for (let i = 0; i < game.rooms.length; i++) {
        if (parsedInput.startsWith(game.rooms[i].name + '-')) {
            room = game.rooms[i];
            break;
        }
    }
    if (room === null) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find room "${input}".`);

    input = input.substring(room.name.length).trim();
    if (input === "") return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Insufficient arguments.`);

    if (command === "addtag") {
        if (!room.tags.includes(input.trim()))
            room.tags.push(input.trim());
    }
    else if (command === "removetag") {
        if (room.tags.includes(input.trim()))
            room.tags.splice(room.tags.indexOf(input.trim()), 1);
    }

    return;
};
