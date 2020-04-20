const settings = include('settings.json');

module.exports.config = {
    name: "craft_player",
    description: "Crafts two items in your inventory together.",
    details: 'Creates a new item using the two items in your hand. The names of the items must be separated by "with" or "and". '
        + "If no recipe for those two items exists, the items cannot be crafted together. "
        + "Note that this command can also be used to use one item on another item, which may produce something new.",
    usage: `${settings.commandPrefix}craft drain cleaner and plastic bottle\n`
        + `${settings.commandPrefix}combine bread and cheese\n`
        + `${settings.commandPrefix}mix red vial with blue vial\n`
        + `${settings.commandPrefix}craft soap with knife`,
    usableBy: "Player",
    aliases: ["craft", "combine", "mix"]
};

module.exports.run = async (bot, game, message, command, args, player) => {
    if (args.length < 3)
        return game.messageHandler.addReply(message, `you need to specify two items separated by "with" or "and". Usage:\n${exports.config.usage}`);

    const status = player.getAttributeStatusEffects("disable craft");
    if (status.length > 0) return game.messageHandler.addReply(message, `You cannot do that because you are **${status[0].name}**.`);

    var input = args.join(' ');
    var parsedInput = input.toUpperCase().replace(/\'/g, "");

    if (!parsedInput.includes(" WITH ") && !parsedInput.includes(" AND "))
        return game.messageHandler.addReply(message, `you need to specify two items separated by "with" or "and". Usage:\n${exports.config.usage}`);

    var rightHand = null;
    var leftHand = null;
    for (let slot = 0; slot < player.inventory.length; slot++) {
        if (player.inventory[slot].name === "RIGHT HAND") rightHand = player.inventory[slot];
        else if (player.inventory[slot].name === "LEFT HAND") leftHand = player.inventory[slot];
    }

    // Now find the item in the player's inventory.
    var item1 = null;
    var item2 = null;
    let rightFirst = false;
    if (rightHand.equippedItem !== null) {
        if (parsedInput.startsWith(rightHand.equippedItem.name + " WITH ") || parsedInput.startsWith(rightHand.equippedItem.name + " AND ")) {
            item1 = rightHand.equippedItem;
            rightFirst = true;
        }
        else if (parsedInput.endsWith(" WITH " + rightHand.equippedItem.name) || parsedInput.endsWith(" AND " + rightHand.equippedItem.name))
            item1 = rightHand.equippedItem;
    }
    if (leftHand.equippedItem !== null) {
        if (rightFirst && (parsedInput.endsWith(" WITH " + leftHand.equippedItem.name) || parsedInput.endsWith(" AND " + leftHand.equippedItem.name))
            || !rightFirst && (parsedInput.startsWith(leftHand.equippedItem.name + " WITH ") || parsedInput.startsWith(leftHand.equippedItem.name + " AND ")))
            item2 = leftHand.equippedItem;
    }

    let item1Name = "";
    let item2Name = "";
    if (item1 === null && item2 !== null) {
        item1Name = parsedInput.replace(item2.name, "").replace(" WITH ", "").replace(" AND ", "");
        return game.messageHandler.addReply(message, `couldn't find item "${item1Name}" in either of your hands.`);
    }
    else if (item1 !== null && item2 === null) {
        item2Name = parsedInput.replace(item1.name, "").replace(" WITH ", "").replace(" AND ", "");
        return game.messageHandler.addReply(message, `couldn't find item "${item2Name}" in either of your hands.`);
    }
    else if (item1 === null && item2 === null) {
        if (parsedInput.includes(" WITH ")) args = parsedInput.split(" WITH ");
        else if (parsedInput.includes(" AND ")) args = parsedInput.split(" AND ");
        item1Name = args[0];
        item2Name = args[1];
        return game.messageHandler.addReply(message, `couldn't find items "${item1Name}" and "${item2Name}" in either of your hands.`);
    }

    let ingredients = [item1, item2].sort(function (a, b) {
        if (a.prefab.id < b.prefab.id) return -1;
        if (a.prefab.id > b.prefab.id) return 1;
        return 0;
    });

    const recipes = game.recipes.filter(recipe => recipe.ingredients.length === 2 && recipe.objectTag === "");
    var recipe = null;
    for (let i = 0; i < recipes.length; i++) {
        if (recipes[i].ingredients[0].id === ingredients[0].prefab.id && recipes[i].ingredients[1].id === ingredients[1].prefab.id) {
            recipe = recipes[i];
            break;
        }
    }
    if (recipe === null) return game.messageHandler.addReply(message, `couldn't find recipe requiring ${ingredients[0].name} and ${ingredients[1].name}. Contact a moderator if you think there should be one.`);

    item1Name = ingredients[0].identifier ? ingredients[0].identifier : ingredients[0].prefab.id;
    item2Name = ingredients[1].identifier ? ingredients[1].identifier : ingredients[1].prefab.id;

    const products = player.craft(game, ingredients[0], ingredients[1], recipe);

    let productPhrase = "";
    let product1Phrase = "";
    let product2Phrase = "";
    if (products.product1) product1Phrase = products.product1.identifier ? products.product1.identifier : products.product1.prefab.id;
    if (products.product2) product2Phrase = products.product2.identifier ? products.product2.identifier : products.product2.prefab.id;
    if (product1Phrase !== "" && product2Phrase !== "") productPhrase = `${product1Phrase} and ${product2Phrase}`;
    else if (product1Phrase !== "") productPhrase = product1Phrase;
    else if (product2Phrase !== "") productPhrase = product2Phrase;
    else productPhrase = "nothing";

    // Post log message.
    const time = new Date().toLocaleTimeString();
    game.messageHandler.addLogMessage(game.logChannel, `${time} - ${player.name} crafted ${productPhrase} from ${item1Name} and ${item2Name} in ${player.location.channel}`);

    return;
};
