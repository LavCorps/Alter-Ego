// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { InvalidInvocation, MatchedInvocation, type MatchResult } from "./Invocation.ts";
import { ConstantToken, EntityToken, PocketToken, PrepositionToken, SentinelToken, type Token } from "./Token.ts";
import type GameEntity from "../../Data/GameEntity.ts";
import { Collection } from "discord.js";
import type ItemInstance from "../../Data/ItemInstance.ts";

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

    /**
     * Returns whether this Constant is satisfied by the given token.
     * @param token - The token to check against this Constant.
     */
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

    /**
     * Returns whether this Slot is satisfied by the given token.
     * @param token - The token to check against this Slot.
     */
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

    /**
     * Returns whether this Multislot is satisfied by the given token.
     * @param token - The token to check against this Multislot.
     */
    satisfiedBy(token: EntityToken<GameEntity>): boolean {
        for (const slot of this.slots) {
            if (slot.satisfiedBy(token)) return true;
        }
        return false;
    }
}

/**
 * Preposition class representing a piece of a grammar pattern that represents the preposition of a Slot.
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
 * Pocket class representing a piece of a grammar pattern that represents an InventorySlot of a Slot representing an ItemInstance.
 */
export class Pocket implements PatternElement {
    /**
     * The name of the Slot that the Pocket refers to.
     */
    readonly name: string;

    /**
     * @param name - The name of the Slot that the Pocket refers to.
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

/** Internal-use class for passing runtime pattern matching data between innerMatch calls. */
class MatchData {
    /** Array of errors encountered while matching, such as slots that cannot be filled, or missing prepositions or constants. */
    errors: string[];

    /** Collection of PatternElements to Tokens, representing the tokens that have been successfully matched to pattern elements. */
    matches: Collection<PatternElement, Token[]>;

    /** Array of strings representing globbed user input. */
    glob: string[];

    /**
     * Array of token arrays.
     *
     * The outer array is indexed by the position of user input, while the inner array is each possible token for that position.
     */
    readonly streams: Token[][];

    /**
     * Index of the outer token array.
     *
     * This is stored in MatchData to keep token stream consumption synchronized even when sub-patterns are matched.
     */
    private streamIndex: number;

    constructor(streams: Token[][]) {
        this.errors = [];
        this.matches = new Collection();
        this.glob = [];
        this.streams = streams;
        this.streamIndex = 0;
    }

    /** Returns a boolean representing whether or not the token stream has been exhausted. */
    get exhausted(): boolean {
        return this.index >= this.streams.length;
    }

    /** Returns the current token stream for the current stream index. */
    get stream(): Token[] {
        return this.streams[this.index];
    }

    /** Moves to the stream index forward by 1, returning that token stream. This should only be used after verifying that `this.exhausted === false`. */
    next(): Token[] {
        return this.streams[++this.index];
    }

    /** Returns the current stream index. */
    get index(): number {
        return this.streamIndex;
    }

    /** Sets the stream index to an arbitrary number. Use sparingly! */
    set index(i: number) {
        this.streamIndex = i;
    }

    /** Return a clone of this MatchData. */
    clone(): MatchData {
        const data = new MatchData(this.streams);
        data.index = this.index;
        data.glob = this.glob.map((o) => o);
        data.errors = this.errors.map((o) => o);
        for (const entry of this.matches) {
            data.matches.set(entry[0], entry[1]);
        }
        return data;
    }

    /**
     * Merge two MatchData objects.
     * @param data1 - Base MatchData. Will have duplicate data overwritten by data2.
     * @param data2 - New MatchData. Will overwrite duplicate data of data1.
     */
    static merge(data1: MatchData, data2: MatchData): MatchData {
        /**
         * @privateRemarks
         * This is subject to future deletion before merging.
         * I am currently unsure if this is necessary, due to the smart clone-return logic of optional pattern matching.
         * - AC
         */
        const data = new MatchData(data1.streams);
        for (const entry of data1.matches) {
            data.matches.set(entry[0], entry[1]);
        }
        for (const entry of data2.matches) {
            data.matches.set(entry[0], entry[1]);
        }
        data.glob.concat(data2.glob);
        data.errors.concat(data1.errors);
        data2.errors.forEach((error) => {
            if (data.errors.find((e) => e === error) === undefined) data.errors.push(error);
        });
        data.index = data2.index;
        return data;
    }
}

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

