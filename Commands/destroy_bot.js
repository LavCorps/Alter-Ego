const settings = include('settings.json');
const itemManager = include(`${settings.modulesDir}/itemManager.js`);

module.exports.config = {
    name: "destroy_bot",
    description: "Destroys an item.",
    details: "Destroys an item in the specified location or in the player's inventory. The prefab ID or container identifier of the item must be given. "
        + "In order to destroy an item, the name of the room must be given, following \"at\". The name of the container it belongs to can also be specified. "
        + "If the container is another item, the identifier of the item or its prefab ID must be used. "
        + "The name of the inventory slot to destroy the item from can also be specified.\n\n"
        + "To destroy an inventory item, \"player\", \"room\", \"all\", or the name of a player followed by \"'s\", must be given. A container item can also be specified, "
        + "as well as which slot to delete the item from. The player will not be notified if a container item is specified. "
        + "An equipment slot can also be specified isntead of a container item. This will destroy whatever item is equipped to it. "
        + "The player will be notified in this case, and the item's unequipped commands will be run.\n\n"
        + "Note that using the \"all\" argument with a container will destroy all items in that container.",
    usage: `${settings.commandPrefix}destroy volleyball at beach\n`
        + `${settings.commandPrefix}destroy gasoline on shelves at warehouse\n`
        + `${settings.commandPrefix}destroy note in locker 1 at mens locker room\n`
        + `${settings.commandPrefix}destroy wrench in tool box at beach house\n`
        + `${settings.commandPrefix}destroy gloves in breast pocket of tuxedo at dressing room\n`
        + `${settings.commandPrefix}destroy all in trash can at lounge\n`
        + `${settings.commandPrefix}destroy player keyboard\n`
        + `${settings.commandPrefix}destroy all face\n`
        + `${settings.commandPrefix}destroy vivians laptop in vivian's vivians satchel\n`
        + `${settings.commandPrefix}destroy shotput ball in cassie's main pocket of large backpack\n`
        + `${settings.commandPrefix}destroy all in hitoshi's trousers\n`
        + `${settings.commandPrefix}destroy all in charlotte's right pocket of dress`,
    usableBy: "Bot",
    aliases: ["destroy"]
};

