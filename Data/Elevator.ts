// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Room, { type RoomField } from "./Room.ts";

/**
 * Represents an elevator in the game.
 */
export default class Elevator extends Room implements PersistentGameEntity<RoomField> {
    override getEntityType(): string {
        return "Elevator";
    }
}
