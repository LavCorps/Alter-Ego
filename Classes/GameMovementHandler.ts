// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Collection } from "discord.js";
import type Exit from "../Data/Exit.ts";
import type Game from "../Data/Game.ts";
import type Player from "../Data/Player.ts";

type Positionable = Exit | Player;

/**
 * A set of functions to handle movement.
 */
export default class GameMovementHandler {
    /**
     * The game this belongs to.
     */
    readonly #game: Game;
    /**
     * Sets of players who are moving together.
     */
    readonly #playerSets: Set<Set<Player>>;
    /**
     * A reverse index collection, used to get the set any given player belongs to.
     * Ensures that no player can belong to more than one set.
     * The key is the player's name.
     */
    readonly #indexedPlayerSets: Collection<string, Set<Player>>;
    /**
     * A collection of movement intervals to move players in sync.
     */
    readonly #moveTimers: Collection<Set<Player>, NodeJS.Timeout>;

    /**
     * @param game - The game this belongs to.
     */
    constructor(game: Game) {
        this.#game = game;
        this.#playerSets = new Set();
        this.#indexedPlayerSets = new Collection();
        this.#moveTimers = new Collection();
    }

    /**
     * Returns the set the given player belongs to.
     * If they aren't moving, returns undefined.
     */
    #getPlayerSet(player: Player): Set<Player> {
        return this.#indexedPlayerSets.get(player.name);
    }

    /**
     * Registers a set of players as moving together.
     * If any player is already in a different set, they are removed from their old set.
     * If the old set becomes empty, its move timer is cleared.
     */
    #addPlayerSet(players: Set<Player>): void {
        if (players.size === 0 || this.#playerSets.has(players)) return;

        // Remove any players already in other sets.
        for (const player of players) {
            const existingSet = this.#getPlayerSet(player);
            if (existingSet && existingSet !== players) {
                existingSet.delete(player);
                this.#indexedPlayerSets.delete(player.name);
                // If the old set is now empty, remove it.
                if (existingSet.size === 0)
                    this.#clearMoveTimerForPlayers(existingSet);
            }
        }

        // Index all players in the new set.
        for (const player of players)
            this.#indexedPlayerSets.set(player.name, players);

        this.#playerSets.add(players);
    }

    /**
     * Removes a player from whatever movement set they're in.
     * If the set becomes empty, its move timer is cleared and the set is removed.
     */
    #removePlayerFromSet(player: Player): void {
        const set = this.#getPlayerSet(player);
        if (!set) return;

        set.delete(player);
        this.#indexedPlayerSets.delete(player.name);

        if (set.size === 0)
            this.#clearMoveTimerForPlayers(set);
    }

    /**
     * Clears the move timer for the given players and removes all associated sets.
     */
    #clearMoveTimerForPlayers(players: Set<Player>): void {
        const timer = this.#moveTimers.get(players);
        if (timer) {
            clearInterval(timer);
            this.#moveTimers.delete(players);
        }
        // Clean up the associated player set.
        for (const player of players)
            this.#indexedPlayerSets.delete(player.name);
        this.#playerSets.delete(players);
    }

    /**
     * Gets the move timer for the given player.
     * If the player is not moving, returns null.
     * @param player - The player to get the move timer for.
     */
    public getMoveTimer(player: Player): NodeJS.Timeout {
        const playerSet = this.#getPlayerSet(player);
        if (!playerSet) return null;
        return this.#moveTimers.get(playerSet) ?? null;
    }

    /**
     * Calculates the time it takes to move the given entity to the desired destination.
     * @param rate - The rate at which to move the entity.
     * @param entity - The entity, which has a position in 3D space.
     * @param destination - The destination, which also has a position in 3D space.
     */
    public calculateMoveTime(rate: number, entity: Positionable, destination: Positionable): number {
        let distance = Math.sqrt(Math.pow(destination.pos.x - entity.pos.x, 2) + Math.pow(destination.pos.z - entity.pos.z, 2));
        distance = distance / this.#game.settings.pixelsPerMeter;
        // Slope should affect the rate.
        const rise = (destination.pos.y - entity.pos.y) / this.#game.settings.pixelsPerMeter;
        let time = 0;
        // If distance is 0, we'll treat it like a staircase and just use the rise to calculate the time.
        if (distance === 0 && rise !== 0) {
            const uphill = rise > 0;
            // Assume that the staircase is a right triangle leading to another right triangle flipped horizontally.
            const legs = rise / 2;
            // Calculate the length of the hypotenuse of these right triangles.
            distance = Math.sqrt(2 * Math.pow(legs, 2));
            // The distance should be two hypotenuses.
            distance = distance * 2;
            // If the player is moving uphill, reduce their rate of movement by 1/3.
            // Otherwise, increase it by 1/3;
            rate = uphill ? 2 * rate / 3 : 4 * rate / 3;
            // To make it feel a little more realistic, multiply it by 2.
            time = distance / rate * 2 * 1000;
        }
        else {
            const slope = rise / distance;
            // Prevent division errors.
            rate = !isNaN(slope) && slope * rate !== rate ? rate - slope * rate : rate;
            time = distance / rate * 1000;
        }
        if (time < 0 || isNaN(time)) time = 0;
        // Cap out the maximum length of time at 1 hour.
        const maxLength = 60 * 60 * 1000;
        if (time > maxLength) time = maxLength;
        return time;
    }
}
