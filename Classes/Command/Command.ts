// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type GameSettings from "../GameSettings.ts";
import type Context from "./Context.ts";
import type { Invocation, ValidInvocation } from "./Invocation.ts";
import type { Pattern } from "./Pattern.ts";

/**
 * Abstract base class for all new-generation commands.
 */
export default abstract class Command {
    /**
     * The specific configuration of the command.
     */
    abstract readonly config: CommandConfig;

    /**
     * Examples of the command's usage.
     */
    abstract usage(settings: GameSettings): string;

    /**
     * Grammar patterns for the command.
     */
    abstract readonly patterns: Pattern[];

    /**
     * The code to execute when the command is called, inputs matched to at least one pattern, but the invocation is not yet validated.
     */
    abstract validate(context: Context, invocation: ValidInvocation): Promise<Invocation>;

    /**
     * The code to execute when the command is called, and the invocation has been validated.
     */
    abstract execute(context: Context, invocation: ValidInvocation): Promise<void>;
}
