// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Exit from "../Exit.js";
import Game from "../Game.ts";
import type Room from "../Room.ts";
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
     * @param currentRoom - The room the player is currently in.
     * @param destinationRoom - The room the player will be moved to.
     * @param exit - The exit the player will leave their current room through.
     * @param entrance - The exit the player will enter the destination room from.
     * @param speed - The speed at which the player is moving. Defaults to the minimum speed of their party, or their own current speed if they're not in a party.
     */
    async performStartMove(isRunning: boolean, currentRoom: Room, destinationRoom: Room, exit: Exit, entrance: Exit, speed = this.player.party ? this.player.party.speed : this.player.speed): Promise<void> {
        if (this.performed) return;
        super.perform();
        this.player.currentMovingSpeed = speed;
        const time = this.player.calculateMoveTime(exit, isRunning, speed);
        if (time > 1000) {
            const interactables = this.getGame().clientContext.interactableManager.createStopActionInteractable(this.player, this.user);
            this.getGame().narrationHandler.narrateStartMove(this, isRunning, exit, this.player, interactables);
        }
        this.player.move(isRunning, currentRoom, destinationRoom, exit, entrance, time, this.forced);

        // If anyone is following this player, they need to start moving.
        for (const occupant of this.location.occupants) {
            if (occupant.moveQueue.length === 0 && occupant.isFollowing(this.player)) {
                // We don't want the occupant to reach the destination before the player they're following, or they'll lose track of them.
                // So, calculate how long to delay their movement.
                let delay = 0;
                const occupantTime = occupant.calculateMoveTime(exit, isRunning, occupant.getFollowingSpeed());
                if (occupantTime <= time) delay = time - occupantTime;
                // Add one tick to the delay just to be safe.
                delay += Game.tick;
                occupant.doAfterDelay(delay, async () => {
                    occupant.moveQueue = [exit.name];
                    const queueMoveAction = new QueueMoveAction(this.getGame(), undefined, occupant, occupant.location, this.forced);
                    await queueMoveAction.performQueueMove(this.player.isRunning, occupant.moveQueue[0], occupant.getFollowingSpeed());
                });
            }
        }
    }
}
