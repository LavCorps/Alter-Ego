// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getChildItems } from "../../Modules/itemManager.ts";
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
import { EntityToken, ItemContainerToken, PocketToken, PrepositionToken, type Token } from "./Token.ts";
import type Puzzle from "../../Data/Puzzle.ts";
import type Gesture from "../../Data/Gesture.ts";
import type HidingSpot from "../../Data/HidingSpot.ts";

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
    readonly inventoryItems: InventoryItem[];

    /**
     * The inventory items held by the player.
     */
    readonly heldItems: InventoryItem[];

    /**
     * The inventory items equipped by the player.
     */
    readonly equippedItems: InventoryItem[];

    /**
     * The inventory items stashed by the player.
     */
    readonly stashedItems: InventoryItem[];

    /**
     * The room the player occupies.
     */
    readonly room: Room;

    /**
     * The fixture the player is currently hidden in, if applicable.
     * If the player is not hidden in a hiding spot, this is `null`.
     */
    readonly hidingSpot: HidingSpot | null;

    /**
     * The other players in the same room as the player.
     * @privateRemarks
     * If the player is in a hiding spot, this should only be the other players in the hiding spot.
     * Some commands might not respect this though, so I wonder if maybe it would be best to have
     * a separate field for hiding spot occupants and room occupants.
     * Something to consider!
     * - VM
     */
    readonly otherOccupants: Player[];

    /**
     * The exits within the room.
     */
    readonly exits: Collection<string, Exit>;

    /**
     * The rooms adjacent to the player's location.
     */
    readonly adjacentRooms: Room[];

    /**
     * The fixtures within the room.
     * @privateRemarks
     * If the player is in a hiding spot, this should only be the fixture associated with the hiding spot.
     * - VM
     */
    readonly fixtures: Fixture[];

    /**
     * The puzzles within the room.
     * @privateRemarks
     * If the player is in a hiding spot, this should only be the child puzzle of the fixture associated with the hiding spot.
     * I think, anyway. It might also be possible for it to be a puzzle with an identical name.
     * - VM
     */
    readonly puzzles: Puzzle[];

    /**
     * The room items within the room.
     * @privateRemarks
     * If the player is in a hiding spot, this should only be the room items that are contained in the hiding spot, its child puzzle,
     * or any room items contained in those recursively. It might be useful to create a `getTopContainer` method for room items.
     * - VM
     */
    readonly roomItems: RoomItem[];

    /**
     * The gestures of the game.
     */
    readonly gestures: Collection<string, Gesture>;

    /**
     * @param game - The game to construct the context within.
     * @param player - The player to construct the context for.
     * @param invokedAlias - The alias the command was invoked with.
     * @param message - The message that invoked the command.
     */
    constructor(game: Game, player: Player, invokedAlias: string, message: UserMessage) {
        /**
         * @privateRemarks
         * It might be unnecessary to fill out the entire player context for every single command invocation, especially
         * commands that don't even have any arguments. So, we might want to consider filling out the context based on
         * the patterns in the command being invoked. If not, some other way of avoiding filling this out with unneeded data
         * might help speed things up. This is mostly a concern for room items, since there can potentially be thousands of them.
         * - VM
         */
        super();
        this.invokedAlias = invokedAlias;
        this.message = message;
        this.game = game;
        this.player = player;
        this.equipmentSlots = this.player.inventory;
        this.inventoryItems = this.player.getContainedItems().filter((item) => item !== null);
        const hands = this.game.entityFinder.getPlayerHands(this.player);
        const handIDs = new Set(hands.map((hand) => hand.id));
        const notHands = this.player.inventory.filter((slot) => !handIDs.has(slot.id));
        this.heldItems = hands.map((slot) => slot.equippedItem).filter((item) => item !== null);
        this.equippedItems = notHands.map((slot) => slot.equippedItem).filter((item) => item !== null);
        this.stashedItems = [];
        this.inventoryItems.forEach((item) => getChildItems(this.stashedItems, item));
        this.room = this.player.location;
        this.hidingSpot = this.game.entityFinder.getFixture(this.player.hidingSpot, this.room.id)?.hidingSpot ?? null;
        this.otherOccupants = this.room.occupants.filter((roomPlayer) => roomPlayer !== this.player);
        this.exits = this.room.exits;
        this.adjacentRooms = this.exits.map((exit) => exit.dest);
        /**
         * @privateRemarks
         * It is actually intentional that players can attempt Puzzles that are not currently accessible.
         * Puzzle accessibility is evaluated dynamically based on its requirements, so they should not be filtered out.
         *
         * Fixtures should be filtered out if they are inaccessible, but according to the use_player command, they can
         * be activated or deactivated even if they are inaccessible, even if they cannot be inspected. This may or may
         * not be a bug. It makes little sense to allow players to (de)activate fixtures that they can't inspect, but
         * this may prevent a different bug from occurring when a Fixture that shares a name with a
         * Puzzle (a shower, for example) is used. When this occurs, if the accessibility of the Fixture and the Puzzle
         * contradict, and they are supposed to be in a synchronized state (activated when solved and deactivated when
         * unsolved), they may end up not being synchronized. We will likely need a solution for this conundrum.
         *
         * Filtering inaccessible roomItems out is fine, but now I wonder if it might be nice to simply determine that
         * dynamically, if their top-level container is a Puzzle. We could potentially use a get function for this, so
         * that their accessibility can be evaluated dynamically without moderators needing to issue a bot command every
         * time a puzzle is solved. This would be a good time to make such a change.
         * - DM
         */
        this.fixtures = this.game.entityFinder
            .getFixtures(undefined, this.room.id)
            .filter((fixture) => fixture.accessible);
        this.puzzles = this.game.entityFinder.getPuzzles(undefined, this.room.id);
        this.roomItems = this.room.getContainedItems().filter((item) => item.accessible);
        this.gestures = this.game.gestures;
    }

    getLexicon(): Token[] {
        const prepositions: Set<string> = new Set();
        const tokens: Token[] = [];

        for (const player of this.game.players.values()) {
            tokens.push(new EntityToken(player.displayName, player));
        }

        for (const item of this.inventoryItems) {
            if (item.prefab !== null && item.quantity > 0) {
                const preposition = item.getPreposition();
                tokens.push(new ItemContainerToken(item.name, item));
                for (const [key, val] of item.inventory)
                    tokens.push(new PocketToken(key, val, item));
                if (item.pluralName !== "") tokens.push(new ItemContainerToken(item.pluralName, item));
                if (!prepositions.has(preposition) && preposition !== "") {
                    prepositions.add(preposition);
                    tokens.push(new PrepositionToken(preposition));
                }
            }
        }

        for (const item of this.roomItems) {
            if (item.prefab !== null && item.quantity > 0) {
                const preposition = item.getPreposition();
                tokens.push(new ItemContainerToken(item.name, item));
                for (const [key, val] of item.inventory) {
                    tokens.push(new PocketToken(key, val, item));
                }
                if (item.pluralName !== "") tokens.push(new ItemContainerToken(item.pluralName, item));
                if (!prepositions.has(preposition) && preposition !== "") {
                    prepositions.add(preposition);
                    tokens.push(new PrepositionToken(preposition));
                }
            }
        }

        for (const fixture of this.fixtures) {
            const preposition = fixture.getPreposition();
            tokens.push(new ItemContainerToken(fixture.name, fixture));
            if (!prepositions.has(preposition) && preposition !== "") {
                prepositions.add(preposition);
                tokens.push(new PrepositionToken(preposition));
            }
        }

        for (const puzzle of this.puzzles) {
            const preposition = puzzle.getPreposition();
            tokens.push(new ItemContainerToken(puzzle.name, puzzle));
            if (!prepositions.has(preposition) && preposition !== "") {
                prepositions.add(preposition);
                tokens.push(new PrepositionToken(preposition));
            }
        }

        for (const room of this.adjacentRooms) {
            tokens.push(new EntityToken(room.id, room));
        }

        for (const exit of this.exits.values()) {
            tokens.push(new EntityToken(exit.name, exit));
        }

        for (const gesture of this.gestures.values()) {
            tokens.push(new EntityToken(gesture.id, gesture));
        }

        return tokens;
    }
}