    /**
     * Internal error-pushing function to consolidate formatting.
     * @param element - The PatternElement that a match failure was encountered on.
     * @param nearMatch - The string that was found instead of a valid token to fit PatternElement.
     * @param data - The MatchData of the matching function thus far.
     */
    private pushError(element: PatternElement, nearMatch: string, data: MatchData): MatchData {
        if (element instanceof Slot) {
            // this scary regex replaces all upper case characters with a space, then the lowercase version of that character.
            // for example, "InventoryItem" will become " inventory item". the leading space is obviously not desired, so the string is then trimmed.
            const slotType: string = element.type.name.replace(/([A-Z])/g, (match) => " " + match.toLowerCase()).trim();

            data.errors.push(`Couldn't find ${slotType} "${nearMatch}" in your input.`);
        } else if (element instanceof Multislot) {
            const slotTypes: string[] = [];
            for (const slot of element.slots) {
                slotTypes.push(slot.type.name.replace(/([A-Z])/g, (match) => " " + match.toLowerCase()).trim());
            }

            data.errors.push(`Couldn't find any ${slotTypes.join("/")} "${nearMatch}" in your input.`);
        } else if (element instanceof Preposition) {
            data.errors.push(`Couldn't find a valid preposition in your input, instead found ${nearMatch}.`);
        } else if (element instanceof Constant) {
            data.errors.push(`Couldn't find a required "${element.value}" in your input, instead found ${nearMatch}.`);
        }

        return data;
    }

