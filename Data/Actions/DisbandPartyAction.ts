// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";

/**
 * Represents a disband party action.
 * 
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#disband-party-action
 */
export default class DisbandPartyAction extends Action {
    /**
     * Performs a disband party action.
     * 
     * @param stopFollowing - Whether or not all followers should stop following the leader. Defaults to false.
     * @param customNarration - A custom narration to send instead of the default narration. Optional.
     * @param customLeaderNotification - A custom notification to send to the leader instead of the default notification. Optional.
     * @param customFollowerNotification - A custom notification to send to the followers instead of the default notification. Optional.
     */
    async performDisbandParty(stopFollowing: boolean = false, customNarration?: string, customLeaderNotification?: string, customFollowerNotification?: string): Promise<void> {
        if (this.performed) return;
        super.perform();
        const party = this.player.party;
        const followers = party ? party.followers.map(player => player) : [];
        this.getGame().narrationHandler.narrateDisbandParty(this, this.player, followers, stopFollowing, customNarration, customLeaderNotification, customFollowerNotification);
        for (const follower of followers) {
            this.player.stopLeading(follower);
            if (stopFollowing) follower.stopFollowing();
        }
        await party.disband();
        this.successMessage = `Successfully disbanded ${this.player.name}'s party.`;
    }
}