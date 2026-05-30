// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import LeadAction from '../Data/Actions/LeadAction.ts';

/** @import GameSettings from '../Classes/GameSettings.ts' */
/** @import Game from '../Data/Game.ts' */
/** @import Player from '../Data/Player.ts' */

/** @type {CommandConfig} */
export const config = {
    name: "lead_player",
    description: "Leads a player who's following you.",
    // TODO: Write help details.
    details: ``,
    usableBy: "Player",
    aliases: ["lead"],
    requiresGame: true
};

/**
 * @param {GameSettings} settings
 * @returns {string}
 */
export function usage(settings) {
    return `${settings.commandPrefix}lead Luna`;
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

    const status = player.getBehaviorAttributeStatusEffects("disable lead");
    if (status.length > 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCommandDisabledError(status[0]));
    if (player.followedPlayer) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotLeadWhileFollowingError(player, "Player"));

    // This will be checked multiple times, so get it now.
    const hiddenStatus = player.getBehaviorAttributeStatusEffects("hidden");

    /** 
     * The new players who will led by the player performing the command.
     * @type {Set<Player>}
     */
    const newLedPlayers = new Set();
    /**
     * The players who are already being led.
     * @type {Set<Player>}
     */
    const alreadyLedPlayers = new Set();
    for (let i = 0; i < args.length; i++) {
        const playerName = args[i].toLowerCase();
        // Player cannot lead themself.
        if (playerName === player.name.toLowerCase()) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotLeadSelfError(player, "Player"));

        /** @type {Player} */
        let follower = null;
        for (const occupant of player.location.occupants) {
            if (playerName === occupant.displayName.toLowerCase()) {
                follower = occupant;
                break;
            }
        }
        if (!follower) return game.communicationHandler.reply(message, game.errorMessageGenerator.generatePlayerNotFoundInRoomError(args[i]));
        if (hiddenStatus.length > 0 && !follower.isHidden())
            return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCommandDisabledError(hiddenStatus[0]));
        if (!follower.isFollowing(player)) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotLeadNonFollowerError(player, follower, "Player"));
        if (follower.ledPlayers.length !== 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotLeadLeaderError(player, follower, "Player"));

        if (player.ledPlayers.includes(follower)) alreadyLedPlayers.add(follower);
        else newLedPlayers.add(follower);
    }
    if (newLedPlayers.size === 0 && alreadyLedPlayers.size !== 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateNoNewLedPlayersError(player, "Player"));
    else if (newLedPlayers.size === 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generatePlayersNotFoundError(args));

    const action = new LeadAction(game, message, player, player.location, false);
    await action.performLead(Array.from(newLedPlayers));
}
