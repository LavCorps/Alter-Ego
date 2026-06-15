// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Fixture from "../../Data/Fixture.ts";
import type InventoryItem from "../../Data/InventoryItem.ts";
import type Puzzle from "../../Data/Puzzle.ts";
import type RoomItem from "../../Data/RoomItem.ts";

import type { SlotTypes } from "./Pattern.ts";
import type GameEntity from "../../Data/GameEntity.ts";

export const CONSTANT = -1;
export const PREPOSITION = -2;
export const SENTINEL = -999;

export type TokenType = typeof SENTINEL | typeof PREPOSITION | typeof CONSTANT | SlotTypes;

abstract class BaseToken {
    value: string;
    abstract type: TokenType;

    protected constructor(value: string) {
        this.value = value;
    }
}

export class SentinelToken extends BaseToken {
    type: typeof SENTINEL = SENTINEL;

    constructor(value: string) {
        super(value);
    }
}

export class PrepositionToken extends BaseToken {
    type: typeof PREPOSITION = PREPOSITION;

    constructor(value: string) {
        super(value);
    }
}

export class ConstantToken extends BaseToken {
    type: typeof CONSTANT = CONSTANT;

    constructor(value: string) {
        super(value);
    }
}

export class EntityToken<T extends GameEntity> extends BaseToken {
    reference: T;
    type: typeof CONSTANT = CONSTANT;

    constructor(value: string, reference: T) {
        super(value);
        this.reference = reference;
    }
}

export class ItemContainerToken<T extends Fixture | RoomItem | Puzzle | InventoryItem> extends EntityToken<T> {
    preposition: string;

    constructor(value: string, reference: T) {
        super(value, reference);
        this.preposition = reference.getPreposition();
    }
}

export type Token =
    | SentinelToken
    | PrepositionToken
    | ConstantToken
    | EntityToken<GameEntity>
    | ItemContainerToken<Fixture | RoomItem | Puzzle | InventoryItem>;
