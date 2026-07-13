// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Player from "../Player.ts";
import { generateListString } from "../../Modules/helpers.ts";
import DisbandPartyAction from "./DisbandPartyAction.ts";

/**
 * Represents a dismiss action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#dismiss-action
 */
export default class DismissAction extends Action {
    /**
     * Performs a dismiss action.
     *
     * @param followers - The followers to dismiss.
     * @param stopFollowing - Whether or not all of the listed followers should stop following the leader. Defaults to false.
     */
    async performDismissAction(followers: Player[], stopFollowing: boolean = false): Promise<void> {
        if (this.performed) return;
        super.perform();
        const party = this.player.party;

        // If all followers are being dismissed, disband the party instead.
        const disband = party.followers.size === followers.length && party.followers.every(follower => followers.includes(follower));
        if (disband) {
            const disbandAction = new DisbandPartyAction(this.getGame(), this.message, this.player, this.location, this.forced, this.whisper, this.user);
            await disbandAction.performDisbandParty(stopFollowing);
            this.successMessage = disbandAction.successMessage;
            return;
        }

        // Otherwise, just dismiss the listed players.
        this.getGame().narrationHandler.narrateDismiss(this, this.player, followers);
        for (const follower of followers) {
            this.player.stopLeading(follower);
            await party.removeFollower(follower, this, this.getGame().notificationGenerator.generateDismissNotification(this.player, false, party.getMemberDisplayName(follower)));
            if (stopFollowing) follower.stopFollowing();
        }
        const dismissedFollowerList = generateListString(followers.map(follower => follower.name));
        this.getGame().logHandler.logDismiss(this.player, dismissedFollowerList, this.forced);
        this.successMessage = `Successfully dismissed ${dismissedFollowerList} from ${this.player.name}'s party.`;
    }
}
