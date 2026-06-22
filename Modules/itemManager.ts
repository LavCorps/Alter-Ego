// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Description from '../Data/Description.ts';
import Fixture from '../Data/Fixture.ts';
import Puzzle from '../Data/Puzzle.ts';
import InventoryItem from '../Data/InventoryItem.ts';
import InventorySlot from '../Data/InventorySlot.ts';
import RoomItem from '../Data/RoomItem.ts';
import ItemInstance from '../Data/ItemInstance.ts';
import { generateProceduralOutput } from './parser.js';
import type Prefab from '../Data/Prefab.ts';
import type Room from '../Data/Room.ts';
import type Player from '../Data/Player.ts';
import type CollatedItem from '../Data/CollatedItem.ts';
import type EquipmentSlot from '../Data/EquipmentSlot.ts';

/**
 * Instantiates a new room item in the specified location and container.
 * @param prefab - The prefab to instantiate as an item.
 * @param location - The room to instantiate the item in.
 * @param container - The container to instantiate the item in.
 * @param inventorySlotId - The ID of the {@link InventorySlot|inventory slot} to instantiate the item in.
 * @param quantity - The quantity to instantiate.
 * @param uses - The number of uses to instantiate the room item with. Defaults to the prefab's uses.
 * @param proceduralSelections - The manually selected procedural possibilities.
 * @param player - The player who caused this item to be instantiated, if applicable.
 * @returns The instantiated room item.
 */
export function instantiateRoomItem(prefab: Prefab, location: Room, container: RoomItemContainer, inventorySlotId: string, quantity: number, uses: number = prefab.uses, proceduralSelections: Map<string, string> = new Map(), player?: Player): RoomItem {
    let containerType = "";
    let containerName = "";
    let accessible = true;
    if (container instanceof Puzzle) {
        containerType = "Puzzle";
        containerName = container.name;
        if (!container.isAlwaysAccessible()) accessible = container.accessible && container.solved;
    }
    else if (container instanceof Fixture) {
        containerType = "Fixture";
        containerName = container.name;
        accessible = container.accessible;
    }
    else if (container instanceof RoomItem) {
        containerType = "RoomItem";
        containerName = container.identifier + '/' + inventorySlotId;
        accessible = container.accessible;
    }

    let createdItem = new RoomItem(
        prefab.id,
        generateIdentifier(prefab),
        location.id,
        accessible,
        containerType,
        containerName,
        quantity,
        uses,
        generateProceduralOutput(prefab.description, proceduralSelections, player),
        0,
        prefab.getGame()
    );
    createdItem.setPrefab(prefab);
    createdItem.setNames();
    createdItem.initializeInventory();
    createdItem.location = location;
    createdItem.container = container;
    createdItem.slot = inventorySlotId ?? "";

    if (container instanceof RoomItem)
        container.insertItem(createdItem, inventorySlotId);

    insertRoomItems(location, [createdItem]);
    return createdItem;
}

/**
 * Instantiates a new inventory item in the player's inventory with the specified equipment slot and container.
 * @param prefab - The prefab to instantiate as an inventory item.
 * @param player - The player to give this inventory item to.
 * @param equipmentSlotId - The ID of the equipment slot this inventory item will belong to.
 * @param container - The container to instantiate the item in.
 * @param inventorySlotId - The ID of the {@link InventorySlot|inventory slot} to instantiate the item in.
 * @param quantity - The quantity to instantiate.
 * @param uses - The number of uses to instantiate the inventory item with. Defaults to the prefab's uses.
 * @param proceduralSelections - The manually selected procedural possibilities.
 * @returns The instantiated inventory item.
 */
export function instantiateInventoryItem(prefab: Prefab, player: Player, equipmentSlotId: string, container: InventoryItem, inventorySlotId: string, quantity: number, uses: number = prefab.uses, proceduralSelections: Map<string, string> = new Map()): InventoryItem {
    let createdItem = new InventoryItem(
        player.name,
        prefab.id,
        generateIdentifier(prefab),
        equipmentSlotId,
        container ? "InventoryItem" : "",
        container ? container.identifier + '/' + inventorySlotId : "",
        quantity,
        uses,
        generateProceduralOutput(prefab.description, proceduralSelections, player),
        0,
        prefab.getGame()
    );
    createdItem.player = player;
    createdItem.setPrefab(prefab);
    createdItem.setNames();
    createdItem.initializeInventory();
    createdItem.container = container;
    createdItem.slot = inventorySlotId ?? "";

    // Item is being stashed.
    const equipmentSlot = player.inventory.get(equipmentSlotId);
    if (container !== null) {
        container.insertItem(createdItem, inventorySlotId);
        insertInventoryItems(player, [createdItem], equipmentSlot);
    }
    // Item is being equipped.
    else player.directEquip(createdItem, equipmentSlot);
    player.updateCarryWeight();
    return createdItem;
}

