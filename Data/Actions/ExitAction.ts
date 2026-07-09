// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Exit from "../Exit.js";
import type Player from "../Player.ts";
import type Room from "../Room.ts";

/**
 * Represents an exit action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#exit-action
 */
export default class ExitAction extends Action {
    /**
     * Performs an exit action.
     *
     * @param currentRoom - The room the players are currently in.
     * @param exit - The exit the players will leave their current room through.
     * @param movingFreely - Whether or not the players are performing free movement.
     * @param players - A set of players to move simultaneously. Defaults to a set containing only the player the action was created with.
     */
    async performExit(currentRoom: Room, exit: Exit, movingFreely: boolean, players: Set<Player> = new Set([this.player])): Promise<void> {
        if (this.performed) return;
        super.perform();
        this.getGame().narrationHandler.narrateExit(this, this.player, players, currentRoom, exit, movingFreely);
        for (const player of players) {
            currentRoom.removePlayer(player);
            const whisperRemovalMessage = this.getGame().notificationGenerator.generateExitLeaveWhisperNotification(player.displayName);
            await player.removeFromWhispers(whisperRemovalMessage, this, false);
        }
    }
}
