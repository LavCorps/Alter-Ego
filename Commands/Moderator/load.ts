// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Collection } from "discord.js";
import { InvalidInvocation, ValidatedInvocation, type MatchedInvocation } from "../../Classes/Command/Invocation.ts";
import { Pattern, Slot, Constant, Glob } from "../../Classes/Command/Pattern.ts";
import type GameSettings from "../../Classes/GameSettings.js";
import InventoryItem from "../../Data/InventoryItem.ts";
import ModeratorCommand from "../../Classes/Command/ModeratorCommand.ts";
import type ModeratorContext from "../../Classes/Command/ModeratorContext.ts";

class LoadInvocation extends ValidatedInvocation {
    /**
     * Which category of game entity should be targeted by the load command.
     */
    readonly target: "all" | "rooms" | "fixtures" | "prefabs" | "recipes" | "room items" | "puzzles" | "events" | "status effects" | "players" | "inventory items" | "gestures" | "flags";

    /**
     * Whether the game should be started after loading. This is true if the command is invoked as `lar`, `las`, `[re]load all start`, or `[re]load all resume`, and is passed as the first argument to the GEL `loadAll()` function.
     */
    readonly start: boolean;

    /**
     * Whether players should have room descriptions sent to them after loading. This is true if the command is invoked as `las` or `[re]load all start`, and is passed as the second argument to the GEL `loadAll()` function.
     */
    readonly sendDescription: boolean;

    /**
     * @param target - Which category of game entity should be targeted by the load command.
     * @param start - Whether the game should be started after loading.
     * @param sendDescription - Whether players should have room descriptions sent to them after loading.
     */
    constructor(target: "all" | "rooms" | "fixtures" | "prefabs" | "recipes" | "room items" | "puzzles" | "events" | "status effects" | "players" | "inventory items" | "gestures" | "flags", start: boolean = false, sendDescription: boolean = false) {
        super(new Collection(), []);
        this.target = target;
        this.start = start;
        this.sendDescription = sendDescription;
    }
}

