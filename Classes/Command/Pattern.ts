// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Invocation } from "./Invocation.ts";
import { ConstantToken, EntityToken, PrepositionToken, SentinelToken, type Token } from "./Token.ts";
import type GameEntity from "../../Data/GameEntity.ts";
import { Collection } from "discord.js";

/**
 * Base interface representing a pattern element.
 */
interface PatternElement {}

/**
 * Special sentinel class representing a Constant in a Pattern.
 *
 * This class represents a constant value that must always be present in a Pattern for it to be considered valid.
 */
export class Constant implements PatternElement {
    /**
     * The data of the Constant sentinel.
     */
    readonly value: string;

    /**
     * @param value - The data of the Constant sentinel.
     */
    constructor(value: string) {
        this.value = value;
    }

    satisfiedBy(token: ConstantToken): boolean {
        return token.value === this.value;
    }
}

/**
 * Slot class representing a slot in a grammar pattern for a tokenized argument.
 */
export class Slot<T extends GameEntity = GameEntity> implements PatternElement {
    /**
     * The type of the Slot. Tokens must match this type to fit into the Slot.
     */
    readonly type: { new (...args: any[]): T };
    /**
     * The name to refer to the Slot with. Inherited by any Tokens that fit the Slot.
     */
    readonly name: string;

    /**
     * @param type - The type of the Slot. Tokens must match this type to fit into the Slot.
     * @param name - The name to refer to the Slot with. Inherited by any Tokens that fit the Slot.
     */
    constructor(type: { new (...args: any[]): T }, name: string) {
        this.type = type.prototype.constructor as { new (...args: any[]): T };
        this.name = name;
    }

    satisfiedBy(token: EntityToken<GameEntity>): boolean {
        return this.type.name === token.reference.getEntityType();
    }
}

/**
 * Multislot class representing a piece of a grammar pattern that represents a Multislot.
 */
export class Multislot implements PatternElement {
    /**
     * The slots that make up the Multislot.
     */
    readonly slots: Set<Slot>;
    /**
     * The name to refer to the Multislot with. Inherited by any Tokens that fit the Slot.
     */
    readonly name: string;

    /**
     * @param slots - The slots that make up the Multislot.
     * @param name - The name to refer to the Multislot with. Inherited by any Tokens that fit the Slot.
     */
    constructor(slots: Set<Slot>, name: string) {
        this.slots = slots;
        this.name = name;
    }

    satisfiedBy(token: EntityToken<GameEntity>): boolean {
        for (const slot of this.slots) {
            if (slot.satisfiedBy(token)) return true;
        }
        return false;
    }
}

/**
 * Preposition interface representing a piece of a grammar pattern that represents the preposition of a Slot.
 */
export class Preposition implements PatternElement {
    /**
     * The name of the Slot that the Preposition refers to.
     */
    readonly name: string;

    /**
     * @param name - The name of the Slot that the Preposition refers to.
     */
    constructor(name: string) {
        this.name = name;
    }
}

/**
 * Glob interface representing a piece of a grammar pattern that represents a Glob.
 *
 * Globs must ALWAYS be the final Element of a Pattern!
 */
export class Glob implements PatternElement {}

/**
 * Grammar pattern representing a command syntax.
 */
export class Pattern implements PatternElement {
    /**
     * The grammar of the pattern.
     *
     * This is an ordered Array, containing Constants, Slots, and other Patterns representing the grammar pattern of a desired command syntax.
     */
    readonly grammar: Array<PatternElement>;

    /**
     * Whether the fulfillment of this Pattern is optional or not. This is most useful for optional sub-patterns.
     */
    readonly optional: boolean;

    /**
     * @param grammar - The grammar of the pattern. This is an ordered array, containing pattern elements, as well as other patterns.
     * @param optional - Whether the fulfillment of this Pattern is optional or not. This is most useful for optional sub-patterns. Defaults to false.
     */
    constructor(grammar: Array<PatternElement>, optional: boolean = false) {
        this.grammar = grammar;
        this.optional = optional;
    }