/**
 * Replaces an inventory item in-place with an instance of a different prefab.
 * @param item - The inventory item to replace.
 * @param newPrefab - The prefab to replace it with. If one isn't given, the inventory item is simply destroyed.
 * @returns The updated inventory item.
 */
export function replaceInventoryItem(item: InventoryItem, newPrefab?: Prefab | null): InventoryItem {
    if (newPrefab === null || newPrefab === undefined) {
        destroyInventoryItem(item, item.quantity, true);
    }
    else {
        item.setPrefab(newPrefab);
        item.identifier = generateIdentifier(newPrefab);
        item.uses = newPrefab.uses;

        // Destroy all child items.
        let childItems: InventoryItem[] = [];
        getChildItems(childItems, item);
        for (let i = 0; i < childItems.length; i++)
            destroyInventoryItem(childItems[i], childItems[i].quantity, false);

        item.inventory.clear();
        item.initializeInventory();
        const description = new Description(generateProceduralOutput(newPrefab.description, item.proceduralSelections, item.player), item, item.getGame());
        item.setDescription(description);
        item.setNames();
    }
    item.player.updateCarryWeight();
    return item;
}

/**
 * Destroys a room item.
 * @param item - The item to destroy.
 * @param quantity - How many of this item to destroy.
 * @param getChildren - Whether or not to recursively destroy all of the items it contains as well.
 */
export function destroyRoomItem(item: RoomItem, quantity: number, getChildren: boolean): void {
    if (isNaN(quantity)) item.quantity = 0;
    else item.quantity -= quantity;
    const container = item.container;

    if (container instanceof RoomItem)
        container.removeItem(item, item.slot, quantity);

    if (getChildren) {
        let childItems: RoomItem[] = [];
        getChildItems(childItems, item);
        for (let i = 0; i < childItems.length; i++)
            destroyRoomItem(childItems[i], childItems[i].quantity, false);
    }
}

/**
 * Destroys an inventory item.
 * @param item - The inventory item to destroy.
 * @param quantity - How many of this inventory item to destroy.
 * @param getChildren - Whether or not to recursively destroy all of the inventory items it contains as well.
 */
export function destroyInventoryItem(item: InventoryItem, quantity: number, getChildren: boolean): void {
    if (getChildren) {
        let childItems: InventoryItem[] = [];
        getChildItems(childItems, item);
        for (let i = 0; i < childItems.length; i++)
            destroyInventoryItem(childItems[i], childItems[i].quantity, false);
    }

    // If the item is equipped, simply unequip it. The directUnequip method will destroy it.
    if (item.container === null)
        item.player.directUnequip(item);
    else {
        item.quantity -= quantity;
        const container = item.container;
        container.removeItem(item, item.slot, quantity);
    }
}

/**
 * Converts a room item to an inventory item and recursively converts all of the items it contains.
 * @param item - The item to convert.
 * @param player - The player who the new inventory item will belong to.
 * @param equipmentSlotId - The ID of the equipment slot the inventory item will be created in.
 * @param quantity - The quantity of the new inventory item.
 * @returns The new inventory item.
 */
export function convertRoomItem(item: ItemInstance, player: Player, equipmentSlotId: string, quantity: number): InventoryItem {
    // Make a copy of the RoomItem as an InventoryItem.
    let createdItem = new InventoryItem(
        player.name,
        item.prefab.id,
        item.identifier,
        equipmentSlotId,
        item.container instanceof ItemInstance ? "InventoryItem" : "",
        item.container instanceof ItemInstance ? item.container.identifier + '/' + item.slot : "",
        quantity,
        item.uses,
        item.description.text,
        0,
        item.getGame()
    );
    createdItem.player = player;
    createdItem.setPrefab(item.prefab);
    createdItem.setNames();
    createdItem.initializeInventory();

    // Now recursively run through all of the inventory items and convert them.
    item.inventory.forEach(inventorySlot => {
        for (let childItem of inventorySlot.items) {
            let inventoryItem = convertRoomItem(childItem, player, equipmentSlotId, childItem.quantity);
            if (inventoryItem.containerName !== "") {
                inventoryItem.container = createdItem;
                inventoryItem.slot = inventorySlot.id;
                createdItem.insertItem(inventoryItem, inventoryItem.slot);
            }
            else createdItem.inventory.get(inventorySlot.id).items.push(inventoryItem);
        }
    });

    return createdItem;
}

