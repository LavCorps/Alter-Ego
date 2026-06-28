// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Interactable from "../../Classes/Interactables/Interactable.ts";
import Action from "../Action.ts";

/**
 * Represents an inventory action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#inventory-action
 */
export default class InventoryAction extends Action {
    /**
     * Performs an inventory action.
     */
    performInventory(): void {
        if (this.performed) return;
        super.perform();
        const inventoryString = this.player.viewInventory(this.forced);
        const interactables = this.#getInteractables();

        if (this.forced)
            this.getGame().communicationHandler.sendToCommandChannel(inventoryString, interactables);
        else
            this.getGame().communicationHandler.sendMessageToPlayer(this.player, inventoryString, true, undefined, undefined, interactables);
    }

    #getInteractables(): Interactable[] {
        let interactables: Interactable[] = [];
        const interactableManager = this.getGame().clientContext.interactableManager;
        if (this.forced) {
            interactables = interactables.concat(interactableManager.getInstantiateInventoryItemInteractables(this.player, this.user));
            interactables = interactables.concat(interactableManager.getDestroyInventoryItemInteractables(this.player, this.user));
        }
        else {
            const inventoryItems = this.player.getContainedItems().toSorted((a, b) => this.player.getEquipmentSlot(a.equipmentSlot).row - this.player.getEquipmentSlot(b.equipmentSlot).row);
            interactables = interactables.concat(interactableManager.createInspectActionInteractable(inventoryItems, this.player, this.user));
        }
        interactables = interactables.concat(interactableManager.getStashInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getUnstashInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getCraftInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getUncraftInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getUseInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getEquipInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getUnequipInteractables(this.player, this.user));
        return interactables;
    }
}
