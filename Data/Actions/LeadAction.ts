// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Player from "../Player.ts";
import type Party from "../Party.ts";
import StopAction from "./StopAction.ts";
import { generateListString } from "../../Modules/helpers.ts";

/**
 * Represents a lead action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#lead-action
 */
export default class LeadAction extends Action {
    /**
     * Performs a lead action.
     *
     * @param followers - The players to lead.
     */
    async performLead(followers: Player[]): Promise<void> {
        if (this.performed) return;
        super.perform();
        this.getGame().narrationHandler.narrateLead(this, this.player, followers);

        // If the leader is already in a party, get their party.
        let party: Party;
        let partyAlreadyExists = false;
        if (this.player.party) {
            party = this.player.party;
            partyAlreadyExists = true;
        }
        // Otherwise, form a new party.
        else party = await this.getGame().entityLoader.createParty(this.player, followers);

        if (this.player.isMoving) {
            const stopAction = new StopAction(this.getGame(), undefined, this.player, this.player.location, this.forced);
            stopAction.performStop(false, undefined, false);
        }

        const newFollowers: Player[] = [];
        for (const follower of followers) {
            // TODO: The following block may be unnecessary, as stopping the leading player above also stops their followers.
            if (follower.isMoving) {
                const stopAction = new StopAction(this.getGame(), undefined, follower, follower.location, this.forced);
                stopAction.performStop(false, undefined, false);
            }
            this.player.startLeading(follower);
            if (partyAlreadyExists && !party.hasFollower(follower)) newFollowers.push(follower);
        }
        // If the party already exists, add only the followers who weren't already in it.
        if (partyAlreadyExists && newFollowers.length > 0)
            await party.addFollowers(newFollowers);

        this.successMessage = `Successfully made ${this.player.name} begin leading ${generateListString(followers.map(player => player.name))}.`;
    }
}