/**
 * Copies an inventory item into the given equipment slot.
 * @param item - The inventory item to copy.
 * @param player - The player who the new inventory item will belong to.
 * @param equipmentSlotId - The ID of the equipment slot the inventory item will be created in.
 * @param quantity - The quantity of the new inventory item.
 * @returns The new inventory item.
 */
export function copyInventoryItem(item: InventoryItem, player: Player, equipmentSlotId: string, quantity: number): InventoryItem {
    return convertRoomItem(item, player, equipmentSlotId, quantity);
}

/**
 * Makes an exact copy of the given inventory item and returns it.
 * Does not copy any contained items.
 * @param item - The inventory item to copy.
 * @returns An exact copy of the given inventory item.
 */
export function cloneInventoryItem(item: InventoryItem): InventoryItem {
    let createdItem = new InventoryItem(
        item.player.name,
        item.prefab.id,
        item.identifier,
        item.equipmentSlot,
        item.containerType,
        item.containerName,
        item.quantity,
        item.uses,
        item.description.text,
        item.row,
        item.getGame()
    );
    createdItem.player = item.player;
    createdItem.setPrefab(item.prefab);
    createdItem.setNames();
    createdItem.initializeInventory();
    return createdItem;
}

/**
 * Converts an inventory item to a room item and recursively converts all of the inventory items it contains.
 * @param item - The inventory item to convert.
 * @param player - The player the inventory item currently belongs to.
 * @param container - The container to new item will be created in.
 * @param inventorySlotId - The ID of the {@link InventorySlot|inventory slot} to instantiate the item in.
 * @param quantity - The quantity of the new item.
 * @returns The new room item.
 */
export function convertInventoryItem(item: ItemInstance, player: Player, container: Fixture|Puzzle|ItemInstance, inventorySlotId: string, quantity: number): RoomItem {
    let containerType = "";
    let containerName = "";
    let accessible = true;
    if (container instanceof Puzzle) {
        containerType = "Puzzle";
        containerName = container.name;
        if (!container.isAlwaysAccessible()) accessible = container.accessible && container.solved;
    }
    else if (container instanceof Fixture) {
        containerType = "Fixture";
        containerName = container.name;
        accessible = container.accessible;
    }
    else if (container instanceof RoomItem) {
        containerType = "RoomItem";
        containerName = container.identifier + '/' + inventorySlotId;
        accessible = container.accessible;
    }
    else if (container instanceof InventoryItem) {
        containerType = "RoomItem";
        containerName = container.identifier + '/' + item.slot;
    }
    // Make a copy of the InventoryItem as a RoomItem.
    let createdItem = new RoomItem(
        item.prefab.id,
        item.identifier,
        player.location.id,
        accessible,
        containerType,
        containerName,
        quantity,
        item.uses,
        item.description.text,
        0,
        item.getGame()
    );
    createdItem.setPrefab(item.prefab);
    createdItem.setNames();
    createdItem.initializeInventory();
    createdItem.location = player.location;

    // Now recursively run through all of the inventory items and convert them.
    item.inventory.forEach(inventorySlot => {
        for (let childItem of inventorySlot.items) {
            let inventoryItem = convertInventoryItem(childItem, player, item, "", childItem.quantity);
            if (inventoryItem.containerName !== "") {
                inventoryItem.container = createdItem;
                inventoryItem.slot = inventorySlot.id;
                createdItem.insertItem(inventoryItem, inventoryItem.slot);
            }
            else createdItem.inventory.get(inventorySlot.id).items.push(inventoryItem);
        }
    });

    return createdItem;
}

/**
 * Recursively adds all child items of the given item to the array of items.
 * @param items - The array to add child items to.
 * @param item - The item whose child items are to be added.
 */
