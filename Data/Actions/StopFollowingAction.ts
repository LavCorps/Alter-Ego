// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Player from "../Player.ts";

/**
 * Represents a stop following action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#stop-following-action
 */
export default class StopFollowingAction extends Action {
    /**
     * Performs a stop following action.
     *
     * @param narrate - Whether or not to send a narration. Defaults to true.
     * @param players - A set of players to stop simultaneously. Defaults to a set containing only the player the action was created with.
     */
    async performStopFollowing(narrate: boolean = true, players: Set<Player> = new Set([this.player])): Promise<void> {
        if (this.performed) return;
        super.perform();
        if (narrate) this.getGame().narrationHandler.narrateStop(this, this.player, players, false, undefined, true);
        for (const player of players) {
            player.stopFollowing();
            if (player.party) {
                player.party.leader.stopLeading(player);
                await player.party.removeFollower(player);
            }
        }
    }
}
