// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type HidingSpot from "../HidingSpot.ts";
import InflictAction from "./InflictAction.ts";
import { generateListString } from "../../Modules/helpers.ts";

/**
 * Represents a hide action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#hide-action
 */
export default class HideAction extends Action {
    /**
     * Performs a hide action.
     *
     * @param hidingSpot - The hiding spot to hide in.
     */
    async performHide(hidingSpot: HidingSpot): Promise<void> {
        if (this.performed) return;
        super.perform();

        const party = this.player.party;
        const players = party ? party.getMemberSet() : new Set([this.player]);

        this.getGame().narrationHandler.narrateHide(this, hidingSpot, this.player, players);
        let successful = false;
        if (hidingSpot.occupants.length + players.size <= hidingSpot.capacity || this.forced) {
            const hiddenStatus = this.getGame().entityFinder.getStatusEffect("hidden");
            for (const player of players) {
                const hiddenStatusAction = new InflictAction(this.getGame(), undefined, player, player.location, false);
                await hiddenStatusAction.performInflict(hiddenStatus, true, false, true);
            }
            await hidingSpot.addPlayers(players);
            const occupantsString = this.location.generateOccupantsString(this.location.occupants.filter(occupant => !occupant.isHidden() && !players.has(occupant)));
            this.location.setOccupantsString(occupantsString);
            // If a party is hiding before their positions are synchronized, we must make them stop moving, and synchronize their positions manually.
            if (party && !party.positionsSynchronized) {
                this.getGame().movementHandler.stopMoving(players);
                for (const member of party.members.values())
                    member.setPos(this.player.pos);
            }
            successful = true;
        }

        const hiddenPlayerList = generateListString(Array.from(players).map(player => player.name));
        this.getGame().logHandler.logHide(hidingSpot, this.player, hiddenPlayerList, successful, this.forced);
        this.successMessage = `Successfully hid ${hiddenPlayerList} in ${hidingSpot.getFixture().getContainingPhrase()}.`;
    }
}
