// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PlayerCommand from "../../Classes/PlayerCommand.ts";
import { usage, execute, config } from '../../Commands/steal_player.js'
import { clearQueue, sendQueuedMessages } from "../../Modules/messageHandler.ts";
import { createMockMessage } from "../__mocks__/libs/discord.js";

describe('steal_player command', () => {
    afterEach(async () => {
        clearQueue(testGame);
        vi.resetAllMocks();
    });

    const steal_player = new PlayerCommand(config, usage, execute);

    test('', async () => {});
});
