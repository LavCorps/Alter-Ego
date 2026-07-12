// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PlayerCommand from "../../Classes/PlayerCommand.ts";
import { usage, execute, config } from "../../Commands/unstash_player.js";
import UnstashAction from "../../Data/Actions/UnstashAction.ts";
import { clearQueue, sendQueuedMessages } from "../../Modules/messageHandler.ts";
import { createMockMessage } from "../__mocks__/libs/discord.js";

describe("unstash_player command", () => {
    beforeAll(async () => {
        if (!testGame.inProgress) await testGame.entityLoader.loadAll();
    });

    afterEach(async () => {
        await testGame.entityLoader.loadInventoryItems(false);
        clearQueue(testGame);
        vi.resetAllMocks();
    });

    const unstash_player = new PlayerCommand(config, usage, execute);

    test("valid item from valid container", async () => {
        const player = testGame.entityFinder.getPlayer("Vivian");
        const container = testGame.entityFinder.getInventoryItem("PACK OF TOILET PAPER 2", player.name);
        const [slot] = container.inventory.values();
        const [item] = slot.items;
        const spy = vi.spyOn(UnstashAction.prototype, "performUnstash");
        // @ts-ignore
        await unstash_player.execute(testGame, createMockMessage(), "retrieve", ["hamburger", "bun", "from", "pack", "of", "toilet", "paper"], player);
        expect(spy).toBeInvokedWith(item, expect.toBeOneOf(testGame.entityFinder.getPlayerHands(player)), container, slot);
    });
    test("valid item without specified container", async () => {
        const player = testGame.entityFinder.getPlayer("Vivian");
        const containers = [testGame.entityFinder.getInventoryItem("PACK OF TOILET PAPER 2", player.name).container, testGame.entityFinder.getInventoryItem("PACK OF TOILET PAPER 3", player.name).container];
        const slots = containers.flatMap(item => Array.from(item.inventory.values()));
        const items = slots.flatMap(slot => slot.items).filter(item => item.name === "PACK OF TOILET PAPER");
        const spy = vi.spyOn(UnstashAction.prototype, "performUnstash");
        // @ts-ignore
        await unstash_player.execute(testGame, createMockMessage(), "retrieve", ["pack", "of", "toilet", "paper"], player);
        expect(spy).toBeInvokedWith(expect.toBeOneOf(items), expect.toBeOneOf(testGame.entityFinder.getPlayerHands(player)), expect.toBeOneOf(containers), expect.toBeOneOf(slots));
    });
    test("valid item with item of same name in hand", async () => {
        const player = testGame.entityFinder.getPlayer("Vivian");
        const spy = vi.spyOn(UnstashAction.prototype, "performUnstash");
        // @ts-ignore
        await unstash_player.execute(testGame, createMockMessage(), "retrieve", ["pack", "of", "toilet", "paper"], player);
        // @ts-ignore
        await unstash_player.execute(testGame, createMockMessage(), "retrieve", ["pack", "of", "toilet", "paper"], player);
        expect(spy).toHaveBeenCalledTimes(2);
    });
    test("invalid item from valid container", async () => {
        const player = testGame.entityFinder.getPlayer("Vivian");
        const message = createMockMessage();
        const author = message.author;
        const spy = vi.spyOn(UnstashAction.prototype, "performUnstash");
        // @ts-ignore
        await unstash_player.execute(testGame, message, "retrieve", ["hamburger", "from", "pack", "of", "toilet", "paper"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith("Couldn't find \"PACK OF TOILET PAPER\" in your inventory containing \"HAMBURGER\".");
    });
    test("valid item from invalid container", async () => {
        const player = testGame.entityFinder.getPlayer("Vivian");
        const message = createMockMessage();
        const author = message.author;
        const spy = vi.spyOn(UnstashAction.prototype, "performUnstash");
        // @ts-ignore
        await unstash_player.execute(testGame, message, "retrieve", ["hamburger", "bun", "from", "bag", "of", "toilet", "paper"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith("Couldn't find \"BAG OF TOILET PAPER\" in your inventory containing \"HAMBURGER BUN\".");
    });
    test("no free hand", async () => {
        const player = testGame.entityFinder.getPlayer("Vivian");
        const message = createMockMessage();
        const author = message.author;
        const spy = vi.spyOn(UnstashAction.prototype, "performUnstash");
        // @ts-ignore
        await unstash_player.execute(testGame, message, "retrieve", ["hamburger", "bun", "from", "pack", "of", "toilet", "paper"], player);
        // @ts-ignore
        await unstash_player.execute(testGame, message, "retrieve", ["detergent", "from", "pack", "of", "toilet", "paper"], player);
        // @ts-ignore
        await unstash_player.execute(testGame, message, "retrieve", ["pack", "of", "toilet", "paper", "from", "white", "jeans"], player);
        await sendQueuedMessages(testGame);
        expect(spy).toHaveBeenCalledTimes(2);
        expect(author.send).toBeInvokedWith("You do not have a free hand to retrieve an item. Either drop an item you're currently holding or stash it in one of your equipped items.");
    });
    test("valid item without container", async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const message = createMockMessage();
        const author = message.author;
        const spy = vi.spyOn(UnstashAction.prototype, "performUnstash");
        // @ts-ignore
        await unstash_player.execute(testGame, message, "retrieve", ["coffee"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith("COFFEE is not contained in another item and cannot be unstashed.");
    });
});
