// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import Game from "../Game.ts";
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
            this.player.startLeading(follower);
            if (partyAlreadyExists && !party.hasFollower(follower)) newFollowers.push(follower);
        }
        // If the party already exists, add only the followers who weren't already in it.
        if (partyAlreadyExists && newFollowers.length > 0)
            await party.addFollowers(newFollowers);

        // Parties need to have perfectly synchronized positions.
        // If any followers' positions differ from the leader's, start moving them toward the leader.
        let misalignedFollowers = party.getMisalignedFollowers();
        if (misalignedFollowers.length > 0) {
            // This will prevent the party from moving until all positions are synchronized.
            party.positionsSynchronized = false;

            // Keep track of the longest travel time.
            let maxTime = 0;
            for (const follower of misalignedFollowers) {
                const rate = follower.calculateMoveRate(false);
                const time = this.getGame().movementHandler.calculateMoveTime(rate, follower, this.player);
                if (time > maxTime) maxTime = time;
                // TODO: It might be nice to use a StartMoveAction here so that we can send a narration/notifications about the players approaching.
                // However, that would require StartMoveAction be refactored (inevitable anyway?).
                // Otherwise, adjusting the narrateLead function might do the trick.
                this.getGame().movementHandler.movePlayers(new Set([follower]), false, this.player, time, this.forced);
            }

            // This is a fallback in case any members of the party didn't make it to the leader
            // for some reason other than being inflicted with the weary status.
            // Mark all positions as synchronized after all followers have reached the leader.
            this.player.doAfterDelay(maxTime + Game.tick, async () => {
                misalignedFollowers = party.getMisalignedFollowers();
                if (misalignedFollowers.length > 0) {
                    const misalignedFollowersString = generateListString(misalignedFollowers.map(follower => party.getMemberDisplayName(follower) ?? follower.displayName));
                    const removalMessage = this.getGame().notificationGenerator.generateLedPlayerCouldNotSynchronizeNotification(misalignedFollowersString);
                    for (const follower of misalignedFollowers)
                        await this.player.party.removeFollower(follower, this, removalMessage);
                }
                this.player.party.positionsSynchronized = true;
            });
        }

        this.successMessage = `Successfully made ${this.player.name} begin leading ${generateListString(followers.map(player => player.name))}.`;
    }
}
