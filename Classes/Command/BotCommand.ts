// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Command from "./Command.ts";
import type BotContext from "./BotContext.ts";
import type { MatchedInvocation, ValidatedInvocation, ValidationResult } from "./Invocation.ts";

/**
 * Abstract new-generation command usable by the bot.
 */
export default abstract class BotCommand extends Command {
    abstract override validate(context: BotContext, invocation: MatchedInvocation): Promise<ValidationResult>;
    abstract override execute(context: BotContext, invocation: ValidatedInvocation): Promise<void>;
}
