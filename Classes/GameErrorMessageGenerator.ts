// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { generateListString, makeCopyable } from "../Modules/helpers.ts";
import type Game from "../Data/Game.ts";
import type GameSettings from "./GameSettings.js";
import type Player from "../Data/Player.ts";
import type Status from "../Data/Status.ts";

type UserContext = "Player"|"Moderator"|"Bot"|"Eligible";

/**
 * A set of functions to generate error messages to send to users.
 */
export default class GameErrorMessageGenerator {
    /**
     * The game this belongs to.
     */
    readonly #game: Game;
    private youCannotString = `You cannot do that because you are`;

    /**
     * @param game - The game this belongs to.
     */
    constructor(game: Game) {
        this.#game = game;
    }

    /**
     * Generates a string containing the name of a command in a copyable string with the command prefix character.
     * @param commandName - The name of the command.
     */
    private getCommandString(commandName: string) {
        return makeCopyable(`${this.#game.settings.commandPrefix}${commandName}`);
    }

    /**
     * If the player's pronouns are plural, returns "are". If the player's pronouns are singular, returns "is".
     * @param player - The player whose pronouns determine the verb.
     * @param context - The context in which the command is being issued. If the context is "Moderator" or "Bot", the player's original pronouns will be used.
     */
    private isOrAre(player: Player, context: UserContext) {
        const pronouns = context === "Moderator" || context === "Bot" ? player.originalPronouns : player.pronouns;
        return pronouns?.plural ? "are" : "is";
    }

    /**
     * Generates an error message indicating an insufficient number of arguments was provided.
     */
    generateInsufficientArgumentsError() {
        return `Insufficient arguments.`;
    }

    /**
     * Generates an error message indicating that the provided game entity was invalid.
     * @param entity - The type of entity that was invalid.
     */
    generateInvalidEntityError(entity: PersistentGameEntityName) {
        return `Invalid ${entity}.`;
    }

    /**
     * Generates an error message indicating that the user needs to specify the given requirements.
     * Also includes the usage for the command.
     * @param requiredSpecification - A string indicating what the user needs to specify.
     */
    generateSpecifyError(requiredSpecification: string) {
        return `You need to specify ${requiredSpecification}.`;
    }

    /**
     * Generates an error message indicating that the user needs to specify the given requirements.
     * Also outputs the usage for a command.
     * @param requiredSpecification - A string indicating what the user needs to specify.
     * @param usageFunction - A function to generate the usage string.
     */
    generateSpecifyErrorWithUsage(requiredSpecification: string, usageFunction: (settings: GameSettings) => string) {
        return this.generateSpecifyError(requiredSpecification) + ` Usage:\n${usageFunction(this.#game.settings)}`;
    }

    /**
     * Generates an error message indicating a command is disabled by a status effect.
     * @param status - The status effect the command is disabled by.
     */
    generateCommandDisabledError(status: Status) {
        return `${this.youCannotString} **${status.id}**.`;
    }

    /**
     * Generates an error message indicating that an entity couldn't be found.
     * @param entityType - The type of entity that couldn't be found.
     * @param entityName - The name of the entity that couldn't be found.
     */
    generateEntityNotFoundError(entityType: string, entityName: string) {
        return `Couldn't find ${entityType} "${entityName}".`;
    }

    /**
     * Generates an error message indicating that the listed players couldn't be found.
     * @param playerNames - A list of player names.
     */
    generatePlayersNotFoundError(playerNames: string[]) {
        return `Couldn't find player${playerNames.length !== 1 ? `s` : ``}: ${playerNames.join(", ")}.`;
    }

    /**
     * Generates an error message indicating that the player couldn't be found in the room.
     * @param playerName - The name of a player.
     */
    generatePlayerNotFoundInRoomError(playerName: string) {
        return `Couldn't find player "${playerName}" in the room with you. Make sure you spelled it right.`;
    }

