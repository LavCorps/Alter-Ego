// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Exit from "../Exit.js";
import type Player from "../Player.ts";
import type Room from "../Room.ts";
import QueueMoveAction from "./QueueMoveAction.ts";

/**
 * Represents an enter action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#enter-action
 */
export default class EnterAction extends Action {
    /**
     * Performs an enter action.
     *
     * @param destinationRoom - The room the players will be moved to.
     * @param entrance - The exit the players will enter the destination room from.
     * @param movingFreely - Whether or not the players are performing free movement.
     * @param running - Whether or not the players are running. False by default.
     * @param players - A set of players to move simultaneously. Defaults to a set containing only the player the action was created with.
     */
    async performEnter(destinationRoom: Room, entrance: Exit, movingFreely: boolean, running: boolean = false, players: Set<Player> = new Set([this.player])): Promise<void> {
        if (this.performed) return;
        super.perform();
        for (const player of players) {
            destinationRoom.addPlayer(player, entrance);
            player.moveQueue.splice(0, 1);
        }
        this.getGame().narrationHandler.narrateEnter(this, this.player, players, destinationRoom, entrance, movingFreely);
        const followedPlayer = this.player.followedPlayer;
        if (!followedPlayer && this.player.moveQueue.length > 0) {
            const queueMoveAction = new QueueMoveAction(this.player.getGame(), undefined, this.player, this.player.location, this.forced);
            await queueMoveAction.performQueueMove(running, this.player.moveQueue[0]);
        }

        // Everything after this should only be done if we're moving exactly one player.
        if (players.size > 1) return;
        const followedPlayerIsVisible = followedPlayer && destinationRoom.occupants.includes(followedPlayer)
            && destinationRoom.generateOccupantsStringExcluding(this.player).includes(this.player.followedPlayerDisplayName);
        if (followedPlayer && !followedPlayerIsVisible) {
            // We need a new Action so the message gets communicated properly, since we've already sent a notification with this one.
            // We aren't going to actually do anything with it otherwise.
            const lostPlayerAction = new EnterAction(this.getGame(), this.message, this.player, this.player.location, this.forced);
            this.getGame().narrationHandler.narrateLostFollowedPlayer(lostPlayerAction, this.player);
            this.player.stopFollowing();
        }
        else if (followedPlayerIsVisible && followedPlayer.isMoving && this.player.moveQueue.length === 0) {
            this.player.moveQueue = [followedPlayer.moveQueue[0]];
            const queueMoveAction = new QueueMoveAction(this.getGame(), undefined, this.player, this.player.location, this.forced);
            await queueMoveAction.performQueueMove(followedPlayer.isRunning, this.player.moveQueue[0], this.player.getFollowingSpeed());
        }
    }
}
