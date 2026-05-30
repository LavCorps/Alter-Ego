// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import LeadAction from '../Data/Actions/LeadAction.ts';

/** @import Moderator from '../Data/Moderator.ts'; */
/** @import GameSettings from '../Classes/GameSettings.ts'; */
/** @import Game from '../Data/Game.ts'; */
/** @import Player from '../Data/Player.ts'; */

/** @type {CommandConfig} */
export const config = {
    name: "lead_moderator",
    description: "Makes the given player lead one or more followers.",
    // TODO: Write help details.
    details: ``,
    usableBy: "Moderator",
    aliases: ["lead"],
    requiresGame: true
};

/**
 * @param {GameSettings} settings
 * @returns {string}
 */
export function usage(settings) {
    // TODO: Write examples.
    return `${settings.commandPrefix}`;
}

/**
 * @param {Game} game - The game in which the command is being executed.
 * @param {UserMessage} message - The message in which the command was issued.
 * @param {string} command - The command alias that was used.
 * @param {string[]} args - A list of arguments passed to the command as individual words.
 * @param {Moderator} moderator - The moderator who issued the command.
 */
export async function execute(game, message, command, args, moderator) {
    const sentMessageInLatchChannel = moderator?.sentMessageInLatchChannel(message) ?? false;
    if (!sentMessageInLatchChannel && args.length < 2)
        return game.communicationHandler.reply(message, game.errorMessageGenerator.generateSpecifyErrorWithUsage("a leader and at least one follower", usage));
    if (sentMessageInLatchChannel && args.length < 1)
        return game.communicationHandler.reply(message, game.errorMessageGenerator.generateSpecifyErrorWithUsage("at least one follower", usage));

    // First, find the leader.
    let player = game.entityFinder.getLivingPlayer(args[0].replace(/'s/g, ""));
    if (player && (moderator.getLatch() === null || moderator.getLatch().name.toLowerCase() !== args[0].toLowerCase().replace(/'s/g, "")))
        args.splice(0, 1);
    if (!player && sentMessageInLatchChannel)
        player = moderator.getLatch();
    if (player === undefined) return game.communicationHandler.reply(message, game.errorMessageGenerator.generatePlayersNotFoundError([args[0]]));

    // Next, find the followers.
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
        if (playerName === player.name.toLowerCase()) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotLeadSelfError(player, "Moderator"));

        /** @type {Player} */
        let follower = game.entityFinder.getLivingPlayer(args[i].replace(/'s/g, ""));
        if (!follower) return game.communicationHandler.reply(message, game.errorMessageGenerator.generatePlayerNotFoundInRoomError(args[i]));
        if (player.location.id !== follower.location.id) return game.communicationHandler.reply(message, game.errorMessageGenerator.generatePlayersNotInSameRoomError([player, follower]));
        if (!follower.isFollowing(player)) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotLeadNonFollowerError(player, follower, "Moderator"));
        if (follower.ledPlayers.length !== 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateCannotLeadLeaderError(player, follower, "Moderator"));

        if (player.ledPlayers.includes(follower)) alreadyLedPlayers.add(follower);
        else newLedPlayers.add(follower);
    }
    if (newLedPlayers.size === 0 && alreadyLedPlayers.size !== 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generateNoNewLedPlayersError(player, "Moderator"));
    else if (newLedPlayers.size === 0) return game.communicationHandler.reply(message, game.errorMessageGenerator.generatePlayersNotFoundError(args));

    const action = new LeadAction(game, message, player, player.location, true);
    await action.performLead(Array.from(newLedPlayers));
    action.sendSuccessMessageToCommandChannel();
}