const command = new ModeratorCommand({
    config: {
        name: "load_moderator",
        description: "Loads game data.",
        details:
            `Loads game data from the spreadsheet and stores it in memory. You must specify what spreadsheet tab to ` +
            `load from. When data from a particular tab is loaded, all data that was previously in memory for that tab ` +
            `will be cleared and replaced with the newly-loaded data.\n\n` +
            `If there are any errors with the loaded game data, you will be warned, and the game cannot progress until ` +
            `they are fixed and reloaded. However, some game data cannot be checked for errors with the load command. ` +
            `To check for errors in your descriptions, use the \`parse\` command. At this time, it is not possible ` +
            `to check for errors in bot commands that appear on the spreadsheet, until they are executed.\n\n` +
            `If game entities referenced data that has been reloaded (for example, fixtures reference the room they're ` +
            `located in), the references will be updated to point to the new data, if possible. However, references can ` +
            `be broken, if newly-loaded data does not contain the entities that other entities reference, and you will ` +
            `not be warned when this occurs. So, it is good practice to load all game data together periodically.\n\n` +
            `To start the game, load all data and append "start" or "resume". When "start" is used, each living player ` +
            `will be sent the description of the room they load into. When "resume" is used, the game is still started, ` +
            `but room descriptions will not be sent to players. In general, "start" should be used when starting a game ` +
            `for the first time, and "resume" should be used whenever the bot is rebooted. However, you do not have to ` +
            `do this if the \`AUTO_LOAD\` setting in your \`.env\` file is set to \`true\`.\n\n` +
            `If you are loading data while a game is in progress, you should use the \`editmode\` command first.`,
        usableBy: "Moderator",
        aliases: ["load", "reload", "las", "lar"],
        requiresGame: false,
    },

    usage: (settings: GameSettings) => {
        return (
            `${settings.commandPrefix}load all start\n` +
            `${settings.commandPrefix}las\n` +
            `${settings.commandPrefix}load all resume\n` +
            `${settings.commandPrefix}lar\n` +
            `${settings.commandPrefix}load all\n` +
            `${settings.commandPrefix}load rooms\n` +
            `${settings.commandPrefix}load fixtures\n` +
            `${settings.commandPrefix}load prefabs\n` +
            `${settings.commandPrefix}load recipes\n` +
            `${settings.commandPrefix}load room items\n` +
            `${settings.commandPrefix}load roomitems\n` +
            `${settings.commandPrefix}load puzzles\n` +
            `${settings.commandPrefix}load events\n` +
            `${settings.commandPrefix}load status effects\n` +
            `${settings.commandPrefix}load players\n` +
            `${settings.commandPrefix}load inventory items\n` +
            `${settings.commandPrefix}load inventories\n` +
            `${settings.commandPrefix}load gestures\n` +
            `${settings.commandPrefix}load flags`
        );
    },

    patterns: [new Pattern([new Glob()])],

    validate: async (ctx: ModeratorContext, inv: MatchedInvocation) => {
        if (ctx.invokedAlias !== "las" && ctx.invokedAlias !== "lar" && inv.glob.length === 0)
            return new InvalidInvocation([
                `You need to specify what data to get. Usage:\n${command.usage(ctx.game.settings)}`,
            ]);
        else if (ctx.invokedAlias === "las")
            inv.glob = ["all", "start"];
        else if (ctx.invokedAlias === "lar")
            inv.glob = ["all", "resume"];

        if (inv.glob[0] === "all") {
            if (ctx.game.inProgress && !ctx.game.editMode)
                return new InvalidInvocation(["You must enable edit mode to load all data."]);
            if (inv.glob[1] === "start")
                return new LoadInvocation("all", true, true);
            else if (inv.glob[1] === "resume")
                return new LoadInvocation("all", true);
            else return new LoadInvocation("all");
        } else if (inv.glob[0] === "rooms") {
            if (ctx.game.inProgress && !ctx.game.editMode)
                return new InvalidInvocation(["You must enable edit mode to load rooms."]);
            return new LoadInvocation("rooms");
        } else if (inv.glob[0] === "fixtures" || inv.glob[0] === "objects") {
            if (ctx.game.inProgress && !ctx.game.editMode)
                return new InvalidInvocation(["You must enable edit mode to load fixtures."]);
            return new LoadInvocation("fixtures");
        } else if (inv.glob[0] === "prefabs")
            return new LoadInvocation("prefabs");
        else if (inv.glob[0] === "recipes")
            return new LoadInvocation("recipes");
        else if (inv.glob[0] === "roomitems" || inv.glob[0] === "items" || inv.glob[0] === "room" && inv.glob[1] === "items") {
            if (ctx.game.inProgress && !ctx.game.editMode)
                return new InvalidInvocation(["You must enable edit mode to load room items."]);
            return new LoadInvocation("room items");
        } else if (inv.glob[0] === "puzzles") {
            if (ctx.game.inProgress && !ctx.game.editMode)
                return new InvalidInvocation(["You must enable edit mode to load puzzles."]);
            return new LoadInvocation("puzzles");
        } else if (inv.glob[0] === "events") {
            if (ctx.game.inProgress && !ctx.game.editMode)
                return new InvalidInvocation(["You must enable edit mode to load events."]);
            return new LoadInvocation("events");
        } else if (inv.glob[0] === "statuses" || inv.glob[0] === "effects" || inv.glob[0] === "status" && inv.glob[1] === "effects")
            return new LoadInvocation("status effects");
        else if (inv.glob[0] === "players")
            return new LoadInvocation("players");
        else if (inv.glob[0] === "inventoryitems" || inv.glob[0] === "inventories" || inv.glob[0] === "inventory" && inv.glob[1] === "items") {
            if (ctx.game.inProgress && !ctx.game.editMode)
                return new InvalidInvocation(["You must enable edit mode to load inventory items."]);
            return new LoadInvocation("inventory items");
        } else if (inv.glob[0] === "gestures")
            return new LoadInvocation("gestures");
        else if (inv.glob[0] === "flags") {
            if (ctx.game.inProgress && !ctx.game.editMode)
                return new InvalidInvocation(["You must enable edit mode to load flags."]);
            return new LoadInvocation("flags");
        }

        return new InvalidInvocation([`You need to specify a valid type of data to get. Usage:\n${command.usage(ctx.game.settings)}`])
    },

    execute: async (ctx: ModeratorContext, inv: LoadInvocation) => {
        let errors: Error[] = [];

        switch (inv.target) {
            case "all":
                const resultMessage = await ctx.game.entityLoader.loadAll(inv.start, inv.sendDescription);
                ctx.game.communicationHandler.sendToCommandChannel(resultMessage);
                break;
            case "rooms":
                const roomCount = await game.entityLoader.loadRooms(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${roomCount} rooms retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "fixtures":
                const fixtureCount = await game.entityLoader.loadFixtures(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${fixtureCount} fixtures retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "prefabs":
                const prefabCount = await game.entityLoader.loadPrefabs(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${prefabCount} prefabs retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "recipes":
                const recipeCount = await game.entityLoader.loadRecipes(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${recipeCount} recipes retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "room items":
                const roomItemCount = await game.entityLoader.loadRoomItems(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${roomItemCount} room items retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "puzzles":
                const puzzleCount = await game.entityLoader.loadPuzzles(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${puzzleCount} puzzles retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "events":
                const eventCount = await game.entityLoader.loadEvents(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${eventCount} events retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "status effects":
                const statusEffectCount = await game.entityLoader.loadStatusEffects(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${statusEffectCount} status effects retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "players":
                const playerCount = await game.entityLoader.loadPlayers(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${playerCount} players retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "inventory items":
                const inventoryItemCount = await game.entityLoader.loadInventoryItems(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${inventoryItemCount} inventory items retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "gestures":
                const gestureCount = await game.entityLoader.loadGestures(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${gestureCount} gestures retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
            case "flags":
                const flagCount = await game.entityLoader.loadFlags(true, errors);
                if (errors.length === 0)
                    ctx.game.communicationHandler.sendToCommandChannel(`${flagCount} flags retrieved.`);
                else
                    ctx.game.communicationHandler.sendToCommandChannel(errors.join('\n'));
                break;
        }
    },
});

export default command;