module.exports.run = async (bot, game, command, args, player, data) => {
    const cmdString = command + " " + args.join(" ");
    if (args.length < 2) {
        game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Insufficient arguments.`);
        return;
    }

    var input = args.join(" ");
    var parsedInput = input.toUpperCase().replace(/\'/g, "");
    const undashedInput = parsedInput.replace(/-/g, " ");

    let room = null;
    for (let i = 0; i < game.rooms.length; i++) {
        const parsedRoomName = game.rooms[i].name.toUpperCase().replace(/-/g, " ");
        if (undashedInput.endsWith(` AT ${parsedRoomName}`)) {
            room = game.rooms[i];
            parsedInput = parsedInput.substring(0, undashedInput.lastIndexOf(` AT ${parsedRoomName}`));
            break;
        }
        else if (undashedInput.endsWith(`AT ${parsedRoomName}`)) {
            room = game.rooms[i];
            parsedInput = parsedInput.substring(0, undashedInput.lastIndexOf(`AT ${parsedRoomName}`));
            break;
        }
    }

    var destroyAll = false;
    var item = null;
    // Room was found. Look for the container in it.
    if (room !== null) {
        let containerItem = null;
        let containerItemSlot = null;
        // Check if a container item was specified.
        const roomItems = game.items.filter(item => item.location.name === room.name && (item.quantity > 0 || isNaN(item.quantity)));
        for (let i = 0; i < roomItems.length; i++) {
            // If parsedInput is only the identifier or the item's name, we've found the item to delete.
            if (roomItems[i].identifier !== "" && roomItems[i].identifier === parsedInput || roomItems[i].prefab.id === parsedInput) {
                item = roomItems[i];
                break;
            }
            if (parsedInput.endsWith(roomItems[i].identifier) && roomItems[i].identifier !== "") {
                if (roomItems[i].inventory.length === 0 || roomItems[i].prefab.preposition === "") return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". ${roomItems[i].identifier ? roomItems[i].identifier : roomItems[i].prefab.id} cannot hold items.`);
                containerItem = roomItems[i];

                if (parsedInput.endsWith(roomItems[i].identifier) && roomItems[i].identifier !== "")
                    parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(roomItems[i].identifier)).trimEnd();
                else if (parsedInput.endsWith(roomItems[i].prefab.id))
                    parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(roomItems[i].prefab.id)).trimEnd();
                let newArgs = parsedInput.split(' ');
                // Check if a slot was specified.
                if (parsedInput.endsWith(" OF")) {
                    parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(" OF")).trimEnd();
                    newArgs = parsedInput.split(' ');
                    for (let slot = 0; slot < containerItem.inventory.length; slot++) {
                        if (parsedInput.endsWith(containerItem.inventory[slot].name)) {
                            containerItemSlot = containerItem.inventory[slot];
                            parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(containerItemSlot.name)).trimEnd();
                            break;
                        }
                    }
                    if (containerItemSlot === null) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find "${newArgs[newArgs.length - 1]}" of ${containerItem.identifier ? containerItem.identifier : containerItem.prefab.id}.`);
                }
                if (parsedInput.endsWith(containerItem.prefab.preposition.toUpperCase()))
                    parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(containerItem.prefab.preposition.toUpperCase())).trimEnd();
                else if (parsedInput.endsWith(" IN"))
                    parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(" IN")).trimEnd();
                break;
            }
        }
        if (containerItem !== null && containerItemSlot === null) containerItemSlot = containerItem.inventory[0];

        // Check if an object was specified.
        let object = null;
        if (containerItem === null && item === null) {
            const objects = game.objects.filter(object => object.location.name === room.name && object.accessible);
            for (let i = 0; i < objects.length; i++) {
                if (objects[i].name === parsedInput) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". You need to supply an item and a preposition.`);
                if (parsedInput.endsWith(`${objects[i].preposition.toUpperCase()} ${objects[i].name}`) || parsedInput.endsWith(`IN ${objects[i].name}`)) {
                    object = objects[i];
                    if (parsedInput.endsWith(`${objects[i].preposition.toUpperCase()} ${objects[i].name}`))
                        parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(`${objects[i].preposition.toUpperCase()} ${objects[i].name}`)).trimEnd();
                    else if (parsedInput.endsWith(`IN ${objects[i].name}`))
                        parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(`IN ${objects[i].name}`)).trimEnd();
                    else
                        parsedInput = parsedInput.substring(0, parsedInput.lastIndexOf(objects[i].name)).trimEnd();
                    break;
                }
            }
        }

        // Now decide what the container should be.
        let container = null;
        let slotName = "";
        if (object !== null && object.childPuzzle === null && containerItem === null)
            container = object;
        else if (object !== null && object.childPuzzle !== null && containerItem === null)
            container = object.childPuzzle;
        else if (containerItem !== null) {
            container = containerItem;
            slotName = containerItemSlot.name;
        }
        else if (item !== null)
            container = item.container;
        else
            container = null;

        let containerItems = [];
        // Container is a Room.
        if (container === null)
            containerItems = roomItems;
        // Container is an Object.
        else if (container.hasOwnProperty("isHidingSpot"))
            containerItems = roomItems.filter(item => item.containerName === `Object: ${container.name}`);
        // Container is a Puzzle.
        else if (container.hasOwnProperty("solved"))
            containerItems = roomItems.filter(item => item.containerName === `Puzzle: ${container.name}`);
        // Container is an Item.
        else if (container.hasOwnProperty("inventory"))
            containerItems = roomItems.filter(item => item.containerName === `Item: ${container.identifier}/${slotName}`);

        let newArgs = parsedInput.split(" ");
        if (newArgs[0] === "ALL") {
            destroyAll = true;
            newArgs.splice(0, 1);
            parsedInput = newArgs.join(" ");
        }

        if (destroyAll) {
            if (parsedInput !== "") return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find "${parsedInput}" at ${room.name}`);
            for (let i = 0; i < containerItems.length; i++)
                itemManager.destroyItem(containerItems[i], containerItems[i].quantity, true);
        }
        else {
            // Find the item if it hasn't been found already.
            if (item === null) {
                for (let i = 0; i < containerItems.length; i++) {
                    if (containerItems[i].identifier === parsedInput || containerItems[i].prefab.id === parsedInput) {
                        item = containerItems[i];
                        break;
                    }
                }
            }
            if (item === null) return;

            itemManager.destroyItem(item, item.quantity, true);
        }
    }
    else {
        var players = [];
        // Iterate in reverse so that the "all" argument for players doesn't conflict with the "all" argument for items.
        for (let i = args.length - 1; i >= 0; i--) {
            if (args[i].toLowerCase().replace(/'s/g, "") === "player" && player !== null) {
                players.push(player);
                args.splice(i, 1);
                break;
            }
            else if (args[i].toLowerCase().replace(/'s/g, "") === "room" && player !== null) {
                players = player.location.occupants;
                args.splice(i, 1);
                break;
            }
            else if (args[i].toLowerCase().replace(/'s/g, "") === "all") {
                for (let j = 0; j < game.players_alive.length; j++)
                    players.push(game.players_alive[j]);
                args.splice(i, 1);
                break;
            }
            else {
                let found = false;
                for (let j = 0; j < game.players_alive.length; j++) {
                    if (args[i].toLowerCase() === `${game.players_alive[j].name.toLowerCase()}'s`) {
                        found = true;
                        players.push(game.players_alive[j]);
                        args.splice(i, 1);
                        break;
                    }
                }
                if (found) break;
            }
        }
        if (players.length === 0) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find a room or player in your input.`);

        parsedInput = args.join(" ").toUpperCase().replace(/\'/g, "");

        for (let j = 0; j < players.length; j++) {
            player = players[j];
            let parsedInput2 = parsedInput;
            let gotoNext = false;
            // Check if an inventory item was specified.
            let containerItem = null;
            let containerItemSlot = null;
            const playerItems = game.inventoryItems.filter(item => item.player.name === player.name && item.prefab !== null && (item.quantity > 0 || isNaN(item.quantity)));
            for (let i = 0; i < playerItems.length; i++) {
                // If parsedInput2 is only the identifier or the item's name, we've found the item to delete.
                if (playerItems[i].identifier !== "" && playerItems[i].identifier === parsedInput2 || playerItems[i].prefab.id === parsedInput2) {
                    item = playerItems[i];
                    break;
                }
                if (parsedInput2.endsWith(playerItems[i].identifier) && playerItems[i].identifier !== "" || parsedInput2.endsWith(playerItems[i].prefab.id)) {
                    if (playerItems[i].inventory.length === 0 || playerItems[i].prefab.preposition === "") return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". ${playerItems[i].identifier ? playerItems[i].identifier : playerItems[i].prefab.id} cannot hold items.`);
                    containerItem = playerItems[i];

                    if (parsedInput2.endsWith(playerItems[i].identifier) && playerItems[i].identifier !== "")
                        parsedInput2 = parsedInput2.substring(0, parsedInput2.lastIndexOf(playerItems[i].identifier)).trimEnd();
                    else if (parsedInput2.endsWith(playerItems[i].prefab.id))
                        parsedInput2 = parsedInput2.substring(0, parsedInput2.lastIndexOf(playerItems[i].prefab.id)).trimEnd();
                    let newArgs = parsedInput2.split(' ');
                    // Check if a slot was specified.
                    if (parsedInput2.endsWith(" OF")) {
                        parsedInput2 = parsedInput2.substring(0, parsedInput2.lastIndexOf(" OF")).trimEnd();
                        newArgs = parsedInput2.split(' ');
                        for (let slot = 0; slot < containerItem.inventory.length; slot++) {
                            if (parsedInput2.endsWith(containerItem.inventory[slot].name)) {
                                containerItemSlot = containerItem.inventory[slot];
                                parsedInput2 = parsedInput2.substring(0, parsedInput2.lastIndexOf(containerItemSlot.name)).trimEnd();
                                break;
                            }
                        }
                        if (containerItemSlot === null) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find "${newArgs[newArgs.length - 1]}" of ${containerItem.identifier ? containerItem.identifier : containerItem.name}.`);
                    }
                    if (parsedInput2.endsWith(containerItem.prefab.preposition.toUpperCase()))
                        parsedInput2 = parsedInput2.substring(0, parsedInput2.lastIndexOf(containerItem.prefab.preposition.toUpperCase())).trimEnd();
                    else if (parsedInput2.endsWith(" IN"))
                        parsedInput2 = parsedInput2.substring(0, parsedInput2.lastIndexOf(" IN")).trimEnd();
                    break;
                }
            }
            if (containerItem !== null && containerItemSlot === null) containerItemSlot = containerItem.inventory[0];
            let slotName = containerItem !== null ? containerItemSlot.name : "";

            let newArgs = parsedInput2.split(" ");
            if (newArgs[0] === "ALL") {
                destroyAll = true;
                newArgs.splice(0, 1);
                parsedInput2 = newArgs.join(" ");
            }

            let containerItems = [];
            let containerName = "";
            let preposition = "in";
            // If the item still hasn't been found, but a containerItem was, find it in the container.
            if (containerItem !== null) {
                containerItems = playerItems.filter(item => item.containerName === `${containerItem.identifier}/${slotName}`);
                containerName = `${slotName} of ${containerItem.identifier} in ${player.name}'s inventory`;
                preposition = containerItem.prefab.preposition ? containerItem.prefab.preposition : "in";

                if (destroyAll) {
                    for (let i = 0; i < containerItems.length; i++)
                        itemManager.destroyInventoryItem(containerItems[i], containerItems[i].quantity, bot, true);
                    gotoNext = true;
                }
                else {
                    // Find the item if it hasn't been found already.
                    if (item === null) {
                        for (let i = 0; i < containerItems.length; i++) {
                            if (containerItems[i].identifier === parsedInput2 || containerItems[i].prefab.id === parsedInput2) {
                                item = containerItems[i];
                                break;
                            }
                        }
                        if (item === null) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find item "${parsedInput2}" ${preposition} ${containerName}.`);
                    }
                }
            }
            else {
                // Check if an equipment slot was specified.
                let equipmentSlotName = "";
                for (let i = 0; i < player.inventory.length; i++) {
                    if (player.inventory[i].name === parsedInput2) {
                        item = player.inventory[i].equippedItem;
                        equipmentSlotName = player.inventory[i].name;
                        if (item === null) gotoNext = true;
                        if (destroyAll) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". The "all" argument cannot be used when the container is an equipment slot.`);
                        break;
                    }
                    else if (player.inventory[i].equippedItem !== null &&
                        (player.inventory[i].equippedItem.identifier !== "" && player.inventory[i].equippedItem.identifier === parsedInput2 || player.inventory[i].equippedItem.prefab.id === parsedInput2)) {
                        item = player.inventory[i].equippedItem;
                        equipmentSlotName = player.inventory[i].name;
                        if (destroyAll) return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". The "all" argument cannot be used when the container is an equipped item.`);
                        break;
                    }
                }
                if (item !== null && equipmentSlotName !== "") {
                    itemManager.destroyInventoryItem(item, item.quantity, bot, true);
                    gotoNext = true;
                }
            }
            if (gotoNext) continue;

            if (item !== null) itemManager.destroyInventoryItem(item, item.quantity, bot, true);
            else return game.messageHandler.addGameMechanicMessage(game.commandChannel, `Error: Couldn't execute command "${cmdString}". Couldn't find "${parsedInput2}" in ${player.name}'s inventory.`);
        }
    }

    return;
};
