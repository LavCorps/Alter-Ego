// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { LexiconEntry } from "./LexiconEntry.ts";

/**
 * Represents the command context of a new-generation command.
 */
export default abstract class Context {
    /**
     * Alias the command was invoked with.
     */
    abstract readonly invoked: string;

    /**
     * Gather the lexicon for tokenizing from a given context.
     */
    abstract getLexicon(): LexiconEntry[];
}
