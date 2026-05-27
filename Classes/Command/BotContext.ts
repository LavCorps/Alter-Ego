// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Context from "./Context.ts"

/**
 * Represents the command context of a new-generation bot command.
 */
export default class BotContext extends Context {
    /**
     * Alias the command was invoked with.
     */
    readonly invoked: string;

    /**
     * @param invoked - The alias the command was invoked with.
     */
    private constructor(invoked: string) {
        super()
        this.invoked = invoked;
    }
}
