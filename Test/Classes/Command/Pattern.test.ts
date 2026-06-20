// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Slot } from "../../../Classes/Command/Pattern.ts";
import { EntityToken, ItemContainerToken } from "../../../Classes/Command/Token.ts";
import EquipmentSlot from "../../../Data/EquipmentSlot.ts";
import Event from "../../../Data/Event.ts";
import Exit from "../../../Data/Exit.ts";
import Fixture from "../../../Data/Fixture.ts";
import Flag from "../../../Data/Flag.ts";
import InventoryItem from "../../../Data/InventoryItem.ts";
import Player from "../../../Data/Player.ts";
import Prefab from "../../../Data/Prefab.ts";
import Puzzle from "../../../Data/Puzzle.ts";
import Room from "../../../Data/Room.ts";
import RoomItem from "../../../Data/RoomItem.ts";
import Status from "../../../Data/Status.ts";
import { clearQueue } from "../../../Modules/messageHandler.js";

describe("Pattern file from NG Commands", () => {
    beforeAll(async () => {
        if (!game.inProgress) await game.entityLoader.loadAll();
    });

    beforeEach(async () => {
        kyra = game.entityFinder.getPlayer("Kyra");
        playerToken = new EntityToken("Kyra", kyra);
        inventoryItemToken = new ItemContainerToken("COFFEE", kyra.inventory.get("RIGHT HAND").equippedItem);
        roomItemToken = new ItemContainerToken("SIGN IN SHEET", game.entityFinder.getRoomItem("SIGN IN SHEET", "lobby"));
        fixtureToken = new ItemContainerToken("FLOOR", game.entityFinder.getFixture("FLOOR", "lobby"));
        puzzleToken = new ItemContainerToken("SCALE", game.entityFinder.getPuzzle("SCALE", "fitness-room"));
        roomToken = new EntityToken("lobby", game.entityFinder.getRoom("lobby"));
        exitToken = new EntityToken("REVOLVING DOOR 1", game.entityFinder.getExit(game.entityFinder.getRoom("lobby"), "REVOLVING DOOR 1"));
        equipmentSlotToken = new EntityToken("RIGHT HAND", kyra.inventory.get("RIGHT HAND"));
        eventToken = new EntityToken("PROLOGUE", game.entityFinder.getEvent("PROLOGUE"));
        flagToken = new EntityToken("CHAPTER", game.entityFinder.getFlag("CHAPTER"));
        prefabToken = new EntityToken("PEN", game.entityFinder.getPrefab("PEN"));
        statusToken = new EntityToken("heated", game.entityFinder.getStatusEffect("heated"));
    });

    afterEach(async () => {
        clearQueue(game);
        vi.resetAllMocks();
    });

    let kyra: Player;
    let playerToken: EntityToken<Player>;
    let inventoryItemToken: ItemContainerToken<InventoryItem>;
    let roomItemToken: ItemContainerToken<RoomItem>;
    let fixtureToken: ItemContainerToken<Fixture>;
    let puzzleToken: ItemContainerToken<Puzzle>;
    let roomToken: EntityToken<Room>;
    let exitToken: EntityToken<Exit>;
    let equipmentSlotToken: EntityToken<EquipmentSlot>;
    let eventToken: EntityToken<Event>;
    let flagToken: EntityToken<Flag>;
    let prefabToken: EntityToken<Prefab>;
    let statusToken: EntityToken<Status>;

    describe("Slot class from NG Commands", () => {
        test("Slot.satisfiedBy(Player)", async () => {
            const slot = new Slot(Player, "Player");
            expect(slot.satisfiedBy(playerToken)).toBeTruthy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(InventoryItem)", async () => {
            const slot = new Slot(InventoryItem, "InventoryItem");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeTruthy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(RoomItem)", async () => {
            const slot = new Slot(RoomItem, "RoomItem");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeTruthy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(Fixture)", async () => {
            const slot = new Slot(Fixture, "Fixture");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeTruthy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(Puzzle)", async () => {
            const slot = new Slot(Puzzle, "Puzzle");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeTruthy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(Room)", async () => {
            const slot = new Slot(Room, "Room");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeTruthy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(Exit)", async () => {
            const slot = new Slot(Exit, "Exit");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeTruthy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(EquipmentSlot)", async () => {
            const slot = new Slot(EquipmentSlot, "EquipmentSlot");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeTruthy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(Event)", async () => {
            const slot = new Slot(Event, "Event");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeTruthy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(Flag)", async () => {
            const slot = new Slot(Flag, "Flag");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeTruthy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(Prefab)", async () => {
            const slot = new Slot(Prefab, "Prefab");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeTruthy();
            expect(slot.satisfiedBy(statusToken)).toBeFalsy();
        });

        test("Slot.satisfiedBy(Status)", async () => {
            const slot = new Slot(Status, "Status");
            expect(slot.satisfiedBy(playerToken)).toBeFalsy();
            expect(slot.satisfiedBy(inventoryItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomItemToken)).toBeFalsy();
            expect(slot.satisfiedBy(fixtureToken)).toBeFalsy();
            expect(slot.satisfiedBy(puzzleToken)).toBeFalsy();
            expect(slot.satisfiedBy(roomToken)).toBeFalsy();
            expect(slot.satisfiedBy(exitToken)).toBeFalsy();
            expect(slot.satisfiedBy(equipmentSlotToken)).toBeFalsy();
            expect(slot.satisfiedBy(eventToken)).toBeFalsy();
            expect(slot.satisfiedBy(flagToken)).toBeFalsy();
            expect(slot.satisfiedBy(prefabToken)).toBeFalsy();
            expect(slot.satisfiedBy(statusToken)).toBeTruthy();
        });
    });
});
