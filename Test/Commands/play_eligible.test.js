// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import EligibleCommand from '../../Classes/EligibleCommand.ts';
import { usage, execute, config } from '../../Commands/play_eligible.js'
import { clearQueue } from '../../Modules/messageHandler.ts';

describe('play_eligible command', () => {
    afterEach(async () => {
        clearQueue(testGame);
        vi.resetAllMocks();
    });

    const play_eligible = new EligibleCommand(config, usage, execute);

    test('', async () => {});
});
