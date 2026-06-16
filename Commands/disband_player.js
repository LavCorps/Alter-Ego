// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import DisbandPartyAction from '../Data/Actions/DisbandPartyAction.ts';

/** @import GameSettings from '../Classes/GameSettings.ts' */
/** @import Game from '../Data/Game.ts' */
/** @import Player from '../Data/Player.ts' */

/** @type {CommandConfig} */
export const config = {
    name: "disband_player",
    description: "Disbands your party.",
    // TODO: Write help details.
    details: ``,
    usableBy: "Player",
    aliases: ["disband", "dissolve"],
    requiresGame: true
};

/**
 * @param {GameSettings} settings
 * @returns {string}
 */
export function usage(settings) {
    // TODO: Write examples.
    return `${settings.commandPrefix}disband`;
}

/**
 * @param {Game} game - The game in which the command is being executed.
 * @param {UserMessage} message - The message in which the command was issued.
 * @param {string} command - The command alias that was used.
 * @param {string[]} args - A list of arguments passed to the command as individual words.
 * @param {Player} player - The player who issued the command.
 */
export async function execute(game, message, command, args, player) {
    const status = player.getBehaviorAttributeStatusEffects("disable disband");
    if (status.length > 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCommandDisabledError(status[0]));
    if (!player.party) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateNotInPartyError(player, "Player"));
    if (!player.party.hasLeader(player)) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateNotPartyLeaderError(player, "Player", true));

    const action = new DisbandPartyAction(game, message, player, player.location, false);
    await action.performDisbandParty(false);
}
