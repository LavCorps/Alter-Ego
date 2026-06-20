// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Command from "./Command.ts";
import type BotContext from "./BotContext.ts";
import type { Invocation, ValidInvocation } from "./Invocation.ts";

/**
 * Abstract new-generation command usable by the bot.
 */
export default abstract class BotCommand extends Command {
    abstract override validate(context: BotContext, invocation: ValidInvocation): Promise<Invocation>;
    abstract override execute(context: BotContext): Promise<void>;
}
