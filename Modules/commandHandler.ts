// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Game from '../Data/Game.ts';
import BotCommand from "../Classes/Command/BotCommand.ts";
import ModeratorCommand from "../Classes/Command/ModeratorCommand.ts";
import PlayerCommand from "../Classes/Command/PlayerCommand.ts";
import EligibleCommand from "../Classes/Command/EligibleCommand.ts";
import type Player from '../Data/Player.ts';
import Puzzle from '../Data/Puzzle.ts';
import Flag from '../Data/Flag.ts';
import BotContext from '../Classes/Command/BotContext.ts';
import Trie from '../Classes/Command/Trie.ts';
import type { Token } from '../Classes/Command/Token.ts';
import { MatchedInvocation, ValidatedInvocation, type InvalidInvocation, type MatchResult, type ValidationResult } from '../Classes/Command/Invocation.ts';
import type { Pattern } from '../Classes/Command/Pattern.ts';
import type Command from '../Classes/Command/Command.ts';
import type Context from '../Classes/Command/Context.ts';
import { Collection } from 'discord.js';
import ModeratorContext from '../Classes/Command/ModeratorContext.ts';
import PlayerContext from '../Classes/Command/PlayerContext.ts';
import EligibleContext from '../Classes/Command/EligibleContext.ts';

export type CommandType = "Bot" | "Moderator" | "Player" | "Eligible";
export type CommandOf<T extends CommandType> =
    T extends "Bot" ? BotCommand
        : T extends "Moderator" ? ModeratorCommand
            : T extends "Player" ? PlayerCommand
                : T extends "Eligible" ? EligibleCommand
                    : undefined;

/**
 * Match a stream of tokens against command patterns.
 * @param tokens - The array of token arrays to match with.
 * @param patterns - The array of patterns to attempt matches against.
 * @returns The array of pattern match results, that is, an array of Invalid Invocations and/or Matched Invocations.
 */
export async function matchTokens(tokens: Token[][], patterns: Pattern[]): Promise<MatchResult[]> {
    return patterns.map(pattern => pattern.match(tokens));
}

/**
 * Validate an array of matches against a command's validator function.
 * @param matches - The array of matches to validate.
 * @param command - The command to validate for.
 * @param context - The context to validate within.
 * @returns The array of validation results, that is, an array of Invalid Invocations and/or Validated Invocations.
 */
export async function validateMatches(matches: MatchedInvocation[], command: Command<Context>, context: Context): Promise<ValidationResult[]> {
    const invocations: ValidationResult[] = [];
    for (const match of matches)
        invocations.push(await command.validate(context, match));
    return invocations;
}

/**
 * Finds the right command file for the user and executes it.
 * @param commandStr - The full text of the command issued.
 * @param game - The game in which the command is being executed.
 * @param message - The message in which the command was issued, if applicable.
 * @param player - The player who issued the command, or caused it to be executed, if applicable.
 * @param callee - The in-game entity that caused the command to be executed, if applicable.
 * @returns Whether the command was successfully executed.
 */
