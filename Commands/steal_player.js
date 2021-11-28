﻿const settings = include('settings.json');

module.exports.config = {
    name: "steal_player",
    description: "Steals an item from another player.",
    details: "Attempts to steal an item from another player in the room. You must specify one of the player's equipped items to steal from. "
        + "You can also specify which of that item's inventory slots to steal from. If no slot is specified and the item has multiple inventory slots, "
        + "one slot will be randomly chosen. If the inventory slot contains multiple items, you will attempt to steal one at random.\n\n"
        + "There are three possible outcomes to attempting to steal an item: you steal the item without them noticing, you steal the item but they notice, "
        + "and you fail to steal the item because they notice in time. If you happen to steal a very large item, the other player "
        + "will notice you taking it whether you successfully steal it or not, and so will everyone else in the room. "
        + "Your dexterity stat has a significant impact on how successful you are at stealing an item. "
        + "Various status effects affect the outcome as well. For example, if the player you're stealing from is unconscious, they won't notice you stealing their items no matter what.",
    usage: `${settings.commandPrefix}steal from faye's pants\n`
        + `${settings.commandPrefix}pickpocket from veronicas jacket\n`
        + `${settings.commandPrefix}steal micah's right pocket of pants\n`
        + `${settings.commandPrefix}pickpocket devyns left pocket of pants\n`
        + `${settings.commandPrefix}steal from an individual wearing a mask's cloak\n`
        + `${settings.commandPrefix}pickpocket an individual wearing a buckets side pouch of backpack`,
    usableBy: "Player",
    aliases: ["steal", "pickpocket"]
};

module.exports.run = async (bot, game, message, command, args, player) => {
    if (args.length < 2)
        return game.messageHandler.addReply(message, `You need to specify a player and one of their equipped items. Usage:\n${exports.config.usage}`);

    const status = player.getAttributeStatusEffects("disable steal");
    if (status.length > 0) return game.messageHandler.addReply(message, `You cannot do that because you are **${status[0].name}**.`);

    // First, check if the player has a free hand.
    var hand = "";
    for (let slot = 0; slot < player.inventory.length; slot++) {
        if (player.inventory[slot].name === "RIGHT HAND" && player.inventory[slot].equippedItem === null) {
            hand = "RIGHT HAND";
            break;
        }
        else if (player.inventory[slot].name === "LEFT HAND" && player.inventory[slot].equippedItem === null) {
            hand = "LEFT HAND";
            break;
        }
        // If it's reached the left hand and it has an equipped item, both hands are taken. Stop looking.
        else if (player.inventory[slot].name === "LEFT HAND")
            break;
    }
    if (hand === "") return game.messageHandler.addReply(message, "You do not have a free hand to steal an item. Either drop an item you're currently holding or stash it in one of your equipped items.");

    if (args[0].toUpperCase() === "FROM") args.splice(0, 1);
    var input = args.join(' ');
    var parsedInput = input.toUpperCase().replace(/\'/g, "");

    var victim = null;
    // Check if the input is a player in the room.
    for (let i = 0; i < player.location.occupants.length; i++) {
        let occupant = player.location.occupants[i];
        const possessive = occupant.displayName.toUpperCase() + "S ";
        if (parsedInput.startsWith(possessive) && !occupant.hasAttribute("hidden")) {
            // Player cannot steal from themselves.
            if (occupant.name === player.name) return game.messageHandler.addReply(message, "You can't steal from yourself.");

            victim = occupant;
            parsedInput = parsedInput.substring(possessive.length).trim();
            break;
        }
    }
    if (victim === null) return game.messageHandler.addReply(message, `Couldn't find player "${args[0]}" in the room with you. Make sure you spelled it right.`);

    // parsedInput should be the equipped item and possibly a slot name. Get the names of those.
    var newArgs = parsedInput.split(" OF ");
    const itemName = newArgs[1] ? newArgs[1].trim() : newArgs[0].trim();
    var slotName = newArgs[1] ? newArgs[0].trim() : "";

    // Find the equipped item to steal from.
    const inventory = game.inventoryItems.filter(item => item.player.name === victim.name && item.prefab !== null && item.containerName === "" && item.container === null);
    var container = null;
    for (let i = 0; i < inventory.length; i++) {
        if (inventory[i].prefab.name === itemName && (inventory[i].equipmentSlot !== "LEFT HAND" && inventory[i].equipmentSlot !== "RIGHT HAND" || !inventory[i].prefab.discreet)) {
            // Make sure the item isn't covered by anything first.
            const coveringItems = inventory.filter(item =>
                item.equipmentSlot !== "RIGHT HAND" &&
                item.equipmentSlot !== "LEFT HAND" &&
                item.prefab.coveredEquipmentSlots.includes(inventory[i].equipmentSlot)
            );
            if (coveringItems.length === 0) container = inventory[i];
        }
    }
    if (container === null) return game.messageHandler.addReply(message, `Couldn't find "${itemName}" equipped to ${victim.displayName}'s inventory.`);
    if (container.inventory.length === 0) return game.messageHandler.addReply(message, `${victim.displayName}'s ${container.name} cannot hold items.`);

    // If no slot name was specified, pick one.
    var slotNo = -1;
    if (slotName === "")
        slotNo = Math.floor(Math.random() * container.inventory.length);
    else {
        for (let i = 0; i < container.inventory.length; i++) {
            if (container.inventory[i].name === slotName) {
                slotNo = i;
                break;
            }
        }
        if (slotNo === -1) return game.messageHandler.addReply(message, `Couldn't find "${slotName}" of ${container.name}.`);
    }
    // If there are no items in that slot, tell the player.
    if (container.inventory[slotNo].item.length === 0) {
        if (container.inventory.length === 1) return player.notify(game, `You try to steal from ${victim.displayName}'s ${container.name}, but it's empty.`);
        else return player.notify(game, `You try to steal from ${container.inventory[slotNo].name} of ${victim.displayName}'s ${container.name}, but it's empty.`);
    }

    const result = player.steal(game, hand, victim, container, slotNo);

    // Post log message.
    const time = new Date().toLocaleTimeString();
    if (result.successful)
        game.messageHandler.addLogMessage(game.logChannel, `${time} - ${player.name} stole ${result.itemName} from ${container.inventory[slotNo].name} of ${victim.name}'s ${container.name} in ${player.location.channel}`);
    else
        game.messageHandler.addLogMessage(game.logChannel, `${time} - ${player.name} attempted and failed to steal ${result.itemName} from ${container.inventory[slotNo].name} of ${victim.name}'s ${container.name} in ${player.location.channel}`);

    return;
};
