// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type GameSettings from "./GameSettings.ts";

export default abstract class Command implements ICommand {
    /**
     * The specific configuration of the command.
     */
    readonly config: CommandConfig;
    /**
     * Examples of the command's usage.
     */
    readonly usage: (settings: GameSettings) => string;
    
    protected constructor(config: CommandConfig, usage: (settings: GameSettings) => string) {
        this.config = config;
        this.usage = usage;
    }
}