export async function executeCommand(commandStr: string, game: Game, message?: UserMessage, player?: Player, callee?: Callee): Promise<boolean> {
    const timestamp = new Date();
    const commandType = getCommandType(game, message);
    if (!commandType) return false;

    const commandSplit = commandStr?.split(/[^\S\n]/).filter(arg => arg !== "");
    const commandAlias = commandSplit[0] ? commandSplit[0].toLocaleLowerCase() : "";
    let args = commandSplit.slice(1);
    const command = game.clientContext.getCommand(commandType, commandAlias);
    if (!command) return false;

    // Execute the command based on who issued it.
    if (command instanceof BotCommand) {
        const context = new BotContext(game, commandAlias, player, callee);
        const trie = Trie.buildFromContextAndPatterns(context, command.patterns);
        const tokens = trie.tokenize(args);
        const errors: InvalidInvocation[] = [];
        const matches: MatchedInvocation[] = [];
        const validations: ValidatedInvocation[] = [];
        {
            const output = await matchTokens(tokens, command.patterns);
            for (const result of output) {
                if (result instanceof MatchedInvocation) matches.push(result);
                else errors.push(result);
            }
        }
        if (matches.length === 0) {
            if (errors.length > 0) {
                game.communicationHandler.sendToCommandChannel(errors.pop().errors[0]);
                return false;
            } else
                matches.push(new MatchedInvocation(new Collection(), []))
        }
        {
            const output = await validateMatches(matches, command, context);
            for (const result of output) {
                if (result instanceof ValidatedInvocation) validations.push(result);
                else errors.push(result);
            }
        }
        if (validations.length === 0) {
            if (errors.length > 0) {
                game.communicationHandler.sendToCommandChannel(errors.pop().errors[0]);
                return false;
            } else
                validations.push(new ValidatedInvocation(new Collection(), []));
        }
        command.execute(context, validations[0]);
        game.clientContext.logCommand(game.clientContext.client.user.username, commandStr, timestamp);
        return true;
    }
    else if (command instanceof ModeratorCommand && game.clientContext.commandIssuedInValidChannel(command, message)) {
        if (command.config.requiresGame && !game.inProgress) {
            if (message.channel.id === game.guildContext.commandChannel.id) {
                message.reply("There is no game currently running.");
                return false;
            }
            else {
                message.author.send("There is no game currently running.");
                message.delete();
                return false;
            }
        }
        const moderator = message.member ? game.entityLoader.getOrCreateModerator(message.member) : undefined;
        if (!moderator) {
            game.communicationHandler.reply(message, "You are not a moderator.");
            return false;
        }
        if (command.config.whitespaceSensitive) {
            args = commandStr.split(" ").slice(1);
        }
        const context = new ModeratorContext(game, commandAlias, message, moderator);
        const trie = Trie.buildFromContextAndPatterns(context, command.patterns);
        const tokens = trie.tokenize(args);
        const errors: InvalidInvocation[] = [];
        const matches: MatchedInvocation[] = [];
        const validations: ValidatedInvocation[] = [];
        {
            const output = await matchTokens(tokens, command.patterns);
            for (const result of output) {
                if (result instanceof MatchedInvocation) matches.push(result);
                else errors.push(result);
            }
        }
        if (matches.length === 0) {
            if (errors.length > 0) {
                game.communicationHandler.reply(message, errors.pop().errors[0]);
                return false;
            } else
                matches.push(new MatchedInvocation(new Collection(), []))
        }
        {
            const output = await validateMatches(matches, command, context);
            for (const result of output) {
                if (result instanceof ValidatedInvocation) validations.push(result);
                else errors.push(result);
            }
        }
        if (validations.length === 0) {
            if (errors.length > 0) {
                game.communicationHandler.reply(message, errors.pop().errors[0]);
                return false;
            } else {
                validations.push(new ValidatedInvocation(new Collection(), []));
            }
        }
        command.execute(context, validations[0]);
        if (message.channel.id !== game.guildContext.commandChannel.id)
            message.delete();
        game.clientContext.logCommand(message.author.username, message.content, timestamp);
        return true;
    }
    else if (command instanceof PlayerCommand && game.clientContext.commandIssuedInValidChannel(command, message)) {
        if (command.config.requiresGame && !game.inProgress) {
            message.reply("There is no game currently running.");
            return false;
        }
        for (const livingPlayer of game.livingPlayers.values()) {
            if (livingPlayer.id === message.author.id) {
                player = livingPlayer;
                break;
            }
        }
        if (!player) {
            game.communicationHandler.reply(message, "You are not on the list of living players.");
            return false;
        }
        const commandName = command.config.name.substring(0, command.config.name.indexOf('_'));
        const status = player.getBehaviorAttributeStatusEffects("disable all");
        if (status.length > 0 && !player.hasBehaviorAttribute(`enable ${commandName}`)) {
            if (player.hasStatus("heated")) game.communicationHandler.reply(message, "The situation is **heated**. Moderator intervention is required.");
            else game.communicationHandler.reply(message, `You cannot do that because you are **${status[0].id}**.`);
            return false;
        }
        if (game.editMode && commandName !== "say") {
            game.communicationHandler.reply(message, "You cannot do that because edit mode is currently enabled.");
            return false;
        }

        player.setOnline();

        if (command.config.whitespaceSensitive) {
            args = commandStr.split(" ").slice(1);
        }

        const context = new PlayerContext(game, player, commandAlias, message);
        const trie = Trie.buildFromContextAndPatterns(context, command.patterns);
        const tokens = trie.tokenize(args);
        const errors: InvalidInvocation[] = [];
        const matches: MatchedInvocation[] = [];
        const validations: ValidatedInvocation[] = [];
        {
            const output = await matchTokens(tokens, command.patterns);
            for (const result of output) {
                if (result instanceof MatchedInvocation) matches.push(result);
                else errors.push(result);
            }
        }
        if (matches.length === 0) {
            if (errors.length > 0) {
                game.communicationHandler.reply(message, errors.pop().errors[0]);
                return false;
            } else
                matches.push(new MatchedInvocation(new Collection(), []))
        }
        {
            const output = await validateMatches(matches, command, context);
            for (const result of output) {
                if (result instanceof ValidatedInvocation) validations.push(result);
                else errors.push(result);
            }
        }
        if (validations.length === 0) {
            if (errors.length > 0) {
                game.communicationHandler.reply(message, errors.pop().errors[0]);
                return false;
            } else {
                validations.push(new ValidatedInvocation(new Collection(), []));
            }
        }
        command.execute(context, validations[0]).then(() => {
            if (!game.settings.debug && commandName !== "say" && !game.guildContext.sentInDMChannel(message))
                message.delete().catch();
        });
        game.clientContext.logCommand(player.name, message.content, timestamp);
        return true;
    }
    else if (command instanceof EligibleCommand && game.clientContext.commandIssuedInValidChannel(command, message)) {
        if (command.config.requiresGame && !game.inProgress) {
            message.reply("There is no game currently running.");
            return false;
        }
        const context = new EligibleContext(game, commandAlias, message);
        const trie = Trie.buildFromContextAndPatterns(context, command.patterns);
        const tokens = trie.tokenize(args);
        const errors: InvalidInvocation[] = [];
        const matches: MatchedInvocation[] = [];
        const validations: ValidatedInvocation[] = [];
        {
            const output = await matchTokens(tokens, command.patterns);
            for (const result of output) {
                if (result instanceof MatchedInvocation) matches.push(result);
                else errors.push(result);
            }
        }
        if (matches.length === 0) {
            if (errors.length > 0) {
                game.communicationHandler.reply(message, errors.pop().errors[0]);
                return false;
            } else
                matches.push(new MatchedInvocation(new Collection(), []))
        }
        {
            const output = await validateMatches(matches, command, context);
            for (const result of output) {
                if (result instanceof ValidatedInvocation) validations.push(result);
                else errors.push(result);
            }
        }
        if (validations.length === 0) {
            if (errors.length > 0) {
                game.communicationHandler.reply(message, errors.pop().errors[0]);
                return false;
            } else {
                validations.push(new ValidatedInvocation(new Collection(), []));
            }
        }
        command.execute(context, validations[0]).then(() => {
            if (!game.settings.debug && !game.guildContext.sentInDMChannel(message))
                message.delete().catch();
        });
        game.clientContext.logCommand(message.author.username, message.content, timestamp);
        return true;
    }

    return false;
}

