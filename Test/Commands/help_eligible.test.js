// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import EligibleCommand from '../../Classes/EligibleCommand.ts';
import { usage, execute, config } from '../../Commands/help_eligible.js'
import { clearQueue } from '../../Modules/messageHandler.ts';

describe('help_eligible command', () => {
    afterEach(async () => {
        clearQueue(testGame);
        vi.resetAllMocks();
    });

    const help_eligible = new EligibleCommand(config, usage, execute);

    test('', async () => {});
});
