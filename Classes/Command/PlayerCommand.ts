// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Command from "./Command.ts";
import type PlayerContext from "./PlayerContext.ts";

/**
 * Abstract new-generation command usable by a player.
 */
export default abstract class PlayerCommand extends Command {
    /**
     * The code to execute when the command is called.
     */
    abstract readonly execute: (context: PlayerContext) => Promise<void>;
}
