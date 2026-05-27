// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Command from "./Command.ts";
import type ModeratorContext from "./ModeratorContext.ts";

/**
 * Abstract new-generation command usable by a moderator.
 */
export default abstract class ModeratorCommand extends Command {
    /**
     * The code to execute when the command is called.
     */
    abstract readonly execute: (context: ModeratorContext) => Promise<void>;
}
