// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Player from "../Player.ts";
import { generateListString } from "../../Modules/helpers.ts";

/**
 * Represents a dismiss action.
 * 
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#dismiss-action
 */
export default class DismissAction extends Action {
    performDismissAction(followers: Player[], stopFollowing: boolean = false): void {
        if (this.performed) return;
        super.perform();
        const party = this.player.party;
        this.getGame().narrationHandler.narrateDismiss(this, this.player, followers);
        for (const follower of followers) {
            this.player.stopLeading(follower);
            party.removeFollower(follower, this, this.getGame().notificationGenerator.generateDismissNotification(this.player, false, party.getMemberDisplayName(follower)));
            if (stopFollowing) follower.stopFollowing();
        }
        this.successMessage = `Successfully dismissed ${generateListString(followers.map(follower => follower.name))} from ${this.player.name}'s party.`;
    }
}