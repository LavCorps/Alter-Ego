// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Exit from "../Exit.js";

/**
 * Represents a stop action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#stop-action
 */
export default class StopAction extends Action {
	/**
	 * Performs a stop action.
     *
	 * @param exitLocked - Whether or not the action was initiated because the destination exit was locked. Defaults to false.
	 * @param exit - The exit the player tried to move to, if applicable.
     * @param stopFollowing - Whether or not to stop following, if the player is following someone. Defaults to true.
	 */
	performStop(exitLocked: boolean = false, exit?: Exit, stopFollowing = true): void {
		if (this.performed) return;
		super.perform();
		this.player.stopMoving();
		this.getGame().narrationHandler.narrateStop(this, this.player, exitLocked, exit, stopFollowing);
        if (stopFollowing) this.player.stopFollowing();

        // If anyone is following this player, they need to stop moving.
        for (const occupant of this.location.occupants) {
            if (occupant.isMoving && occupant.isFollowing(this.player)) {
                const stopAction = new StopAction(this.getGame(), undefined, occupant, occupant.location, this.forced);
                stopAction.performStop(undefined, undefined, false);
            }
        }
	}
}
