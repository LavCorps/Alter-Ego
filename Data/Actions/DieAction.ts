// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import DisbandPartyAction from "./DisbandPartyAction.ts";

/**
 * Represents a die action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#die-action
 */
export default class DieAction extends Action {
	/**
	 * Performs a die action.
     *
	 * @param customNarration - The custom text of the narration. Optional.
	 */
	async performDie(customNarration?: string): Promise<void> {
		if (this.performed) return;
		super.perform();
		this.getGame().narrationHandler.narrateDie(this, this.player, customNarration);
		this.getGame().logHandler.logDie(this.player);
        if (this.player.party && this.player.party.hasLeader(this.player)) {
            const disbandNotification = this.getGame().notificationGenerator.generatePartyDisbandedByStatusNotification(this.player, `dead`, true);
            const disbandAction = new DisbandPartyAction(this.getGame(), undefined, this.player, this.player.location, true);
            await disbandAction.performDisbandParty(true, "", "", disbandNotification);
        }
		this.player.die(this);
	}
}
