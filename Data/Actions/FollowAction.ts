// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Player from "../Player.ts";

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
    performFollow(player: Player): void {
        if (this.performed) return;
        super.perform();
        this.getGame().narrationHandler.narrateFollow(this, this.player, player);
        this.player.stopMoving();
        this.player.stopFollowing();
        this.player.startFollowing(player);
        this.successMessage = `Successfully made ${this.player.name} begin following ${player.name}.`;
    }
}
