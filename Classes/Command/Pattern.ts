// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Convenience alias for 0 in defining Constant pattern elements. */
export const CONSTANT = 0;

/** Convenience alias for 1 in defining Slot pattern elements. */
export const SLOT = 1;

/** Convenience alias for 2 in defining Reference pattern elements. */
export const REFERENCE = 2;

/** Type union for PatternElement types */
export type ElementTypes = typeof CONSTANT | typeof SLOT | typeof REFERENCE;

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
    readonly kind: 0;

    /**
     * The data of the Constant sentinel.
     */
    readonly value: string;
}

/**
 * Slot interface representing a slot in a grammar pattern for a tokenized argument.
 */
export interface Slot extends PatternElement {
    /**
     * Slots are kind 1 of PatternElement.
     */
    readonly kind: 1;

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
 * Reference interface representing a piece of a grammar pattern that references the data of another argument.
 */
export interface Reference extends PatternElement {
    /**
     * References are kind 2 of PatternElement.
     */
    readonly kind: 2;

    /**
     * The name of the Slot that the Dynamic refers to.
     */
    readonly name: string;

    /**
     * The attribute of the Slot that the Dynamic should fulfill. This should be a string attribute on a real Token.
     */
    readonly attribute: string;
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
    readonly grammar: Array<Constant | Slot | Reference | Pattern>;

    /**
     * Whether the fulfillment of this Pattern is optional or not.
     */
    readonly optional: boolean;

    constructor(grammar: Array<Constant | Slot | Reference | Pattern>, optional: boolean = false) {
        this.grammar = grammar;
        this.optional = optional;
    }
}