    /**
     * Internal matching function for Patterns. Used for recursive pattern matching.
     * @param base - MatchData for the innerMatch to use. This is cloned, and if the pattern is both optional and fails to match, is returned as-is.
     */
    private innerMatch(base: MatchData): MatchData {
        let data = base.clone();

        const unmatchedIndices: Set<number> = new Set();
        const matchedIndices: Set<number> = new Set();
        const neverMatchedIndices: Set<number> = new Set();
        const nearMatchIndices: Collection<number, string[]> = new Collection();

        this.grammar.forEach((_, index) => {
            unmatchedIndices.add(index);
        });

        let finished = false;

        let grammarIndex = 0;
        let element: PatternElement;

        while (!finished) {
            element = this.grammar[grammarIndex];

            if (element instanceof Constant) {
                for (const token of data.stream) {
                    if (token instanceof ConstantToken && element.satisfiedBy(token)) {
                        data.matches.set(element, [token]);
                        matchedIndices.add(grammarIndex);
                        break;
                    }
                }
            } else if (element instanceof Slot || element instanceof Multislot) {
                // TypeScript type narrowing is unreliable in instances where type guards are not as simple as single instanceof checks
                // this is a previously encountered issue in PrettyPrinter, and was resolved by type casting
                // we repeat such gratuitous type casting tricks here
                let elementMatches: EntityToken<GameEntity>[] = data.stream.filter(token => token instanceof EntityToken && (element as Slot | Multislot).satisfiedBy(token)) as EntityToken<GameEntity>[];
                if (elementMatches.length > 0) {
                    data.matches.set(element, elementMatches);
                    matchedIndices.add(grammarIndex);
                }
            } else if (element instanceof Preposition) {
                for (const token of data.stream) {
                    if (token instanceof PrepositionToken) {
                        data.matches.set(element, [token]);
                        break;
                    }
                }
            } else if (element instanceof Glob) {
                let globbed = false;
                let stream = data.stream;
                while (!globbed) {
                    for (const token of stream) {
                        if (token instanceof SentinelToken) {
                            data.glob.push(token.value);
                            break;
                        }
                    }
                    if (data.index === data.streams.length) {
                        globbed = true;
                    } else stream = data.next();
                }
            } else if (element instanceof Pocket) {
                let elementMatches: PocketToken<ItemInstance>[] = data.stream.filter(token => token instanceof PocketToken);
                if (elementMatches.length > 0) {
                    data.matches.set(element, elementMatches);
                    matchedIndices.add(grammarIndex);
                }
            } else if (element instanceof Pattern) {
                data = element.innerMatch(data);
            }

            if (!data.matches.has(element) && !(element instanceof Pattern) && !(element instanceof Glob)) {
                // this is an error state. if this pattern is optional, we should simply abandon matching this pattern.
                if (this.optional) return base;
                // this is an error state: we have gone over all possibilities, and the element has not been matched.
                // this kind of error severs the anchor between the token streams and the grammar pattern, even if there are still valid tokens to match to the pattern.
                // this section of code is tasked with the unenviable job of finding the nearest anchor for reorientation.
                // for this task, we will find the distance to the closest preposition or constant, and consider everything between here and there "unrecoverable".
                // no matter what, this now concludes with errors. the purpose of this is to minimize those errors.
                let searchingPattern = true;
                let searchingStream = true;
                let preposition = false;
                let constant = false;
                let patternSearchIndex = grammarIndex + 1;
                let streamSearchIndex = data.index + 1;
                let patternAnchorIndex: number;
                let streamAnchorIndex: number;

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
                    if (streamSearchIndex >= data.streams.length) searchingStream = false;
                    else if (
                        data.streams[streamSearchIndex].filter(
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
                    // this is the worst error state of this block. we are completely misaligned, and cannot realign ourselves.
                    // since this pattern is not optional, we need to do a little bit of extra work to load in errors before returning.
                    const nearMatchGlob: string[] = [];
                    while (!data.exhausted) {
                        nearMatchGlob.push(data.stream.find((token) => token instanceof SentinelToken).value);
                        data.next();
                    }

                    return this.pushError(element, nearMatchGlob.join(" "), data);
                } else {
                    const nearMatchGlob: string[] = [];
                    // currentIndex must not be rolled into the for loop, or else iteration will run half as long as desired.
                    const currentIndex = data.index;

                    for (let i = 0; i < streamAnchorIndex - currentIndex; i++) {
                        // the logic here might be a little confusing. the streamAnchorIndex is our anchor to return to "normalcy".
                        // in order to provide reasonably detailed and accurate error messages, we should "glob" everything between here and one index before the stream anchor.
                        // we can then use this to provide an error message that says a required command argument was unfulfilled.
                        nearMatchGlob.push(data.stream.find((token) => token instanceof SentinelToken).value);
                        data.next();
                    }

                    nearMatchIndices.set(grammarIndex, nearMatchGlob);
                }

                data = this.pushError(element, nearMatchIndices.get(grammarIndex).join(" "), data);

                grammarIndex = patternAnchorIndex;
            } else {
                grammarIndex++;
                data.next();

                finished = grammarIndex >= this.grammar.length || data.exhausted;
            }
        }

        // TODO: if the size of neverMatchedIndices is greater than 0, we should complain quite loudly
        for (const index of unmatchedIndices) {
            if (!matchedIndices.has(index)) neverMatchedIndices.add(index);
        }

        data = this.matchPrepositions(data);

        if (this.optional && data.errors.length > 0) return base;
        else return data;
    }

    /**
     * Validates that prepositions match their referred slots
     * @param base - MatchData to validate prepositions for.
     */
    private matchPrepositions(base: MatchData): MatchData {
        // let data = base.clone();

        return base;
    }

    /**
     * Match a stream of tokens to this pattern. Returns a MatchedInvocation on success, or an InvalidInvocation on error.
     * @param streams - The stream of tokens to attempt to match to the pattern.
     */
    match(streams: Token[][]): MatchResult {
        const data = this.innerMatch(new MatchData(streams));
        console.log(data);
        if (data.errors.length > 0) return new InvalidInvocation(data.errors);
        else {
            const args: Collection<string, GameEntity[]> = new Collection();
            data.matches.forEach((val, key) => {
                if (key instanceof Slot || key instanceof Multislot)
                    args.set(
                        key.name,
                        val.map((token: EntityToken<GameEntity>) => token.reference),
                    );
            });
            return new MatchedInvocation(args);
        }
    }
}
