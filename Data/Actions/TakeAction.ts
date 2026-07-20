// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Interactable from "../../Classes/Interactables/Interactable.ts";
import { getSortedItemsString, round } from "../../Modules/helpers.ts";
import Action from "../Action.ts";
import type EquipmentSlot from "../EquipmentSlot.ts";
import Fixture from "../Fixture.ts";
import type InventoryItem from "../InventoryItem.ts";
import InventorySlot from "../InventorySlot.ts";
import Puzzle from "../Puzzle.ts";
import RoomItem from "../RoomItem.ts";
import AttemptAction from "./AttemptAction.ts";

/**
 * Represents a take action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#take-action
 */
export default class TakeAction extends Action {
    /**
     * Performs a take action.
     *
     * @param item - The room item to take.
     * @param handEquipmentSlot - The hand equipment slot to put the item in.
     * @param container - The item's current container.
     * @param inventorySlot - The {@link InventorySlot|inventory slot} the item is currently in.
     * @param notify - Whether or not to notify the player that they took the item. Defaults to true.
     */
    performTake(item: RoomItem, handEquipmentSlot: EquipmentSlot, container: RoomItemContainer, inventorySlot: InventorySlot<RoomItem>, notify: boolean = true): void {
        if (this.performed) return;
        super.perform();
        const successful = this.forced || round(this.player.carryWeight + item.weight) <= this.player.maxCarryWeight;
        this.getGame().logHandler.logTake(item, this.player, container, inventorySlot, successful, this.forced);
        if (!successful) {
            this.getGame().narrationHandler.narrateFailedTake(this, item, this.player, notify);
            return;
        }
        const takenItem = this.player.take(item, handEquipmentSlot, container, inventorySlot);
        const interactables = this.#getInteractables(takenItem, container);
        this.getGame().narrationHandler.narrateTake(this, takenItem, container, this.player, notify, interactables);
        // Container is a weight puzzle.
        if (container instanceof Puzzle && container.type === "weight") {
            const weight = container.getContainedItemsWeight();
            const attemptAction = new AttemptAction(this.getGame(), undefined, this.player, this.location, this.forced);
            attemptAction.performAttempt(container, undefined, String(weight), "take", "");
        }
        // Container is a container puzzle.
        else if (container instanceof Puzzle && container.type === "container") {
            const containerItems = container.getContainedItems().filter(item => !isNaN(item.quantity));
            const containerItemsString = getSortedItemsString(containerItems);
            const attemptAction = new AttemptAction(this.getGame(), undefined, this.player, this.location, this.forced);
            attemptAction.performAttempt(container, undefined, containerItemsString, "take", "");
        }
        // Container is a take puzzle.
        else if (container instanceof Puzzle && container.type === "take") {
            const attemptAction = new AttemptAction(this.getGame(), undefined, this.player, this.location, this.forced);
            attemptAction.performAttempt(container, item, item.getIdentifier(), "take", "");
        }
        const slotPhrase = inventorySlot ? `${inventorySlot.id} of ` : ``;
        this.successMessage = `Successfully took ${item.getIdentifier()} from ${slotPhrase}${container.getEntityID()} for ${this.player.name}.`;
    }

    #getInteractables(takenItem: InventoryItem, container: RoomItemContainer): Interactable[] {
        const interactableManager = this.getGame().clientContext.interactableManager;
        let interactables = interactableManager.getStashInteractables(this.player, this.user);
        interactables = interactables.concat(interactableManager.getCraftInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getUncraftInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getUseInteractables(this.player, this.user));
        interactables = interactables.concat(interactableManager.getEquipInteractables(this.player, this.user));
        const inspectables: Inspectable[] = [takenItem];
        if (container instanceof Puzzle && container.parentFixture) inspectables.push(container.parentFixture);
        else if (!(container instanceof Puzzle)) inspectables.push(container);
        interactables = interactables.concat(interactableManager.createInspectActionInteractable(inspectables, this.player, this.user));
        interactables = interactables.concat(interactableManager.getDropInteractables(container, this.player, this.user));
        if (container instanceof Fixture)
            interactables = interactables.concat(interactableManager.getActivateOrDeactivateInteractables(container, this.player, undefined, this.user));
        return interactables;
    }

    /**
     * Finds the required room item to call performTake.
     *
     * @param args - The args as strings.
     */
    parseInteractionArgs(args: string[]): [RoomItem] {
        const item = this.getGame().entityFinder.getRoomItem(args[0], args[1], args[2], args[3], args[4]);
        return [item];
    }

    /**
     * Validates the parsed args. The results can be passed directly into performTake.
     *
     * @param args - The args after being parsed.
     */
    validateInteractionArgs(args: [RoomItem]): [RoomItem, EquipmentSlot, Puzzle | Fixture | RoomItem, InventorySlot<RoomItem>] | [] {
        if (args.length !== 1) return [];
        if (!args[0] || !(args[0] instanceof RoomItem)) return [];
        const item = args[0];
        const disabledStatusEffects = this.player.getStatusEffectsDisablingCommand("take");
        if (disabledStatusEffects.length > 0) return [];
        if (item.getLocation().id !== this.player.location.id) return [];
        if (!item.accessible || item.quantity === 0) return [];
        const freeHand = this.getGame().entityFinder.getPlayerFreeHand(this.player);
        if (!freeHand) return [];
        const container = item.container;
        if (!container) return [];
        const topContainer = item.getTopContainer();
        if (topContainer !== null) {
            if (topContainer instanceof Fixture && topContainer.isProcessingItems()) return [];
            if (topContainer instanceof Puzzle && (topContainer.parentFixture === null || this.player.isHidden() && topContainer.name !== this.player.hidingSpot)) return [];
        }
        const inventorySlot = container instanceof RoomItem ? container.inventory.get(item.slot) : undefined;
        return [item, freeHand, container, inventorySlot];
    }
}
