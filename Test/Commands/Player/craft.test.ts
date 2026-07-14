// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import craft_player from "../../../Commands/Player/craft.ts";
import ClientContext from "../../../Classes/ClientContext.ts";
import CraftAction from "../../../Data/Actions/CraftAction.ts";
import { clearQueue } from "../../../Modules/messageHandler.ts";
import { instantiateInventoryItem } from "../../../Modules/itemManager.ts";
import { createMockMessage } from "../../__mocks__/libs/discord.js";
import type Player from "../../../Data/Player.ts";

describe("craft_player command", () => {
    beforeAll(async () => {
        if (!testGame.inProgress) await testGame.entityLoader.loadAll(true);
    });

    beforeEach(() => {
        // Register the new craft_player command so executeCommand can find it.
        vi.spyOn(ClientContext.instance, "getCommand").mockReturnValue(craft_player);
        // Allow commands in any channel during tests.
        vi.spyOn(ClientContext.instance, "commandIssuedInValidChannel").mockReturnValue(true);
    });

    afterEach(async () => {
        await testGame.entityLoader.loadInventoryItems(false);
        clearQueue(testGame);
        vi.resetAllMocks();
    });

    /**
     * Puts items with the given prefab IDs into the player's hands, destroying
     * whatever was there before. Returns the newly created InventoryItems.
     * @param player - The player whose hands we want to set.
     * @param rightPrefabId - The ID of the prefab to instantiate in the right hand. Optional.
     * @param leftPrefabId - The ID of the prefab to instantiate in the left hand. Optional.
     */
    function setHandItems(player: Player, rightPrefabId?: string, leftPrefabId?: string) {
        const hands = testGame.entityFinder.getPlayerHands(player);
        for (const hand of hands) {
            if (hand.equippedItem !== null)
                player.directUnequip(hand.equippedItem);
        }
        const rightItem = rightPrefabId
            ? instantiateInventoryItem(testGame.entityFinder.getPrefab(rightPrefabId), player, hands[0].id, null, "", 1)
            : null;
        const leftItem = leftPrefabId
            ? instantiateInventoryItem(testGame.entityFinder.getPrefab(leftPrefabId), player, hands[1].id, null, "", 1)
            : null;
        return { right: rightItem, left: leftItem };
    }

    /**
     * Creates a mock message and sends it through executeCommand, returning whether the command succeeded.
     * @param commandStr - The full text of the command to issue.
     * @param playerName - The name of the player who should send the command. Optional. Defaults to "Kyra".
     */
    async function runCommand(commandStr: string, playerName: string = "Kyra") {
        const message = createMockMessage({ author: testGame.entityFinder.getPlayer(playerName).member });
        return await ClientContext.instance.commandHandler.executeCommand(commandStr, testGame, message);
    }

    test("blocks crafting when player has 'disable craft' behavior attribute", async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const replySpy = vi.spyOn(testGame.communicationHandler, "reply");
        player.inflict(testGame.entityFinder.getStatusEffect("paralyzed"));

        const result = await runCommand("craft COFFEE and GLASSES");
        expect(result).toBe(false);
        expect(replySpy).toBeInvokedWith(expect.anything(),
            "You cannot do that because you are **paralyzed**.");
        player.cure(testGame.entityFinder.getStatusEffect("paralyzed"));
    });

    test("errors when neither item is in the player's hands", async () => {
        const replySpy = vi.spyOn(testGame.communicationHandler, "reply");
        // GLASSES and RED TIE are equipped, not held.
        const result = await runCommand("craft GLASSES and RED TIE");
        expect(result).toBe(false);
        expect(replySpy).toBeInvokedWith(expect.anything(),
            `Couldn't find items "GLASSES" and "RED TIE" in either of your hands.`);
    });

    test("errors when only the first item is not in the player's hands", async () => {
        const replySpy = vi.spyOn(testGame.communicationHandler, "reply");
        // GLASSES is equipped, COFFEE is in RIGHT HAND.
        const result = await runCommand("craft GLASSES with COFFEE");
        expect(result).toBe(false);
        expect(replySpy).toBeInvokedWith(expect.anything(),
            `Couldn't find item "GLASSES" in either of your hands.`);
    });

    test("errors when only the second item is not in the player's hands", async () => {
        const replySpy = vi.spyOn(testGame.communicationHandler, "reply");
        // COFFEE is in RIGHT HAND, RED TIE is equipped.
        const result = await runCommand("craft COFFEE with RED TIE");
        expect(result).toBe(false);
        expect(replySpy).toBeInvokedWith(expect.anything(),
            `Couldn't find item "RED TIE" in either of your hands.`);
    });

    test("errors when items are held but no matching recipe exists", async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        setHandItems(player, "PEN", "FORK");
        const replySpy = vi.spyOn(testGame.communicationHandler, "reply");
        const result = await runCommand("craft PEN with FORK");
        expect(result).toBe(false);
        // Items are sorted alphabetically by prefab ID in the error message.
        expect(replySpy).toBeInvokedWith(expect.anything(),
            `Couldn't find recipe requiring FORK and PEN. Contact a moderator if you think there should be one.`);
    });

    test("handles items with multi-word names like ORANGE JUICE", async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        setHandItems(player, "ORANGE JUICE", "FORK");
        const replySpy = vi.spyOn(testGame.communicationHandler, "reply");
        const result = await runCommand("craft ORANGE JUICE and FORK");
        expect(result).toBe(false);
        // No recipe exists, so we get the recipe error
        expect(replySpy).toBeInvokedWith(expect.anything(),
            expect.stringContaining("Couldn't find recipe requiring"));
    });

    test("crafts successfully when held items match a recipe", async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const { right, left } = setHandItems(player, "MILK", "CLEAN BOWL");
        const performCraftSpy = vi.spyOn(CraftAction.prototype, "performCraft");
        const result = await runCommand("craft BOWL and MILK");
        expect(result).toBe(true);
        const recipes = testGame.entityFinder.getRecipes("crafting");
        const recipe = recipes.find(recipe => player.canCraft(recipe, [right, left]));
        expect(performCraftSpy).toBeInvokedWith(left, right, recipe);
    });

    test("crafts successfully when held items include separators in name", async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const { right, left } = setHandItems(player, "POT OF SPAGHETTI AND MEATBALLS", "RAGU");
        const performCraftSpy = vi.spyOn(CraftAction.prototype, "performCraft");
        const result = await runCommand("craft SPAGHETTI AND MEATBALLS and RAGU");
        expect(result).toBe(true);
        const recipes = testGame.entityFinder.getRecipes("crafting");
        const recipe = recipes.find(recipe => player.canCraft(recipe, [right, left]));
        expect(performCraftSpy).toBeInvokedWith(right, left, recipe);
    });

    test("crafts successfully when held items include separators in name in reverse order", async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const { right, left } = setHandItems(player, "POT OF SPAGHETTI AND MEATBALLS", "RAGU");
        const performCraftSpy = vi.spyOn(CraftAction.prototype, "performCraft");
        const result = await runCommand("craft RAGU and SPAGHETTI AND MEATBALLS");
        expect(result).toBe(true);
        const recipes = testGame.entityFinder.getRecipes("crafting");
        const recipe = recipes.find(recipe => player.canCraft(recipe, [right, left]));
        expect(performCraftSpy).toBeInvokedWith(left, right, recipe);
    });
});
