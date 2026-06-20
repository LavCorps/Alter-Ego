// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Command from "./Command.ts";
import type EligibleContext from "./EligibleContext.ts";
import type { Invocation, ValidInvocation } from "./Invocation.ts";

/**
 * Abstract new-generation command usable by a Discord user with the eligible role.
 */
export default abstract class EligibleCommand extends Command {
    abstract override validate(context: EligibleContext, invocation: ValidInvocation): Promise<Invocation>;
    abstract override execute(context: EligibleContext): Promise<void>;
}
