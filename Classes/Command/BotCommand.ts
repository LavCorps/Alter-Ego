// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Command from "./Command.ts";
import type BotContext from "./BotContext.ts";

/**
 * Abstract new-generation command usable by the bot.
 */
export default abstract class BotCommand extends Command {
    /**
     * The code to execute when the command is called.
     */
    abstract override execute(context: BotContext): Promise<void>;
}
