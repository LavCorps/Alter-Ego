// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type GameSettings from "../GameSettings.js";

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
    abstract readonly usage: (settings: GameSettings) => string;
    /**
     * Grammar patterns for the command.
     */
    abstract readonly patterns: Array<any>;
}
