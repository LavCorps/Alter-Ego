// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Player from "../Player.ts";
import QueueMoveAction from "./QueueMoveAction.ts";

/**
 * Represents a follow action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#follow-action
 */
export default class FollowAction extends Action {
    /**
     * Performs a follow action.
     *
     * @param player - The player to follow.
     */
    async performFollow(player: Player): Promise<void> {
        if (this.performed) return;
        super.perform();
        this.getGame().narrationHandler.narrateFollow(this, this.player, player);
        this.player.stopMoving();
        this.player.stopFollowing();
        this.player.startFollowing(player);
        if (player.isMoving) {
            this.player.moveQueue = [player.moveQueue[0]];
            const queueMoveAction = new QueueMoveAction(this.getGame(), undefined, this.player, this.player.location, this.forced);
            await queueMoveAction.performQueueMove(player.isRunning, this.player.moveQueue[0], this.player.getFollowingSpeed());
        }
        this.successMessage = `Successfully made ${this.player.name} begin following ${player.name}.`;
    }
}
