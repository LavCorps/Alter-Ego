// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type GameSettings from "../GameSettings.ts";
import type Context from "./Context.ts";
import type { MatchedInvocation, ValidatedInvocation, ValidationResult } from "./Invocation.ts";
import type { Pattern } from "./Pattern.ts";

export type CommandType = "Bot" | "Moderator" | "Player" | "Eligible";
type CommandUsage = (settings: GameSettings) => string;
type CommandValidate<T extends Context> = (context: T, invocation: MatchedInvocation) => Promise<ValidationResult>;
type CommandExecute<T extends Context> = (context: T, invocation: ValidatedInvocation) => Promise<void>;

/**
 * The configuration for a command.
 */
export interface CommandConfig {
    /** The name of the command. */
    name: string;
    /** A brief description of what the command does. */
    description: string;
    /** Detailed information about the command. */
    details: string;
    /** The role that can use the command. */
    usableBy: CommandType;
    /** Alternative names for the command. */
    aliases: Set<string>;
    /** Indicates whether the command requires an ongoing game to be executed. */
    requiresGame: boolean;
    /** Whether or not the command is sensitive to whitespace, and should not have argument whitespace altered. */
    whitespaceSensitive?: boolean;
}

interface CommandConstructorArgs<T extends Context> {
    /**
     * The specific configuration of the command.
     */
    config: CommandConfig;
    /**
     * Examples of the command's usage.
     */
    usage: CommandUsage;
    /**
     * Grammar patterns for the command.
     */
    patterns?: Pattern[];
    /**
     * The code to execute when the command is called, inputs matched to at least one pattern, but the invocation is not yet validated.
     */
    validate: CommandValidate<T>;
    /**
     * The code to execute when the command is called, and the invocation has been validated.
     */
    execute: CommandExecute<T>;
}

/**
 * Abstract base class for all new-generation commands.
 */
export default abstract class Command<T extends Context> {
    /**
     * The specific configuration of the command.
     */
    readonly config: CommandConfig;

    /**
     * Examples of the command's usage.
     */
    readonly usage: CommandUsage;

    /**
     * Grammar patterns for the command.
     */
    readonly patterns: Pattern[];

    /**
     * The code to execute when the command is called, inputs matched to at least one pattern, but the invocation is not yet validated.
     */
    readonly validate: CommandValidate<T>;

    /**
     * The code to execute when the command is called, and the invocation has been validated.
     */
    readonly execute: CommandExecute<T>;

    constructor(args: CommandConstructorArgs<T>) {
        this.config = args.config;
        this.usage = args.usage;
        this.patterns = args.patterns ?? [];
        this.validate = args.validate;
        this.execute = args.execute;
    }
}
