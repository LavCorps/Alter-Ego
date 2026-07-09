// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Exit from "../Exit.ts";
import Game from "../Game.ts";
import QueueMoveAction from "./QueueMoveAction.ts";

/**
 * Represents a start move action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#start-move-action
 */
export default class StartMoveAction extends Action {
    /**
     * Performs a start move action.
     *
     * @param isRunning - Whether the player is running.
     * @param destination - The player or exit the player is moving toward.
     * @param speed - The speed at which the player is moving. Defaults to the minimum speed of their party, or their own current speed if they're not in a party.
     */
    async performStartMove(isRunning: boolean, destination: Exit, speed = this.player.party ? this.player.party.speed : this.player.speed): Promise<void> {
        if (this.performed) return;
        super.perform();

        const party = this.player.party;
        if (party) party.members.forEach(member => member.currentMovingSpeed = speed);
        else this.player.currentMovingSpeed = speed;

        const rate = party ? party.calculateMoveRate(isRunning, speed) : this.player.calculateMoveRate(isRunning, speed);
        const time = this.getGame().movementHandler.calculateMoveTime(rate, this.player, destination);
        if (time > 1000) {
            const interactables = this.getGame().clientContext.interactableManager.createStopActionInteractable(this.player, this.user);
            this.getGame().narrationHandler.narrateStartMove(this, isRunning, destination, this.player, interactables);
        }
        const players = party ? party.getMemberSet() : new Set([this.player]);
        this.getGame().movementHandler.movePlayers(players, isRunning, destination, time, this);

        // If anyone is following this player, they need to start moving.
        for (const occupant of this.location.occupants) {
            // If the moving player is in a party, their party members will have already started moving. Skip over them.
            if (party && party.hasMember(occupant)) continue;
            if (occupant.moveQueue.length === 0 && occupant.isFollowing(this.player)) {
                // We don't want the occupant to reach the destination before the player they're following, or they'll lose track of them.
                // So, calculate how long to delay their movement.
                let delay = 0;
                const followingSpeed = occupant.getFollowingSpeed();
                const occupantRate = occupant.calculateMoveRate(isRunning, followingSpeed);
                const occupantTime = this.getGame().movementHandler.calculateMoveTime(occupantRate, occupant, destination);
                if (occupantTime <= time) delay = time - occupantTime;
                // Add one tick to the delay just to be safe.
                delay += Game.tick;
                occupant.doAfterDelay(delay, async () => {
                    occupant.moveQueue = [destination.name];
                    const queueMoveAction = new QueueMoveAction(this.getGame(), undefined, occupant, occupant.location, this.forced);
                    await queueMoveAction.performQueueMove(this.player.isRunning, occupant.moveQueue[0], followingSpeed);
                });
            }
        }
    }
}
