// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Fixture from "../../Data/Fixture.ts";
import InventoryItem from "../../Data/InventoryItem.ts";
import Puzzle from "../../Data/Puzzle.ts";
import RoomItem from "../../Data/RoomItem.ts";

import {
    EQUIPMENTSLOT,
    EVENT,
    EXIT,
    FIXTURE,
    FLAG,
    INVENTORYITEM,
    PLAYER,
    PREFAB,
    PUZZLE,
    ROOM,
    ROOMITEM,
    STATUS,
    type SlotTypes,
} from "./Pattern.ts";
import type GameEntity from "../../Data/GameEntity.ts";
import Player from "../../Data/Player.ts";
import EquipmentSlot from "../../Data/EquipmentSlot.ts";
import Room from "../../Data/Room.ts";
import Exit from "../../Data/Exit.ts";
import Event from "../../Data/Event.ts";
import Flag from "../../Data/Flag.ts";
import Prefab from "../../Data/Prefab.ts";
import Status from "../../Data/Status.ts";

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
    type:
        | typeof PLAYER
        | typeof EQUIPMENTSLOT
        | typeof ROOM
        | typeof EXIT
        | typeof EVENT
        | typeof FLAG
        | typeof PREFAB
        | typeof STATUS;

    constructor(value: string, reference: T) {
        super(value);
        this.reference = reference;
        if (reference instanceof Player) this.type = PLAYER;
        else if (reference instanceof EquipmentSlot) this.type = EQUIPMENTSLOT;
        else if (reference instanceof Room) this.type = ROOM;
        else if (reference instanceof Exit) this.type = EXIT;
        else if (reference instanceof Event) this.type = EVENT;
        else if (reference instanceof Flag) this.type = FLAG;
        else if (reference instanceof Prefab) this.type = PREFAB;
        else if (reference instanceof Status) this.type = STATUS;
    }
}

export class ItemContainerToken<T extends Fixture | RoomItem | Puzzle | InventoryItem> extends BaseToken {
    reference: T;
    preposition: string;
    declare type: typeof FIXTURE | typeof ROOMITEM | typeof PUZZLE | typeof INVENTORYITEM;

    constructor(value: string, reference: T) {
        super(value);
        this.reference = reference;
        this.preposition = reference.getPreposition();
        if (reference instanceof Fixture) this.type = FIXTURE;
        else if (reference instanceof RoomItem) this.type = ROOMITEM;
        else if (reference instanceof Puzzle) this.type = PUZZLE;
        else if (reference instanceof InventoryItem) this.type = INVENTORYITEM;
    }
}

export type Token =
    | SentinelToken
    | PrepositionToken
    | ConstantToken
    | EntityToken<GameEntity>
    | ItemContainerToken<Fixture | RoomItem | Puzzle | InventoryItem>;
