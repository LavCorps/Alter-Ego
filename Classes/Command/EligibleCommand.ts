// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Command from "./Command.ts";
import type EligibleContext from "./EligibleContext.ts";

/**
 * Abstract new-generation command usable by a Discord user with the eligible role.
 */
export default abstract class EligibleCommand extends Command {
    /**
     * The code to execute when the command is called.
     */
    abstract override execute(context: EligibleContext): Promise<void>;
}
