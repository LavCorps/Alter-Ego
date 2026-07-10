// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { LuaState } from "lua-state"
import GameEntity from "./GameEntity.ts";
import type Room from "./Room.ts";
import type Fixture from "./Fixture.ts";
import type Game from "./Game.ts";

export type ComputerField =
    "name" |
    "location" |
    "parentFixture";

/**
 * Represents an interactable entity embodying a fully-featured Lua VM.
 */
export default class Computer extends GameEntity implements PersistentGameEntity {
    /**
     * The name of the computer.
     */
    readonly name: string;
    /**
     * The display name of the location the computer is found in.
     */
    readonly locationDisplayName: string;
    /**
     * The location the computer is found in.
     */
    location: Room;
    /**
     * The name of the fixture associated with the computer.
     */
    readonly parentFixtureName: string;
    /**
     * The computer's parent fixture. If there isn't one, this is `null`.
     */
    parentFixture: Fixture | null;
    /**
     * The description of the puzzle when a player attempts to solve it while all of the requirements are not met.
     */
    readonly state: LuaState;

    /**
     * @param name - The name of the puzzle.
     * @param locationDisplayName - The display name of the location the puzzle is found in.
     * @param parentFixtureName - The name of the fixture associated with the puzzle.
     * @param row - The row number of the puzzle in the sheet.
     * @param game - The game this belongs to.
     */
    constructor(name: string, locationDisplayName: string, parentFixtureName: string, row: number, game: Game) {
        super(game, row);
        this.name = name;
        this.locationDisplayName = locationDisplayName;
        this.location = null;
        this.parentFixtureName = parentFixtureName;
        this.parentFixture = null;
        this.state = new LuaState();
    }

    /** Gets the entity's location. */
    getLocation(): Room {
        return this.location;
    }

    /**
     * Sets the location.
     */
    setLocation(room: Room): void {
        this.location = room;
    }

    /**
     * Sets the parent fixture.
     */
    setParentFixture(fixture: Fixture): void {
        this.parentFixture = fixture;
    }

    /**
     * Gets the accessibility of the parent fixture.
     */
    get accessible(): boolean {
        return this.parentFixture.accessible;
    }

    /**
     * Gets the name of the parent fixture preceded by "the". If no parent fixture exists, returns the puzzle's name preceded by "the" instead.
     */
    getContainingPhrase(): string {
        return this.parentFixture ? this.parentFixture.getContainingPhrase() : `the ${this.name}`;
    }

    /**
     * Gets the preposition of the parent fixture, if applicable. If no parent fixture exists, returns "in".
     */
    getPreposition(): string {
        return this.parentFixture ? this.parentFixture.getPreposition() : "in";
    }

    correctCell(): string {
        return this.getGame().constants.puzzleSheetCorrectColumn + this.row;
    }

    alreadySolvedCell(): string {
        return this.getGame().constants.puzzleSheetAlreadySolvedColumn + this.row;
    }

    unsolvedCell(): string {
        return this.getGame().constants.puzzleSheetUnsolvedColumn + this.row;
    }

    incorrectCell(): string {
        return this.getGame().constants.puzzleSheetIncorrectColumn + this.row;
    }

    noMoreAttemptsCell(): string {
        return this.getGame().constants.puzzleSheetNoMoreAttemptsColumn + this.row;
    }

    requirementsNotMetCell(): string {
        return this.getGame().constants.puzzleSheetRequirementsNotMetColumn + this.row;
    }

    getContainerIdentifier(): string {
        return this.getEntityID();
    }

    getEntityID(): string {
        return this.name;
    }

    getLabel(field: ComputerField): string {
        switch (field) {
            case "name": return "Puzzle Name";
            case "location": return "Location";
            case "parentFixture": return "Parent Fixture";
        }
    }

    getValue(field: ComputerField): string {
        switch (field) {
            case "name": return this.name;
            case "location": return this.location.displayName;
            case "parentFixture": return this.parentFixture?.name ?? "";
        }
    }

    getViewField(field: ComputerField): ViewField {
        return { label: this.getLabel(field), value: this.getValue(field) };
    }

    override getEntityType(): string {
        return "Computer";
    }
}