    /**
     * Generates an error message indicating that the players are not in the same room.
     * @param players - A list of players.
     */
    generatePlayersNotInSameRoomError(players: Player[]) {
        const playerNames = players.map(player => player.name);
        return `${generateListString(playerNames)} are not in the same room.`;
    }

    /**
     * Generates an error message indicating that the player cannot move because they are already moving.
     */
    generateAlreadyMovingError() {
        return `${this.youCannotString} already moving.`;
    }

    /**
     * Generates an error message indicating that the player cannot move because they are currently following someone.
     * @param player - The player being addressed.
     */
    generateCannotMoveAlreadyFollowingPlayerError(player: Player) {
        return `${this.youCannotString} following ${player.followedPlayerDisplayName}. `
            + `If you want to move of your own accord again, use ${this.getCommandString(`stop`)} first.`;
    }

    /**
     * Generates an error message indicating that the player cannot move because their location has changed.
     */
    generateCannotMoveLocationMismatchError() {
        return `${this.youCannotString} no longer in that room.`;
    }

    /**
     * Generates an error message indicating that an exit name cannot be used if listed players are not in the same room.
     */
    generateCannotUseExitOnPlayersInDifferentRoomsError() {
        return "All listed players must be in the same room to use an exit name.";
    }

    /**
     * Generates an error message indicating that the player cannot follow because they are already following someone.
     * @param player - The player who cannot follow.
     * @param context - The context in which the command is being issued.
     */
    generateCannotFollowWhenAlreadyFollowingError(player: Player, context: UserContext) {
        switch (context) {
            case "Player":
                return `${this.youCannotString} already following ${player.followedPlayerDisplayName}. `
                    + `If you want to follow someone else, use ${this.getCommandString(`stop`)} first.`;
            default:
                return `${player.name} is already following ${player.followedPlayerDisplayName}.`;
        }
    }

    /**
     * Generates an error message indicating that the player is already following the player they want to follow.
     * @param player - The player who cannot follow.
     * @param context - The context in which the command is being issued.
     */
    generateAlreadyFollowingPlayerError(player: Player, context: UserContext) {
        switch (context) {
            case "Player":
                return `You are already following ${player.followedPlayerDisplayName}.`;
            default:
                return `${player.name} is already following ${player.followedPlayer?.name}.`;
        }
    }

    /**
     * Generates an error message indicating that the player cannot follow themself.
     * @param player - The player who cannot follow.
     * @param context - The context in which the command is being issued.
     */
    generateCannotFollowSelfError(player: Player, context: UserContext) {
        switch (context) {
            case "Player":
                return `You cannot follow yourself.`;
            default:
                return `${player.name} cannot follow ${player.originalPronouns.ref}.`;
        }
    }

    /**
     * Generates an error message indicating that the player cannot follow a player who is already following them.
     * @param player - The player who cannot follow.
     * @param context - The context in which the command is being issued.
     */
    generateCannotFollowFollowerError(player: Player, context: UserContext) {
        const followedPlayer = player.followedPlayer;
        switch (context) {
            case "Player":
                return `You cannot follow ${followedPlayer?.displayName} because ${followedPlayer?.pronouns?.sbj} ${this.isOrAre(followedPlayer, context)} already following you.`;
            default:
                return `${player.name} cannot follow ${followedPlayer?.name} because ${followedPlayer?.originalPronouns.sbj} ${this.isOrAre(followedPlayer, context)} already following ${player.originalPronouns.obj}.`;
        }
    }

    /**
     * Generates an error message indicating that the player cannot follow a player because doing so would create an infinite loop.
     * @param player - The player who cannot follow.
     * @param context - The context in which the command is being issued.
     */
    generateFollowingWouldCauseInfiniteLoopError(player: Player, context: UserContext) {
        const followedPlayer = player.followedPlayer;
        switch (context) {
            case "Player":
                return `You cannot follow ${followedPlayer?.displayName} because doing so would create an infinite loop.`;
            default:
                return `${player.name} cannot follow ${followedPlayer?.name} because doing so would create an infinite loop.`;
        }
    }
}