    match(streams: Token[][]): Invocation {
        const errors: string[] = [];
        const matches: Collection<PatternElement, Token[]> = new Collection();
        const glob: string[] = [];
        const unmatchedIndices: Set<number> = new Set();
        const matchedIndices: Set<number> = new Set();
        const neverMatchedIndices: Set<number> = new Set();
        const nearMatchIndices: Collection<number, string> = new Collection();

        this.grammar.forEach((_, index) => {
            unmatchedIndices.add(index);
        });

        let finished = false;

        let grammarIndex = 0;
        let element: PatternElement;
        let streamIndex = 0;
        let stream: Token[];

        while (!finished) {
            element = this.grammar[grammarIndex];
            stream = streams[streamIndex];

            if (element instanceof Constant) {
                for (const token of stream) {
                    if (token instanceof ConstantToken && element.satisfiedBy(token)) {
                        matches.set(element, [token]);
                        matchedIndices.add(grammarIndex);
                        break;
                    }
                }
            } else if (element instanceof Slot || element instanceof Multislot) {
                let elementMatches: Token[] = [];
                for (const token of stream) {
                    if (token instanceof EntityToken && element.satisfiedBy(token)) {
                        elementMatches.push(token);
                        matchedIndices.add(grammarIndex);
                    }
                }
                if (elementMatches.length > 0) matches.set(element, elementMatches);
            } else if (element instanceof Preposition) {
                for (const token of stream) {
                    if (token instanceof PrepositionToken) {
                        matches.set(element, [token]);
                        break;
                    }
                }
            } else if (element instanceof Glob) {
                let globbed = false;
                while (!globbed) {
                    for (const token of stream) {
                        if (token instanceof SentinelToken) {
                            glob.push(token.value);
                            break;
                        }
                    }
                    if (streamIndex === streams.length) {
                        globbed = true;
                    } else streamIndex++;
                }
            } else if (element instanceof Pattern) {
                throw new Error("match() PATTERN RECURSION: NOT IMPLEMENTED");
                // TODO: recursive pattern matching with optional handling
            }

            console.log(
                `${matches.has(element) ? "SUCCESSFULLY matched" : "FAILED to match"} token to pattern element`,
            );

            if (!matches.has(element) && !(element instanceof Pattern)) {
                // this is an error state: we have gone over all possibilities, and the element has not been matched.
                // this kind of error severs the anchor between the token streams and the grammar pattern, even if there are still valid tokens to match to the pattern.
                // this section of code is tasked with the unenviable job of finding the nearest anchor for reorientation.
                // for this task, we will find the distance to the closest preposition or constant, and consider everything between here and there "unrecoverable".
                let searchingPattern = true;
                let searchingStream = true;
                let preposition = false;
                let constant = false;
                let patternSearchIndex = grammarIndex + 1;
                let streamSearchIndex = streamIndex + 1;
                let patternAnchorIndex;
                let streamAnchorIndex;

                while (searchingPattern) {
                    if (patternSearchIndex >= this.grammar.length) searchingPattern = false;
                    else if (this.grammar[patternSearchIndex] instanceof Constant) {
                        patternAnchorIndex = patternSearchIndex;
                        constant = true;
                        searchingPattern = false;
                    } else if (this.grammar[patternSearchIndex] instanceof Preposition) {
                        patternAnchorIndex = patternSearchIndex;
                        constant = true;
                        searchingPattern = false;
                    } else patternSearchIndex++;
                }
                while (searchingStream) {
                    if (streamSearchIndex >= streams.length) searchingStream = false;
                    else if (
                        streams[streamSearchIndex].filter(
                            (token) =>
                                (preposition && token instanceof PrepositionToken) ||
                                (constant && token instanceof ConstantToken),
                        ).length > 0
                    ) {
                        streamAnchorIndex = streamSearchIndex;
                        searchingStream = false;
                    } else streamSearchIndex++;
                }

                if (patternAnchorIndex === undefined || streamAnchorIndex === undefined) {
                    throw new Error("match() UNRECOVERABLE ERROR STATE: NOT IMPLEMENTED")
                } else {
                    let recovering = true;

                    while (recovering) {
                        recovering = false;
                    }
                }

                throw new Error("match() ERROR STATE: NOT IMPLEMENTED");
                // TODO: error state: what pattern did we miss? what input was given that did not tokenize correctly? after determining this information and loading it into the `errors` array, step grammar and/or stream indices forward until we are back in alignment...?
            } else {
                grammarIndex++;
                streamIndex++;

                if (grammarIndex >= this.grammar.length || streamIndex >= streams.length) finished = true;
            }
        }

        for (const index of unmatchedIndices) {
            if (!matchedIndices.has(index)) neverMatchedIndices.add(index);
        }

        console.log(neverMatchedIndices);

        console.log(matches);
        throw new Error("match() RETURN: NOT IMPLEMENTED");
    }
}
