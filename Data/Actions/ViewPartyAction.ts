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
	async performViewParty(): Promise<void> {
		if (this.performed) return;
		super.perform();
		const partyString = this.player.viewParty(this.forced);
		const interactables = await this.#getInteractables();

		if (this.forced)
			this.getGame().communicationHandler.sendToCommandChannel(partyString, interactables);
		else
			this.getGame().communicationHandler.sendMessageToPlayer(this.player, partyString, true, undefined, undefined, interactables);
	}

    async #getInteractables(): Promise<Interactable[]> {
        let interactables: Interactable[] = [];
        return interactables;
    }
}