/**
 * @param commandSet - A list of bot commands to pass into the command handler's execute function.
 * @param game - The game in which the command is being executed.
 * @param callee - The in-game entity that caused the command to be executed.
 * @param player - The player who caused the command to be executed, if applicable.
 */
export async function parseAndExecuteBotCommands(commandSet: string[], game: Game, callee: Callee, player?: Player) {
    for (let command of commandSet) {
        if (command.startsWith("wait")) {
            let args = command.split(" ");
            if (!args[1]) return game.communicationHandler.sendToCommandChannel(`Error: Couldn't execute command "${command}". No amount of seconds to wait was specified.`);
            const seconds = parseInt(args[1]);
            if (isNaN(seconds) || seconds < 0) return game.communicationHandler.sendToCommandChannel(`Error: Couldn't execute command "${command}". Invalid amount of seconds to wait.`);
            await sleep(seconds);
        }
        else {
            if (callee instanceof Puzzle && callee.type === "matrix") {
                const regex = /{([^{},/]+?)}/g;
                let match: RegExpExecArray;
                const originalCommand = command;
                while (match = regex.exec(originalCommand)) {
                    for (const requirement of callee.requirements) {
                        if (requirement instanceof Puzzle && requirement.name.toUpperCase() === match[1].toUpperCase() && requirement.outcome !== "")
                            command = command.replace(match[0], requirement.outcome);
                        else if (requirement instanceof Flag && typeof requirement.value === 'string' && requirement.id === match[1].toUpperCase() && requirement.value !== null)
                            command = command.replace(match[0], requirement.value);
                    }
                }
            }
            executeCommand(command, game, null, player, callee);
        }
    }
}

/**
 * @param seconds
 */
function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Returns the type of command based on the given message.
 * @param game - The game in which the command is being executed.
 * @param message - The message in which the command was issued, if applicable.
 */
function getCommandType(game: Game, message: UserMessage): CommandType {
    if (!message) return "Bot";
    else {
        // Don't attempt to find the member who sent this message if it was sent by a webhook.
        if (message.webhookId !== null) return undefined;
        const member = game.guildContext.getMember(message.author.id);
        if (!member) return undefined;
        if (game.guildContext.hasModeratorRole(member)) return "Moderator";
        else if (game.guildContext.hasPlayerRole(member)) return "Player";
        else if (game.settings.debug && game.guildContext.hasTesterRole(member)) return "Eligible";
        else if (!game.settings.debug && game.guildContext.hasEligibleRole(member)) return "Eligible";
        return undefined;
    }
}