export function getChildItems(items: ItemInstance[], item: ItemInstance): void {
    item.inventory.forEach(inventorySlot => {
        for (let childItem of inventorySlot.items) {
            items.push(childItem);
            getChildItems(items, childItem);
        }
    });
}

/**
 * Sets the quantities of all child items to 0.
 * @param item - The item whose child items are to have their quantities updated.
 */
export function setChildItemQuantitiesZero(item: ItemInstance): void {
    let childItems: ItemInstance[] = [];
    getChildItems(childItems, item);
    for (let i = 0; i < childItems.length; i++)
        childItems[i].quantity = 0;
}

/**
 * Combines the procedural selections of the given items into one map.
 * @param items - The items whose procedural selections should be combined.
 * @returns The combined procedural selections.
 */
export function combineProceduralSelections<T extends ItemInstance>(items: (ItemInstance | CollatedItem<T>)[]): Map<string, string> {
    const proceduralSelections = new Map<string, string>();
    for (const item of items)
        item.proceduralSelections.forEach((value, key) => proceduralSelections.set(key, value));
    return proceduralSelections;
}

/**
 * Removes a stashed inventory item from the inventory slot in its container.
 * Also decrements the quantity, updates the container's description, and removes the item from its equipment slot.
 * @param item - The item to remove.
 * @param container - The item's container.
 * @param inventorySlot - The inventory slot to remove the item from.
 * @param equipmentSlot - The equipment slot to remove the item from.
 */
export function removeStashedItem(item: InventoryItem, container: InventoryItem, inventorySlot: InventorySlot<InventoryItem>, equipmentSlot: EquipmentSlot): void {
    // Reduce quantity if the quantity is finite.
    if (!isNaN(item.quantity))
        item.quantity--;

    // Update container.
    container.removeItem(item, inventorySlot.id, 1);

    // Remove the item from its equipment slot.
    if (item.quantity === 0)
        equipmentSlot.removeItem(item);
}

/**
 * Converts the given item into an inventory item and puts it in the player's hand.
 * Also converts its child items and inserts the newly created items into the game's list of inventory items.
 * @param item - The item to put in the player's hand.
 * @param player - The player whose hand the item will be put in.
 * @param handEquipmentSlot - The hand equipment slot to put the item in.
 * @returns The created item in the player's hand.
 */
export function putItemInHand(item: ItemInstance, player: Player, handEquipmentSlot: EquipmentSlot): InventoryItem {
    // Copy the item into the player's hand.
    let createdItem = convertRoomItem(item, player, handEquipmentSlot.id, 1);
    createdItem.containerName = "";
    createdItem.container = null;
    createdItem.setRow(handEquipmentSlot.row);

    // Equip the item and add it to the player's inventory.
    handEquipmentSlot.equipItem(createdItem);
    // Create a list of all the child items.
    let items: InventoryItem[] = [];
    getChildItems(items, createdItem);
    // Now that the item has been converted, we can update the quantities of child items.
    setChildItemQuantitiesZero(item);
    // Insert the new items into the game's list of inventory items.
    insertInventoryItems(player, items, handEquipmentSlot);
    return createdItem;
}

/**
 * Inserts an array of items into the game at the correct position in the game's array of room items.
 * @param location - The room to insert items into.
 * @param items - The items to insert.
 */
