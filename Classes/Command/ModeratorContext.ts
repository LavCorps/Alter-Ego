// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Represents the command context of a new-generation moderator command.
 */
export default class ModeratorContext {
    /**
     * Alias the command was invoked with.
     */
    private readonly invoked: string;

    /**
     * Message that invoked the command.
     */
    private readonly message: UserMessage;

    /**
     * @param invoked - The alias the command was invoked with.
     * @param message - The message that invoked the command.
     *
     */
    private constructor(invoked: string, message: UserMessage) {
        this.invoked = invoked;
        this.message = message;
    }
}
