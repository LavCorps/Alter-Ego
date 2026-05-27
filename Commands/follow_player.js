// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import FollowAction from '../Data/Actions/FollowAction.ts';

/** @import GameSettings from '../Classes/GameSettings.js' */
/** @import Game from '../Data/Game.ts' */
/** @import Player from '../Data/Player.ts' */

/** @type {CommandConfig} */
export const config = {
    name: "follow_player",
    description: "Follows another player.",
    // TODO: Write help details.
    details: ``,
    usableBy: "Player",
    aliases: ["follow"],
    requiresGame: true
};

/**
 * @param {GameSettings} settings
 * @returns {string}
 */
export function usage(settings) {
    return `${settings.commandPrefix}follow Luna`;
}

/**
 * @param {Game} game - The game in which the command is being executed.
 * @param {UserMessage} message - The message in which the command was issued.
 * @param {string} command - The command alias that was used.
 * @param {string[]} args - A list of arguments passed to the command as individual words.
 * @param {Player} player - The player who issued the command.
 */
export async function execute(game, message, command, args, player) {
    if (args.length === 0)
        return game.communicationHandler.reply(message, `You need to specify a player to follow. Usage:\n${usage(game.settings)}`);

    const status = player.getBehaviorAttributeStatusEffects("disable follow");
    if (status.length > 0) return game.communicationHandler.reply(message, `You cannot do that because you are **${status[0].id}**.`);
    if (player.isMoving) return game.communicationHandler.reply(message, `You cannot do that because you are already moving.`);

    // This will be checked multiple times, so get it now.
    const hiddenStatus = player.getBehaviorAttributeStatusEffects("hidden");

    const input = args.join(" ");
    let parsedInput = input.toUpperCase().replace(/\'/g, "");

    // First, find the player to follow.
    /** @type {Player} */
    let followedPlayer = null;
    for (let i = 0; i < player.location.occupants.length; i++) {
        const occupant = player.location.occupants[i];
        if (parsedInput === occupant.displayName.toUpperCase() && (hiddenStatus.length === 0 && !occupant.isHidden() || occupant.hidingSpot === player.hidingSpot)) {
            // Player cannot give to themselves.
            if (occupant.name === player.name) return game.communicationHandler.reply(message, "You can't follow yourself.");

            followedPlayer = occupant;
            break;
        }
        else if (parsedInput === occupant.displayName.toUpperCase() && hiddenStatus.length > 0 && !occupant.isHidden())
            return game.communicationHandler.reply(message, `You cannot do that because you are **${hiddenStatus[0].id}**.`);
    }
    if (!followedPlayer) return game.communicationHandler.reply(message, `Couldn't find player "${args[0]}" in the room with you. Make sure you spelled it right.`);
    if (player.isFollowing(followedPlayer)) return game.communicationHandler.reply(message, `You are already following ${followedPlayer.displayName}.`);

    const action = new FollowAction(game, message, player, player.location, false);
    action.performFollow(followedPlayer);
}