export function insertRoomItems(location: Room, items: RoomItem[]): void {
    const game = location.getGame();
    for (let item of items) {
        // Check if the player is putting this item back in original spot unmodified.
        const roomItems = game.roomItems.filter(gameItem => gameItem.location.id === location.id);
        let matchedItem = roomItems.find(roomItem =>
            roomItem.prefab.id === item.prefab.id &&
            roomItem.identifier === item.identifier &&
            roomItem.accessible === item.accessible &&
            roomItem.containerName === item.containerName &&
            roomItem.slot === item.slot &&
            (roomItem.uses === item.uses || isNaN(roomItem.uses) && isNaN(item.uses)) &&
            roomItem.description.text === item.description.text
        );
        if (matchedItem) {
            if (!isNaN(matchedItem.quantity))
                matchedItem.quantity += item.quantity;
            let itemContainer: RoomItemContainer = null;
            if (item.container instanceof RoomItem) {
                const containersMatch = function (item1: RoomItem, item2: RoomItem) {
                    if (item1.container instanceof RoomItem && item2.container instanceof RoomItem)
                        return containersMatch(item1.container, item2.container);
                    else {
                        return item1.containerName === item2.containerName;
                    }
                };
                const possibleContainers = roomItems.filter(roomItem =>
                    item.container instanceof RoomItem &&
                    roomItem.identifier === item.container.identifier &&
                    roomItem.containerName === item.container.containerName &&
                    roomItem.slot === item.container.slot &&
                    (roomItem.uses === item.container.uses || isNaN(roomItem.uses) && isNaN(item.container.uses)) &&
                    roomItem.description.text === item.container.description.text
                );
                for (let j = 0; j < possibleContainers.length; j++) {
                    if (item.container instanceof RoomItem && containersMatch(item.container, possibleContainers[j])) {
                        itemContainer = possibleContainers[j];
                        break;
                    }
                }
            }
            else itemContainer = item.container;
            matchedItem.container = itemContainer;
            matchedItem.weight = item.weight;
            matchedItem.inventory = item.inventory;
            // Update container's references to this item.
            if (item.container instanceof RoomItem) {
                let foundItem = false;
                for (let inventorySlot of item.container.inventory.values()) {
                    if (inventorySlot.id === item.slot) {
                        const containerSlot = inventorySlot;
                        for (let i = 0; i < containerSlot.items.length; i++) {
                            if (containerSlot.items[i].prefab.id === item.prefab.id &&
                                containerSlot.items[i].identifier === item.identifier &&
                                (containerSlot.items[i].uses === item.uses || isNaN(containerSlot.items[i].uses) && isNaN(item.uses)) &&
                                containerSlot.items[i].description.text === item.description.text) {
                                foundItem = true;
                                containerSlot.items.splice(i, 1, matchedItem);
                                break;
                            }
                        }
                        if (foundItem) break;
                    }
                }
            }
        }
        // The player is putting this item somewhere else or it's been modified somehow.
        else {
            // We want to insert this item near items in the same container, so get all of the items in that container.
            const containerItems = roomItems.filter(containerItem => containerItem.containerName === item.containerName);

            const lastRoomItem = roomItems[roomItems.length - 1];
            const lastContainerItem = containerItems[containerItems.length - 1];
            const lastGameItem = game.roomItems[game.roomItems.length - 1];
            let insertRow = -1;
            // If the list of items in that container isn't empty and isn't the last row of the spreadsheet, insert the new item.
            if (containerItems.length !== 0 && lastContainerItem.row !== lastGameItem.row)
                insertRow = lastContainerItem.row;
            // If there are none, it might just be that there are no items in that container yet. Try to at least put it near items in the same room.
            else if (roomItems.length !== 0 && lastRoomItem.row !== lastGameItem.row)
                insertRow = lastRoomItem.row;
            // If there are none, just insert it at the end of the sheet.
            else
                insertRow = lastGameItem.row;

            // Insert the new item into the items list at the appropriate position.
            let insertIndex = 0;
            for (insertIndex; insertIndex < game.roomItems.length; insertIndex++) {
                if (game.roomItems[insertIndex].row === insertRow) {
                    game.roomItems.splice(insertIndex + 1, 0, item);
                    break;
                }
            }
            // Update the rows for all of the items after this.
            for (let i = insertIndex + 1, newRow = insertRow + 1; i < game.roomItems.length; i++, newRow++)
                game.roomItems[i].setRow(newRow);
        }
    }
}


/**
 * Inserts an array of inventory items into the game at the correct position in the game's array of inventory items.
 * @param player - The player who these inventory items belong to.
 * @param items - The inventory items to insert.
 * @param equipmentSlot - The equipment slot within the player's inventory.
 */
