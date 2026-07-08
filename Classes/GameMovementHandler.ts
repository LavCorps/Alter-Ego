// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Collection } from "discord.js";
import Exit from "../Data/Exit.ts";
import Game from "../Data/Game.ts";
import type Player from "../Data/Player.ts";
import type Action from "../Data/Action.ts";
import InflictAction from "../Data/Actions/InflictAction.ts";
import MoveAction from "../Data/Actions/MoveAction.ts";
import StopAction from "../Data/Actions/StopAction.ts";


export type Positionable = Exit | Player;

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
                this.#removePlayerFromSet(player, existingSet);
            }
        }

        // Index all players in the new set.
        for (const player of players)
            this.#indexedPlayerSets.set(player.name, players);

        this.#playerSets.add(players);
    }

    /**
     * Caches the player set and creates a move timer for them.
     * @param players - The players to create a move timer for.
     * @param callback - The callback to execute on each tick of the move timer.
     */
    #createMoveTimerFor(players: Set<Player>, callback: () => Promise<void>) {
        this.#addPlayerSet(players);
        this.#moveTimers.set(players, setInterval(callback, Game.tick));
    }

    /**
     * Removes a player from whatever movement set they're in.
     * If the set becomes empty, its move timer is cleared and the set is removed.
     * If the player is not in a set, nothing will happen.
     * @param player - The player to remove from their movement set.
     * @param set - The set to remove the player from. Optional. If not provided, the player's current set will be used.
     */
    #removePlayerFromSet(player: Player, set = this.#getPlayerSet(player)): void {
        if (!set) return;

        set.delete(player);
        this.#indexedPlayerSets.delete(player.name);

        if (set.size === 0)
            this.#clearMoveTimerFor(set);
    }

    /**
     * Clears the move timer for the given players and removes all associated sets.
     */
    #clearMoveTimerFor(players: Set<Player>): void {
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

    /**
     * Returns the first entity in the given set, or null if the set is empty.
     * @param entities - The set of entities to get the first entity from.
     */
    #first<T extends Positionable>(entities: Set<T>): T {
        for (const entity of entities) return entity;
        return null;
    }

    /**
     * Gets the position of a set of positionable entities.
     * @param entities - The set of entities to get the position of.
     * @returns The first position found in the set. If no position is found, returns { x: 0, y: 0, z: 0 }.
     */
    #getPosition(entities: Set<Positionable>): Pos {
        const firstEntity = this.#first(entities);
        if (firstEntity) return structuredClone(firstEntity.pos);
        return { x: 0, y: 0, z: 0 };
    }

    /**
     * Returns true if the two entities have the same position.
     * @param entity1 - A player or room.
     * @param entity2 - A player or room.
     */
    public positionsEqual(entity1: Positionable, entity2: Positionable): boolean {
        return entity1.pos.x === entity2.pos.x && entity1.pos.y === entity2.pos.y && entity1.pos.z === entity2.pos.z;
    }

    /**
     * Moves the given players to the desired room.
     *
     * @param players - The players to move. They will all be moved together, and will all arrive at the same time.
     * @param running - Whether the players are running.
     * @param destination - The player or exit the players are moving toward.
     * @param time - The number of milliseconds it will take to move to the destination.
     * @param action - The action that called this function.
     */
    public movePlayers(players: Set<Player>, running: boolean, destination: Positionable, time: number, action: Action): void {
        if (players.size === 0) return;
        for (const player of players) {
            player.remainingTime = time;
            player.isMoving = true;
            player.isRunning = running;
        }
        const startingPos = this.#getPosition(players);

        this.#createMoveTimerFor(players, async () => {
            const settings = this.#game.settings;
            const firstPlayer = this.#first(players);
            let remainingTime = firstPlayer.remainingTime;
            let subtractedTime = Game.tick;
            if (this.#game.heated) subtractedTime = settings.heatedSlowdownRate * subtractedTime;
            if (time >= subtractedTime) remainingTime -= subtractedTime;
            // Get the current coordinates based on what percentage of the duration has passed.
            const elapsedTime = time - remainingTime;
            const timeRatio = elapsedTime / time;
            let x = startingPos.x + Math.round(timeRatio * (destination.pos.x - startingPos.x));
            let y = startingPos.y + Math.round(timeRatio * (destination.pos.y - startingPos.y));
            let z = startingPos.z + Math.round(timeRatio * (destination.pos.z - startingPos.z));
            // Calculate the distance the players have traveled in this time.
            let distance = Math.sqrt(Math.pow(x - firstPlayer.pos.x, 2) + Math.pow(z - firstPlayer.pos.z, 2)) / settings.pixelsPerMeter;
            let rise = (y - firstPlayer.pos.y) / settings.pixelsPerMeter;
            // Calculate the amount of stamina the players have lost traveling this distance.
            const staminaUseMultiplier = running ? 3 : 1;
            let lostStamina: number;
            // If distance is 0, we'll treat it like a staircase.
            if (distance === 0 && rise !== 0) {
                const uphill = rise > 0 ? true : false;
                distance = rise;
                lostStamina = uphill
                    ? 4 * staminaUseMultiplier * settings.staminaUseRate * distance
                    : staminaUseMultiplier * settings.staminaUseRate / 4 * -distance;
            }
            else {
                const slope = rise / distance;
                lostStamina = !isNaN(slope)
                    ? staminaUseMultiplier * (settings.staminaUseRate + slope * settings.staminaUseRate) * distance
                    : staminaUseMultiplier * settings.staminaUseRate * distance;
                if (isNaN(lostStamina)) lostStamina = 0;
            }
            let anyPlayersOutOfStamina = false;
            for (const player of players) {
                player.pos.x = x;
                player.pos.y = y;
                player.pos.z = z;
                player.remainingTime = remainingTime;
                if (!player.hasBehaviorAttribute("no stamina decrease")) player.stamina += lostStamina;
                // If player reaches half of their stamina, give them a warning.
                // Be sure to check player.reachedHalfStamina so that this message is only sent once.
                if (player.stamina <= player.maxStamina / 2 && !player.reachedHalfStamina) {
                    player.reachedHalfStamina = true;
                    // The communication handler needs an action to prevent notification duplication, so create a dummy here.
                    const reachedHalfStaminaAction = new MoveAction(this.#game, undefined, player, player.location, true);
                    this.#game.narrationHandler.narrateReachedHalfStamina(reachedHalfStaminaAction, player);
                }
                // If player runs out of stamina, stop them in their tracks.
                if (player.stamina <= 0) {
                    this.#clearMoveTimerFor(players);
                    anyPlayersOutOfStamina = true;
                    player.stamina = 0;
                    const wearyStatus = this.#game.entityFinder.getStatusEffect("weary");
                    if (wearyStatus) {
                        // Inflicting one player with weary should cause all players in their party to stop, as well.
                        const wearyAction = new InflictAction(this.#game, undefined, player, player.location, true);
                        this.#game.narrationHandler.narrateWeary(wearyAction, player);
                        wearyAction.performInflict(wearyStatus, false, true, true);
                        // If the player is moving toward the leader during party formation, remove them from the party.
                        if (player.party && !player.party.positionsSynchronized && !(destination instanceof Exit) && !player.positionMatches(player.party.leader)) {
                            const removalMessage = this.#game.notificationGenerator.generateLedPlayerCouldNotSynchronizeNotification(
                                player.party.getMemberDisplayName(player),
                                player.party.getMemberDisplayName(player.party.leader)
                            );
                            player.party.leader.stopLeading(player);
                            await player.party.removeFollower(player, wearyAction, removalMessage);
                        }

                    }
                }
            }
            // Break out of the for loop so that we don't try to move the players to their destination if any of them are out of stamina.
            if (remainingTime <= 0 && !anyPlayersOutOfStamina) {
                this.#clearMoveTimerFor(players);
                const destinationIsExit = destination instanceof Exit;
                const currentRoom = firstPlayer.location;
                const exit = destinationIsExit ? destination : undefined;
                const destinationRoom = destinationIsExit ? destination.dest : undefined;
                const entrance = destinationIsExit ? destination.dest.getExit(destination.link) : undefined;
                for (const player of players) {
                    player.pos.x = destination.pos.x;
                    player.pos.y = destination.pos.y;
                    player.pos.z = destination.pos.z;
                    player.isMoving = false;
                    player.isRunning = false;
                    player.currentMovingSpeed = 0;
                    player.remainingTime = 0;
                    if (destinationIsExit) {
                        // TODO: What happens if the restricted exit puzzle is passable to one player, but not to others?
                        /**
                         * ANSWER: Because the leader is the one moving the party, if they cannot proceed through the restricted exit,
                         * no one should be able to. However, this raises an interesting question: what if the leader can pass through
                         * the restricted exit, but one of the followers cannot? Perhaps we can split the party, but that could be
                         * problematic if the party is traveling together in, say, a vehicle. Perhaps the best solution is to treat the
                         * restricted exit as impassable if even a single player in the party is unable to pass through it.
                         * If multiple members of the party can pass through it and they are listed as solutions, then how many times
                         * should the puzzle be solved? Much to think about.
                         */
                        const restrictedExitPuzzle = this.#game.entityFinder.getPuzzle(exit.name, player.location.id, "restricted exit", true);
                        const exitPuzzlePassable = restrictedExitPuzzle && restrictedExitPuzzle.solutions.includes(player.name);
                        if (destination.unlocked || exitPuzzlePassable) {
                            const moveAction = new MoveAction(this.#game, undefined, player, player.location, action.forced);
                            await moveAction.performMove(running, currentRoom, destinationRoom, exit, entrance);
                        }
                        else {
                            // The exit is locked.
                            const stopAction = new StopAction(this.#game, undefined, player, player.location, action.forced);
                            stopAction.performStop(true, exit, !player.followedPlayerIsInRoom());
                            player.moveQueue.length = 0;
                        }
                    }
                    else {
                        if (time > 1000) {
                            const dummyAction = new MoveAction(this.#game, undefined, player, player.location, action.forced);
                            this.#game.narrationHandler.narrateFinishApproaching(dummyAction, player, destination);
                        }
                    }
                }
                // If the players are in a party and the party members' positions are now synchronized, the party is ready to go.
                if (firstPlayer.party && !firstPlayer.party.positionsSynchronized && firstPlayer.party.getMisalignedFollowers().length === 0) {
                    firstPlayer.party.positionsSynchronized = true;
                    if (time > 1000) this.#game.narrationHandler.narratePartyReady(action, firstPlayer.party.leader);
                }
            }
        });
    }

    /**
     * Executes the given callback function for the given players after a set delay.
     * Overwrites the players' move timers and `remainingTime` properties.
     * @param players - The players on which to execute the callback function.
     * @param delay - The amount of time to delay the callback function in milliseconds.
     * @param callback - The function to call when the delay is over.
     */
    public doAfterDelay(players: Set<Player>, delay: number, callback: (...args: any[]) => Promise<void>): void {
        if (players.size === 0) return;
        for (const player of players)
            player.remainingTime = delay;
        this.#createMoveTimerFor(players, async () => {
            const settings = this.#game.settings;
            const firstPlayer = this.#first(players);
            let remainingTime = firstPlayer.remainingTime;
            let subtractedTime = Game.tick;
            if (this.#game.heated) subtractedTime = settings.heatedSlowdownRate * subtractedTime;
            if (delay >= subtractedTime) remainingTime -= subtractedTime;
            for (const player of players)
                player.remainingTime = remainingTime;
            if (remainingTime <= 0) {
                this.#clearMoveTimerFor(players);
                try {
                    await callback();
                }
                catch (error) {
                    console.error(`${Array.from(players).map(player => player.name).join(',')} doAfterDelay callback error:`, error);
                }
            }
        });
    }

    /**
     * Stops the move timer for the given players.
     * @param players - The player or players to stop the move timer for.
     */
    public stopMoveTimer(players: Player | Set<Player>): void {
        if (!(players instanceof Set))
            players = this.#getPlayerSet(players);
        this.#clearMoveTimerFor(players);
    }

    /**
     * Stops the given player's followers from moving.
     * This will only stop followers in the same room as the player.
     * @param player - The player whose followers will stop moving.
     * @param stopFollowing - Whether or not to make the followers stop following the player. Defaults to true.
     * @param forced - Whether or not the action was performed by someone other than the player themselves. Defaults to true.
     */
    public stopFollowers(player: Player, stopFollowing: boolean = true, forced: boolean = true): void {
        for (const occupant of player.location.occupants) {
            if (occupant.isMoving && occupant.isFollowing(player)) {
                const stopAction = new StopAction(this.#game, undefined, occupant, occupant.location, forced);
                stopAction.performStop(undefined, undefined, stopFollowing);
            }
        }
    }
}
