// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";

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
     */
    async performStopFollowing(narrate: boolean = true): Promise<void> {
        if (this.performed) return;
        super.perform();
        if (narrate) this.getGame().narrationHandler.narrateStop(this, this.player, false, undefined, true);
        this.player.stopFollowing();
        if (this.player.party) {
            this.player.party.leader.stopLeading(this.player);
            await this.player.party.removeFollower(this.player);
        }
    }
}
