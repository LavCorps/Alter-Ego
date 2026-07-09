// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Exit from "../Exit.js";
import type Player from "../Player.ts";
import type Room from "../Room.ts";
import EnterAction from "./EnterAction.ts";
import ExitAction from "./ExitAction.ts";
import SolveAction from "./SolveAction.ts";
import { generateListString } from "../../Modules/helpers.ts";

/**
 * Represents a move action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#move-action
 */
export default class MoveAction extends Action {
    /**
     * Performs a move action.
     *
     * @param running - Whether the players are running.
     * @param currentRoom - The room the players are currently in.
     * @param destinationRoom - The room the players will be moved to.
     * @param exit - The exit the players will leave their current room through.
     * @param entrance - The exit the players will enter the destination room from.
     * @param movingFreely - Whether or not the players are performing free movement. False by default.
     * @param players - A set of players to move simultaneously. Defaults to a set containing only the player the action was created with.
     */
    async performMove(running: boolean, currentRoom: Room, destinationRoom: Room, exit: Exit, entrance: Exit, movingFreely: boolean = false, players: Set<Player> = new Set([this.player])): Promise<void> {
        if (this.performed) return;
        super.perform();

        // If there is an exit puzzle, solve it.
        if (exit) {
            const restrictedExitPuzzle = this.getGame().entityFinder.getPuzzle(exit.name, currentRoom.id, "restricted exit", true);
            const exitPuzzle = this.getGame().entityFinder.getPuzzle(exit.name, currentRoom.id, "exit", true);
            for (const player of players) {
                if (restrictedExitPuzzle && restrictedExitPuzzle.solutions.includes(player.name)) {
                    const solveAction = new SolveAction(this.getGame(), undefined, player, restrictedExitPuzzle.location, this.forced);
                    solveAction.performSolve(restrictedExitPuzzle, player.name);
                }
                else if (exitPuzzle && (exitPuzzle.solutions.length === 0 || exitPuzzle.solutions.includes(player.name))) {
                    const outcome = exitPuzzle.solutions.includes(player.name) ? player.name : undefined;
                    const solveAction = new SolveAction(this.getGame(), undefined, player, exitPuzzle.location, this.forced);
                    solveAction.performSolve(exitPuzzle, outcome);
                }
            }
        }

        // Exit the current room.
        const exitAction = new ExitAction(this.getGame(), this.message, this.player, this.location, this.forced, this.whisper);
        await exitAction.performExit(currentRoom, exit, movingFreely, players);
        // Enter the destination room.
        const enterAction = new EnterAction(this.getGame(), this.message, this.player, this.location, this.forced, this.whisper);
        await enterAction.performEnter(destinationRoom, entrance, movingFreely, running, players);
        // Send log message.
        const playerList = generateListString(Array.from(players, player => player.name));
        this.getGame().logHandler.logMove(running, destinationRoom, playerList, this.forced);
        this.successMessage = `Successfully moved ${playerList} to ${destinationRoom.channel}.`;
    }
}
