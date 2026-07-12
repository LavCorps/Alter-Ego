// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PlayerCommand from '../../Classes/PlayerCommand.ts';
import { usage, execute, config } from '../../Commands/unequip_player.js'
import UnequipAction from '../../Data/Actions/UnequipAction.ts';
import { clearQueue, sendQueuedMessages } from '../../Modules/messageHandler.ts';
import { createMockMessage } from '../__mocks__/libs/discord.js';

describe('unequip_player command', () => {
    beforeAll(async () => {
        if (!testGame.inProgress) await testGame.entityLoader.loadAll();
    });

    afterEach(async () => {
        await testGame.entityLoader.loadInventoryItems(false);
        clearQueue(testGame);
        vi.resetAllMocks();
    });

    const unequip_player = new PlayerCommand(config, usage, execute);

    test('given valid item', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const item = testGame.entityFinder.getInventoryItem("kyras glasses", "Kyra");
        const slot = player.inventory.get("GLASSES");
        const hand = testGame.entityFinder.getPlayerFreeHand(player);
        const spy = vi.spyOn(UnequipAction.prototype, "performUnequip");
        // @ts-ignore
        await unequip_player.execute(testGame, createMockMessage(), "unequip", ["glasses"], player);
        expect(spy).toBeInvokedWith(item, slot, hand);
    });
    test('given valid item from valid slot', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const item = testGame.entityFinder.getInventoryItem("kyras glasses", "Kyra");
        const slot = player.inventory.get("GLASSES");
        const hand = testGame.entityFinder.getPlayerFreeHand(player);
        const spy = vi.spyOn(UnequipAction.prototype, "performUnequip");
        // @ts-ignore
        await unequip_player.execute(testGame, createMockMessage(), "unequip", ["glasses", "from", "glasses"], player);
        expect(spy).toBeInvokedWith(item, slot, hand);
    });
    test('given invalid item', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const spy = vi.spyOn(UnequipAction.prototype, "performUnequip");
        const message = createMockMessage();
        const author = message.author;
        // @ts-ignore
        await unequip_player.execute(testGame, message, "unequip", ["invalid"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith(`Couldn't find equipped item "INVALID".`);
    });
    test('given valid item from invalid (unrelated) slot', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const spy = vi.spyOn(UnequipAction.prototype, "performUnequip");
        const message = createMockMessage();
        const author = message.author;
        // @ts-ignore
        await unequip_player.execute(testGame, message, "unequip", ["glasses", "from", "jacket"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith(`Couldn't find "GLASSES" equipped to JACKET.`);
    });
    test('given valid item from invalid (nonexistent) slot', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const spy = vi.spyOn(UnequipAction.prototype, "performUnequip");
        const message = createMockMessage();
        const author = message.author;
        // @ts-ignore
        await unequip_player.execute(testGame, message, "unequip", ["glasses", "from", "invalid"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith(`Couldn't find equipment slot "INVALID".`);
    });
    test('given anything from invalid (empty) slot', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const spy = vi.spyOn(UnequipAction.prototype, "performUnequip");
        const message = createMockMessage();
        const author = message.author;
        // @ts-ignore
        await unequip_player.execute(testGame, message, "unequip", ["invalid", "from", "hat"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith(`Nothing is equipped to "HAT".`);
    });
    test('given invalid item (held in hand)', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const spy = vi.spyOn(UnequipAction.prototype, "performUnequip");
        const message = createMockMessage();
        const author = message.author;
        // @ts-ignore
        await unequip_player.execute(testGame, message, "unequip", ["coffee"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith(`You cannot unequip items from your hands. To get rid of this item, use the drop command.`);
    });
    test('without free hand', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const spy = vi.spyOn(UnequipAction.prototype, "performUnequip");
        const message = createMockMessage();
        const author = message.author;
        // @ts-ignore
        await unequip_player.execute(testGame, message, "unequip", ["glasses"], player);
        await unequip_player.execute(testGame, message, "unequip", ["tie"], player);
        await sendQueuedMessages(testGame);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(author.send).toBeInvokedWith(`You do not have a free hand to unequip an item. Either drop an item you're currently holding or stash it in one of your equipped items.`);
    });
});