export function insertInventoryItems(player: Player, items: InventoryItem[], equipmentSlot: EquipmentSlot): void {
    const game = player.getGame();
    let lastNewItem = player.inventory.last().equippedItem !== null ?
        player.inventory.last().equippedItem :
        player.inventory.last().items[0];
    for (let item of items) {
        // Check if this item already exists in the player's inventory.
        const playerItems = game.inventoryItems.filter(gameItem => gameItem.player.name === player.name);
        let matchedItem = playerItems.find(playerItem =>
            playerItem.prefab !== null &&
            playerItem.prefab.id === item.prefab.id &&
            playerItem.identifier === item.identifier &&
            playerItem.equipmentSlot === item.equipmentSlot &&
            playerItem.containerName === item.containerName &&
            playerItem.slot === item.slot &&
            (playerItem.uses === item.uses || isNaN(playerItem.uses) && isNaN(item.uses)) &&
            playerItem.description.text === item.description.text
        );
        if (matchedItem) {
            if (!isNaN(matchedItem.quantity))
                matchedItem.quantity += item.quantity;
            const containerRow = matchedItem.container !== null ? matchedItem.container.row : 0;
            matchedItem.container = item.container;
            if (containerRow !== 0 && item.container.row === 0) matchedItem.container.setRow(containerRow);
            matchedItem.weight = item.weight;
            matchedItem.inventory = item.inventory;
            // Update container's references to this item.
            if (item.container instanceof InventoryItem) {
                let foundItem = false;
                for (let inventorySlot of item.container.inventory.values()) {
                    if (inventorySlot.id === item.slot) {
                        const containerSlot = inventorySlot;
                        for (let j = 0; j < containerSlot.items.length; j++) {
                            if (containerSlot.items[j].prefab.id === item.prefab.id &&
                                containerSlot.items[j].identifier === item.identifier &&
                                (containerSlot.items[j].uses === item.uses || isNaN(containerSlot.items[j].uses) && isNaN(item.uses)) &&
                                containerSlot.items[j].description.text === item.description.text) {
                                foundItem = true;
                                containerSlot.items.splice(j, 1, matchedItem);
                                break;
                            }
                        }
                        if (foundItem) break;
                    }
                }
            }
            equipmentSlot.items.splice(equipmentSlot.items.length, 0, matchedItem);
        }
        // The player hasn't picked this item up before or it's been modified somehow.
        else {
            // We want to insert this item near items in the same container slot, so get all of the items in that container slot.
            const slotItems = playerItems.filter(playerItem => playerItem.equipmentSlot === item.equipmentSlot && playerItem.containerName === item.containerName);
            // Just in case there aren't any, get items just within the same container.
            const containerItems = playerItems.filter(playerItem => playerItem.equipmentSlot === item.equipmentSlot && playerItem.container !== null && playerItem.container.identifier !== "" && playerItem.container.identifier === item.container.identifier);

            const lastSlotItem = slotItems[slotItems.length - 1];
            const lastContainerItem = containerItems[containerItems.length - 1];

            let insertRow = -1;
            // If the list of items in that slot isn't empty, insert the new item.
            if (slotItems.length !== 0)
                insertRow = lastSlotItem.row;
            // If there are none, it might just be that there are no items in that slot yet. Try to at least put it near items in the same container.
            else if (containerItems.length !== 0)
                insertRow = lastContainerItem.row;
            // If there are none, just insert it after the last new item.
            else
                insertRow = lastNewItem.row;
            lastNewItem = item;

            // Insert the new item into the inventoryItems list at the appropriate position.
            let insertIndex = 0;
            for (insertIndex; insertIndex < game.inventoryItems.length; insertIndex++) {
                if (game.inventoryItems[insertIndex].row === insertRow) {
                    game.inventoryItems.splice(insertIndex + 1, 0, item);
                    equipmentSlot.items.splice(equipmentSlot.items.length, 0, item);
                    break;
                }
            }
            // Update the rows for all of the inventoryItems after this.
            for (let i = insertIndex + 1, newRow = insertRow + 1; i < game.inventoryItems.length; i++, newRow++)
                game.inventoryItems[i].setRow(newRow);

            // Update the rows for all Player EquipmentSlots.
            game.players.forEach(player => {
                player.inventory.forEach(equipmentSlot => {
                    if (equipmentSlot.equippedItem === null) equipmentSlot.row = equipmentSlot.items[0].row;
                    else equipmentSlot.row = equipmentSlot.equippedItem.row;
                });
            });
        }
    }
}

/**
 * Generates a unique identifier for a new item instance.
 * @param prefab - The prefab this item is an instance of.
 * @returns The new unique identifier.
 */
function generateIdentifier(prefab: Prefab): string {
    let identifier = "";
    if (prefab.inventory.size > 0) {
        identifier = prefab.id;
        let number = 1;
        while (prefab.getGame().roomItems.find(item => item.identifier === `${identifier} ${number}` && item.quantity !== 0) ||
            prefab.getGame().inventoryItems.find(item => item.identifier === `${identifier} ${number}` && item.quantity !== 0))
            number++;
        identifier = `${identifier} ${number}`;
    }
    return identifier;
}
