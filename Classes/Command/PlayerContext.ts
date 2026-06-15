// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Collection } from "discord.js";
import type Exit from "../../Data/Exit.ts";
import type Fixture from "../../Data/Fixture.ts";
import type InventoryItem from "../../Data/InventoryItem.ts";
import type Player from "../../Data/Player.ts";
import type Room from "../../Data/Room.ts";
import type RoomItem from "../../Data/RoomItem.ts";
import type Game from "../../Data/Game.ts";
import type EquipmentSlot from "../../Data/EquipmentSlot.ts";
import Context from "./Context.ts";

/**
 * Represents the in-game context of a new-generation player command.
 */
export default class PlayerContext extends Context {
    /**
     * The alias the command was invoked with.
     */
    readonly invokedAlias: string;

    /**
     * The message that invoked the command.
     */
    readonly message: UserMessage;

    /**
     * The game containing all objects of this context.
     */
    private readonly game: Game;

    /**
     * The player responsible for executing the command.
     */
    readonly player: Player;

    /**
     * The equipment slots of the player.
     */
    readonly equipmentSlots: Collection<string, EquipmentSlot>;

    /**
     * The inventory items held, equipped, or stashed by the player.
     */
    readonly inventoryItems: Array<InventoryItem>;

    /**
     * The room the player occupies.
     */
    readonly room: Room;

    /**
     * The other players in the same room as the player.
     */
    readonly players: Array<Player>;

    /**
     * The exits within the room.
     */
    readonly exits: Collection<string, Exit>;

    /**
     * The fixtures within the room.
     */
    readonly fixtures: Array<Fixture>;

    /**
     * The room items within the room.
     */
    readonly roomItems: Array<RoomItem>;

    /**
     * @param game - The game to construct the context within.
     * @param player - The player to construct the context for.
     * @param invoked - The alias the command was invoked with.
     * @param message - The message that invoked the command.
     *
     */
    private constructor(game: Game, player: Player, invoked: string, message: UserMessage) {
        super()
        this.invokedAlias = invoked;
        this.message = message;
        this.game = game;
        this.player = player;
        this.equipmentSlots = this.player.inventory;
        this.inventoryItems = this.player.getContainedItems().filter(item => item !== null);
        this.room = this.player.location;
        this.players = this.room.occupants.filter((roomPlayer) => roomPlayer !== this.player);
        this.exits = this.room.exits;
        this.fixtures = this.game.entityFinder.getFixtures(null, this.room.id);
        this.roomItems = this.room.getContainedItems();
    }
}
