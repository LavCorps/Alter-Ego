// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type InventoryItem from "../../Data/InventoryItem.ts";
import type Player from "../../Data/Player.ts";
import type { PLAYER, INVENTORYITEM } from "./Pattern.ts";
import type { SlotTypes } from "./Pattern.ts";

export const CONSTANT = -1;
export const PREPOSITION = -2;

export type TokenType = typeof PREPOSITION | typeof CONSTANT | SlotTypes;

type BaseToken = {
    value: string;
    type: TokenType;
};

type PrepositionToken = BaseToken & {
    type: typeof PREPOSITION;
};

type ConstantToken = BaseToken & {
    type: typeof CONSTANT;
};

type PlayerToken = BaseToken & {
    type: typeof PLAYER;
    reference: Player;
};

type InventoryItemToken = BaseToken & {
    type: typeof INVENTORYITEM;
    reference: InventoryItem;
    preposition: string;
};

export type Token = PrepositionToken | ConstantToken | PlayerToken | InventoryItemToken;
