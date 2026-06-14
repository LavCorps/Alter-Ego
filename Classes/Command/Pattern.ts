// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Convenience alias for 0 in defining Constant pattern elements. */
export const CONSTANT = 0;

/** Convenience alias for 1 in defining Slot pattern elements. */
export const SLOT = 1;

/** Convenience alias for 2 in defining Reference pattern elements. */
export const PREPOSITION = 2;

/** Convenience alias for 3 in defining Glob pattern elements. */
export const GLOB = 3;

/** Type union for PatternElement types */
export type ElementTypes = typeof CONSTANT | typeof SLOT | typeof PREPOSITION | typeof GLOB;

/** Convenience alias for 0 in defining Player Slot pattern elements. */
export const PLAYER = 0;

/** Convenience alias for 1 in defining Inventory Item Slot pattern elements. */
export const INVENTORYITEM = 1;

/** Type union for Slot.type types */
export type SlotTypes = typeof PLAYER | typeof INVENTORYITEM;

/**
 * Base interface representing a pattern element.
 */
export interface PatternElement {
    /**
     * The "kind" of the PatternElement. Should be either 0 (constant), 1 (slot), or 2 (dynamic)
     */
    readonly kind: ElementTypes;
}

/**
 * Special sentinel interface representing a Constant in a Pattern.
 *
 * This interface represents a constant value that must always be present in a Pattern for it to be considered valid.
 */
export interface Constant extends PatternElement {
    /**
     * Constants are kind 0 of PatternElement.
     */
    readonly kind: typeof CONSTANT;

    /**
     * The data of the Constant sentinel.
     */
    readonly value: string;
}

/**
 * Helper function for constructing Constant pattern elements.
 * @param value - The data of the Constant sentinel.
 */
export function constant(value: string): Constant {
    return { kind: CONSTANT, value: value };
}

/**
 * Slot interface representing a slot in a grammar pattern for a tokenized argument.
 */
export interface Slot extends PatternElement {
    /**
     * Slots are kind 1 of PatternElement.
     */
    readonly kind: typeof SLOT;

    /**
     * The name to refer to the Slot with. Inherited by any Tokens that fit the Slot.
     */
    readonly name?: string;

    /**
     * The type of the Slot. Tokens must match this type to fit into the Slot.
     */
    readonly type: SlotTypes;
}

/**
 * Helper function for constructing Slot pattern elements.
 * @param type - The type of the Slot. Tokens must match this type to fit into the Slot.
 * @param name - The name to refer to the Slot with. Inherited by any Tokens that fit the Slot.
 */
export function slot(type: SlotTypes, name?: string): Slot {
    return { kind: SLOT, type: type, name: name };
}

/**
 * Preposition interface representing a piece of a grammar pattern that represents the preposition of a Slot.
 */
export interface Preposition extends PatternElement {
    /**
     * Prepositions are kind 2 of PatternElement.
     */
    readonly kind: typeof PREPOSITION;

    /**
     * The name of the Slot that the Dynamic refers to.
     */
    readonly name: string;
}

/**
 * Helper function for constructing Preposition pattern elements.
 * @param name - The name of the Slot that the Dynamic refers to.
 */
export function preposition(name: string): Preposition {
    return { kind: PREPOSITION, name: name };
}

/**
 * Preposition interface representing a piece of a grammar pattern that represents the preposition of a Slot.
 */
export interface Glob extends PatternElement {
    /**
     * Globs are kind 3 of PatternElement.
     */
    readonly kind: typeof GLOB;
}

/**
 * Helper function for constructing Glob pattern elements.
 */
export function glob(): Glob {
    return { kind: GLOB };
}

/**
 * Grammar pattern representing a command syntax.
 */
export default class Pattern {
    /**
     * The grammar of the pattern.
     *
     * This is an ordered Array, containing Constants, Slots, and other Patterns representing the grammar pattern of a desired command syntax.
     */
    readonly grammar: Array<Constant | Slot | Preposition | Glob | Pattern>;

    /**
     * Whether the fulfillment of this Pattern is optional or not. This is most useful for optional sub-patterns.
     */
    readonly optional: boolean;

    /**
     * @param grammar - The grammar of the pattern. This is an ordered array, containing pattern elements, as well as other patterns.
     * @param optional - Whether the fulfillment of this Pattern is optional or not. This is most useful for optional sub-patterns.
     */
    constructor(grammar: Array<Constant | Slot | Preposition | Glob | Pattern>, optional: boolean = false) {
        this.grammar = grammar;
        this.optional = optional;
    }
}

/**
 * Helper function for constructing Patterns.
 * @param grammar - The grammar of the pattern. This is an ordered array, containing pattern elements, as well as other patterns.
 * @param optional - Whether the fulfillment of this Pattern is optional or not. This is most useful for optional sub-patterns.
 */
export function pattern(
    grammar: Array<Constant | Slot | Preposition | Glob | Pattern>,
    optional: boolean = false,
): Pattern {
    return new Pattern(grammar, optional);
}
