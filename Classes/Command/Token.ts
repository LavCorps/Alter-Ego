// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type InventoryItem from "../../Data/InventoryItem.ts";
import type Player from "../../Data/Player.ts";
import { PLAYER, INVENTORYITEM } from "./Pattern.ts";
import type { SlotTypes } from "./Pattern.ts";

export const CONSTANT = -1;
export const PREPOSITION = -2;
export const SENTINEL = -999;

export type TokenType = typeof SENTINEL | typeof PREPOSITION | typeof CONSTANT | SlotTypes;

type BaseToken = {
    value: string;
    type: TokenType;
};

export type SentinelToken = BaseToken & {
    type: typeof SENTINEL;
};

export function sentinelFactory(value: string): SentinelToken {
    return { type: SENTINEL, value: value };
}

export type PrepositionToken = BaseToken & {
    type: typeof PREPOSITION;
};

export function prepositionFactory(value: string): PrepositionToken {
    return { type: PREPOSITION, value: value };
}

export type ConstantToken = BaseToken & {
    type: typeof CONSTANT;
};

export function constantFactory(value: string): ConstantToken {
    return { type: CONSTANT, value: value };
}

export type PlayerToken = BaseToken & {
    type: typeof PLAYER;
    reference: Player;
};

export function playerFactory(value: string, reference: Player): PlayerToken {
    return { type: PLAYER, value: value, reference: reference };
}

export type InventoryItemToken = BaseToken & {
    type: typeof INVENTORYITEM;
    reference: InventoryItem;
    preposition: string;
};

export function inventoryItemFactory(value: string, reference: InventoryItem): InventoryItemToken {
    return { type: INVENTORYITEM, value: value, reference: reference, preposition: reference.prefab.preposition };
}

export type Token = SentinelToken | PrepositionToken | ConstantToken | PlayerToken | InventoryItemToken;
