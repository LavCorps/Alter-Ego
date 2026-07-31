// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PlayerCommand from '../../Classes/PlayerCommand.ts';
import { usage, execute, config } from '../../Commands/knock_player.js'
import KnockAction from '../../Data/Actions/KnockAction.ts';
import { clearQueue, sendQueuedMessages } from '../../Modules/messageHandler.ts';
import { createMockMessage } from '../__mocks__/libs/discord.js';

describe('knock_player command', () => {
    beforeAll(async () => {
        if (!testGame.inProgress) await testGame.entityLoader.loadAll();
    });

    afterEach(async () => {
        clearQueue(testGame);
        vi.resetAllMocks();
    });

    const knock_player = new PlayerCommand(config, usage, execute);

    test('with valid exit', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const room = testGame.entityFinder.getRoom("suite-9");
        const exit = testGame.entityFinder.getExit(room, "DOOR");
        const spy = vi.spyOn(KnockAction.prototype, "performKnock");
        // @ts-ignore
        await knock_player.execute(testGame, createMockMessage(), "knock", ["door"], player);
        expect(spy).toBeInvokedWith(exit);
    });
    test('with invalid exit', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const spy = vi.spyOn(KnockAction.prototype, "performKnock");
        const message = createMockMessage();
        const author = message.author;
        // @ts-ignore
        await knock_player.execute(testGame, message, "knock", ["invalid"], player);
        await sendQueuedMessages(testGame);
        expect(spy).not.toHaveBeenCalled();
        expect(author.send).toBeInvokedWith(`Couldn't find exit "INVALID" in the room.`);
    });
});
