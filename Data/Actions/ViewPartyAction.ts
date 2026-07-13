// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Interactable from "../../Classes/Interactables/Interactable.ts";
import Action from "../Action.ts";

/**
 * Represents a view party action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#view-party-action
 */
export default class ViewPartyAction extends Action {
	/**
	 * Performs a view party action.
	 */
	performViewParty(): void {
		if (this.performed) return;
		super.perform();
		const partyString = this.player.viewParty(this.forced);
		const interactables = this.#getInteractables();

		if (this.forced)
			this.getGame().communicationHandler.sendToCommandChannel(partyString, interactables);
		else
			this.getGame().communicationHandler.sendMessageToPlayer(this.player, partyString, true, undefined, undefined, interactables);
	}

    #getInteractables(): Interactable[] {
        const interactableManager = this.getGame().clientContext.interactableManager;
        let interactables: Interactable[] = [];
        if (!this.forced)
            interactables = interactables.concat(interactableManager.getInspectPartyMembersInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getDismissInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getDisbandPartyInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getStopFollowingInteractables(this.player, this.user));
        return interactables;
    }
}
