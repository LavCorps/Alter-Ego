// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Invocation } from "./Invocation.ts";
import { EntityToken, type Token } from "./Token.ts";
import type GameEntity from "../../Data/GameEntity.ts";

/**
 * Base interface representing a pattern element.
 */
interface PatternElement {
}


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
}

/**
 * Slot class representing a slot in a grammar pattern for a tokenized argument.
 */
export class Slot<T extends GameEntity = GameEntity> implements PatternElement {
    /**
     * The type of the Slot. Tokens must match this type to fit into the Slot.
     */
    readonly type: { new(...args: any[]): T };
    /**
     * The name to refer to the Slot with. Inherited by any Tokens that fit the Slot.
     */
    readonly name: string;

    /**
     * @param type - The type of the Slot. Tokens must match this type to fit into the Slot.
     * @param name - The name to refer to the Slot with. Inherited by any Tokens that fit the Slot.
     */
    constructor(type: { new(...args: any[]): T }, name: string) {
        this.type = type.prototype.constructor as { new(...args: any[]): T };
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
export class Glob implements PatternElement {

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

    match(streams: Token[][]): Invocation {
        throw new Error("NOT IMPLEMENTED");
    }
}
