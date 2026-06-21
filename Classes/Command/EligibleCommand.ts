// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Command from "./Command.ts";
import type EligibleContext from "./EligibleContext.ts";
import type { MatchedInvocation, ValidatedInvocation, ValidationResult } from "./Invocation.ts";

/**
 * Abstract new-generation command usable by a Discord user with the eligible role.
 */
export default abstract class EligibleCommand extends Command {
    abstract override validate(context: EligibleContext, invocation: MatchedInvocation): Promise<ValidationResult>;
    abstract override execute(context: EligibleContext, invocation: ValidatedInvocation): Promise<void>;
}
