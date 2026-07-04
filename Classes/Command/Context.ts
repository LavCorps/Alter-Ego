// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Game from "../../Data/Game.ts";
import type { Pattern } from "./Pattern.ts";
import type { Token } from "./Token.ts";

/**
 * Represents the command context of a new-generation command.
 */
export default abstract class Context {
    /**
     * Alias the command was invoked with.
     */
    abstract readonly invokedAlias: string;

    /**
     * The game containing all objects of this context.
     */
    readonly game: Game;

    /**
     * @param game - The Game the Context belongs to.
     */
    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Gather the lexicon for tokenizing from a given context.
     * @param patterns - The command patterns to use for determining which tokens to gather.
     */
    abstract getLexicon(patterns: Pattern[]): Token[];
}
