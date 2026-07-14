// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type HidingSpot from "../HidingSpot.ts";
import CureAction from "./CureAction.ts";

/**
 * Represents an emerge action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#emerge-action
 */
export default class EmergeAction extends Action {
    /**
     * Performs an emerge action.
     *
     * @param hidingSpot - The hiding spot to emerge from. If one is not specified, it will be searched for.
     */
    async performEmerge(hidingSpot?: HidingSpot): Promise<void> {
        if (this.performed) return;
        super.perform();
        if (!hidingSpot) {
            const hidingSpotFixture = this.getGame().entityFinder.getFixture(this.player.hidingSpot, this.player.location.id);
            if (hidingSpotFixture) hidingSpot = hidingSpotFixture.hidingSpot;
        }
        this.getGame().narrationHandler.narrateEmerge(this, hidingSpot, this.player);
        if (hidingSpot) await hidingSpot.removePlayers(this.player, this);
        else {
            const whisperNarration = this.getGame().notificationGenerator.generateEmergeNotification(this.player, false, "hiding");
            await this.player.removeFromWhispers(whisperNarration, this);
            this.player.hidingSpot = "";
        }
        const hiddenStatus = this.getGame().entityFinder.getStatusEffect("hidden");
        const cureAction = new CureAction(this.getGame(), undefined, this.player, this.player.location, true);
        cureAction.performCure(hiddenStatus, true, false, true);
        this.getGame().logHandler.logEmerge(hidingSpot, this.player, this.forced);
        this.successMessage = `Successfully brought ${this.player.name} out of hiding.`;
    }
}
