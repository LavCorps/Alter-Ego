// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type EquipmentSlot from "../../Data/EquipmentSlot.ts";
import type Exit from "../../Data/Exit.ts";
import type Fixture from "../../Data/Fixture.ts";
import type Flag from "../../Data/Flag.ts";
import type InventoryItem from "../../Data/InventoryItem.ts";
import type Player from "../../Data/Player.ts";
import type Prefab from "../../Data/Prefab.ts";
import type Room from "../../Data/Room.ts";
import type RoomItem from "../../Data/RoomItem.ts";
import type Status from "../../Data/Status.ts";
import { PLAYER, INVENTORYITEM, ROOMITEM, FIXTURE, EQUIPMENTSLOT, ROOM, EXIT, EVENT, FLAG, PREFAB, STATUS } from "./Pattern.ts";
import type { SlotTypes } from "./Pattern.ts";

export const CONSTANT = -1;
export const PREPOSITION = -2;
export const SENTINEL = -999;

export type TokenType = typeof SENTINEL | typeof PREPOSITION | typeof CONSTANT | SlotTypes;

abstract class BaseToken {
    value: string;
    abstract type: TokenType;
}

export class SentinelToken extends BaseToken {
    type: typeof SENTINEL = SENTINEL;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

export class PrepositionToken extends BaseToken {
    type: typeof PREPOSITION = PREPOSITION;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

export class ConstantToken extends BaseToken {
    type: typeof CONSTANT = CONSTANT;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

export class PlayerToken extends BaseToken {
    type: typeof PLAYER = PLAYER;
    reference: Player;

    constructor(value: string, reference: Player) {
        super();
        this.value = value;
        this.reference = reference;
    }
}

export class InventoryItemToken extends BaseToken {
    type: typeof INVENTORYITEM = INVENTORYITEM;
    reference: InventoryItem;
    preposition: string;

    constructor(value: string, reference: InventoryItem) {
        super();
        this.value = value;
        this.reference = reference;
        this.preposition = reference.prefab.preposition;
    }
}

export class RoomItemToken extends BaseToken {
    type: typeof ROOMITEM = ROOMITEM;
    reference: RoomItem;
    preposition: string;

    constructor(value: string, reference: RoomItem) {
        super();
        this.value = value;
        this.reference = reference;
        this.preposition = reference.prefab.preposition;
    }
}

export class FixtureToken extends BaseToken {
    type: typeof FIXTURE = FIXTURE;
    reference: Fixture;
    preposition: string;

    constructor(value: string, reference: Fixture) {
        super();
        this.value = value;
        this.reference = reference;
        this.preposition = reference.preposition;
    }
}

export class EquipmentSlotToken extends BaseToken {
    type: typeof EQUIPMENTSLOT = EQUIPMENTSLOT;
    reference: EquipmentSlot;

    constructor(value: string, reference: EquipmentSlot) {
        super();
        this.value = value;
        this.reference = reference;
    }
}

export class RoomToken extends BaseToken {
    type: typeof ROOM = ROOM;
    reference: Room;

    constructor(value: string, reference: Room) {
        super();
        this.value = value;
        this.reference = reference;
    }
}

export class ExitToken extends BaseToken {
    type: typeof EXIT = EXIT;
    reference: Exit;

    constructor(value: string, reference: Exit) {
        super();
        this.value = value;
        this.reference = reference;
    }
}

export class EventToken extends BaseToken {
    type: typeof EVENT = EVENT;
    reference: Event;

    constructor(value: string, reference: Event) {
        super();
        this.value = value;
        this.reference = reference;
    }
}

export class FlagToken extends BaseToken {
    type: typeof FLAG = FLAG;
    reference: Flag;

    constructor(value: string, reference: Flag) {
        super();
        this.value = value;
        this.reference = reference;
    }
}

export class PrefabToken extends BaseToken {
    type: typeof PREFAB = PREFAB;
    reference: Prefab;

    constructor(value: string, reference: Prefab) {
        super();
        this.value = value;
        this.reference = reference;
    }
}

export class StatusToken extends BaseToken {
    type: typeof STATUS = STATUS;
    reference: Status;

    constructor(value: string, reference: Status) {
        super();
        this.value = value;
        this.reference = reference;
    }
}

export type Token =
    | SentinelToken
    | PrepositionToken
    | ConstantToken
    | PlayerToken
    | InventoryItemToken
    | RoomItemToken
    | FixtureToken
    | EquipmentSlotToken
    | RoomToken
    | ExitToken
    | EventToken
    | FlagToken
    | StatusToken;
