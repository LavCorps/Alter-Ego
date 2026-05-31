// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import DismissAction from '../Data/Actions/DismissAction.ts';
import DisbandPartyAction from '../Data/Actions/DisbandPartyAction.ts';

/** @import GameSettings from '../Classes/GameSettings.ts' */
/** @import Game from '../Data/Game.ts' */
/** @import Player from '../Data/Player.ts' */

/** @type {CommandConfig} */
export const config = {
    name: "dismiss_player",
    description: "Removes a player from your party.",
    // TODO: Write help details.
    details: ``,
    usableBy: "Player",
    aliases: ["dismiss", "kick"],
    requiresGame: true
};

/**
 * @param {GameSettings} settings
 * @returns {string}
 */
export function usage(settings) {
    // TODO: Write examples.
    return `${settings.commandPrefix}dismiss`;
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
        return game.communicationHandler.reply(message, game.errorMessageGenerator.generateSpecifyErrorWithUsage("at least one player", usage));

    const status = player.getBehaviorAttributeStatusEffects("disable dismiss");
    if (status.length > 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCommandDisabledError(status[0]));
    if (!player.party) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateNotInPartyError(player, "Player"));
    if (!player.party.hasLeader(player)) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateNotPartyLeaderError(player, "Player", false));

    /**
     * @type {Set<Player>}
     */
    const dismissedPlayers = new Set();
    for (let i = 0; i < args.length; i++) {
        const playerName = args[i].toLowerCase();
        // Player cannot dismiss themself.
        if (playerName === player.name.toLowerCase()) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotSelectSelfError(player, "Player", "dismiss"));

        /** @type {Player} */
        let follower = null;
        // Check in the room first.
        for (const occupant of player.location.occupants) {
            if (player.party.hasFollower(occupant) && (playerName === occupant.displayName.toLowerCase() || playerName === player.party.getMemberDisplayName(occupant).toLowerCase())) {
                follower = occupant;
                break;
            }
            else if (!player.party.hasFollower(occupant) && playerName === occupant.displayName.toLowerCase())
                return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotSelectNonFollowerError(player, occupant, "Player", "dismiss"));
        }
        // If the follower wasn't found in the room, try checking in the party.
        if (!follower) {
            for (const member of player.party.followers.values()) {
                if (playerName === member.displayName.toLowerCase() || playerName === player.party.getMemberDisplayName(member).toLowerCase()) {
                    follower = member;
                    break;
                }
            }
        }
        if (!follower) return game.communicationHandler.reply(message, game.errorMessageGenerator.generatePlayerNotFoundInRoomError(args[i]));
        dismissedPlayers.add(follower);
    }
    if (dismissedPlayers.size === 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generatePlayersNotFoundError(args));

    // If all players are being dismissed, disband the party entirely.
    if (dismissedPlayers.size === player.party.followers.size) {
        const disbandAction = new DisbandPartyAction(game, message, player, player.location, false);
        disbandAction.performDisbandParty(false);
    }
    // Otherwise, just dismiss the selected players.
    else {
        const dismissAction = new DismissAction(game, message, player, player.location, false);
        dismissAction.performDismissAction(Array.from(dismissedPlayers), false);
    }
}
