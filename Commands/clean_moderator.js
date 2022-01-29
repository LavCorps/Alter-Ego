const settings = include('settings.json');
const saver = include(`${settings.modulesDir}/saver.js`);

module.exports.config = {
    name: "clean_moderator",
    description: "Cleans the items and inventory items sheets.",
    details: "Combs through all items and inventory items and deletes any whose quantity is 0. All game data will then "
        + "be saved to the spreadsheet, not just items and inventory items. This process will effectively clean the "
        + "spreadsheet of items and inventory items that no longer exist, reducing the size of both sheets. Note that "
        + "edit mode must be turned on in order to use this command. There is no need to load items or inventory items "
        + "after this command finishes executing, unless you wish to make additional changes to either sheet.",
    usage: `${settings.commandPrefix}clean\n`
        + `${settings.commandPrefix}autoclean`,
    usableBy: "Moderator",
    aliases: ["clean", "autoclean"],
    requiresGame: true
};

module.exports.run = async (bot, game, message, command, args) => {
    if (!game.editMode)
        return game.messageHandler.addReply(message, `You cannot clean the items and inventory items sheet while edit mode is disabled. Please turn edit mode on before using this command.`);

    var deletedItemsCount = 0;
    var deletedInventoryItemsCount = 0;
    // Iterate through the lists backwards because the act of splicing ruins the order of iteration going forwards.
    for (let i = game.items.length - 1; i >= 0; i--) {
        if (game.items[i].quantity === 0) {
            game.items.splice(i, 1);
            deletedItemsCount++;
        }
    }
    for (let i = game.inventoryItems.length - 1; i >= 0; i--) {
        if (game.inventoryItems[i].quantity === 0) {
            game.inventoryItems.splice(i, 1);
            deletedInventoryItemsCount++;
        }
    }

    try {
        // Pass deletedItemsCount and deletedInventoryItemsCount so the saver knows how many blank rows to append at the end.
        await saver.saveGame(deletedItemsCount, deletedInventoryItemsCount);
        game.messageHandler.addGameMechanicMessage(message.channel, "Successfully cleaned items and inventory items. Successfully saved game data to the spreadsheet.");
    }
    catch (err) {
        console.log(err);
        game.messageHandler.addGameMechanicMessage(message.channel, "Successfully cleaned items and inventory items, but there was an error saving data to the spreadsheet. Proceeding without manually saving and loading may cause additional errors. Error:\n```" + err + "```");
    }

    return;
};
