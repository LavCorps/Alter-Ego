// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PlayerCommand from "../../Classes/PlayerCommand.ts";
import { usage, execute, config } from '../../Commands/undress_player.js'
import UndressAction from "../../Data/Actions/UndressAction.ts";
import { clearQueue, sendQueuedMessages } from "../../Modules/messageHandler.ts";
import { createMockMessage } from "../__mocks__/libs/discord.js";

describe('undress_player command', () => {
    beforeAll(async () => {
        if (!testGame.inProgress) await testGame.entityLoader.loadAll();
    });

    afterEach(async () => {
        await testGame.entityLoader.loadInventoryItems(false);
        await testGame.entityLoader.loadRoomItems(false);
        clearQueue(testGame);
        vi.resetAllMocks();
    });

    const undress_player = new PlayerCommand(config, usage, execute);

    test('valid invocation', async () => {
        const player = testGame.entityFinder.getPlayer("Kyra");
        const fixture = testGame.entityFinder.getFixture("FLOOR", "suite-9");
        const spy = vi.spyOn(UndressAction.prototype, "performUndress");
        // @ts-ignore
        await undress_player.execute(testGame, createMockMessage(), "undress", ["floor"], player);
        expect(spy).toBeInvokedWith(fixture, null);
    });
});
