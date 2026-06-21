// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ActivityType, Client, type ClientUser, Collection, GatewayIntentBits, Partials } from "discord.js";
import { readdir } from "fs";
import path from "node:path";
import ClientEventHandler from "./ClientEventHandler.ts";
import ClientEvent from "./ClientEvents/ClientEvent.ts";
import PrettyPrinter from "./PrettyPrinter.ts";
import BotInteractableManager from "./BotInteractableManager.ts";
import BotInteractionHandler from "./BotInteractionHandler.ts";
import type Game from "../Data/Game.ts";
import BotCommand from "./BotCommand.ts";
import ModeratorCommand from "./ModeratorCommand.ts";
import PlayerCommand from "./PlayerCommand.ts";
import EligibleCommand from "./EligibleCommand.ts";
import type { CommandType, CommandOf } from "../Modules/commandHandler.ts";
import { loadCredentials } from "../Modules/credentialsLoader.ts";

/**
 * Represents a log entry for a command executed in the game.
 */
interface CommandLogEntry {
    /** The date and time when the command was executed. */
    timestamp: Date;
    /** Who issued the command. */
    author: string;
    /** The content of the command. */
    content: string;
}

/**
 * Represents the bot as a singleton.
 */
export default class ClientContext {
    /**
     * Whether or not the client has already logged in.
     */
    static #loggedIn: boolean = false;
	/**
	 * The single instance of the bot that can exist.
	 */
	static #instance: ClientContext;
    /**
     * Whether or not the bot has finished initializing.
     * Until it is finished, it will not respond to messages or client events.
     */
    static #initialized: boolean = false;
    /**
     * The client's event handler. Responds to client events emitted from the Discord API.
     */
    static #eventHandler: ClientEventHandler;
	/**
	 * All commands usable by the bot itself.
	 */
	static readonly #botCommands: Collection<string, BotCommand> = new Collection();
	/**
	 * All commands usable by moderators.
	 */
    static readonly #moderatorCommands: Collection<string, ModeratorCommand> = new Collection();
	/**
	 * All commands usable by players.
	 */
    static readonly #playerCommands: Collection<string, PlayerCommand> = new Collection();
	/**
	 * All commands usable by members with the eligible role.
	 */
    static readonly #eligibleCommands: Collection<string, EligibleCommand> = new Collection();
    /**
     * The Discord Client associated with the bot.
     */
    readonly client: Client;
	/**
	 * The game the bot is managing.
	 */
	readonly #game: Game;
	/**
	 * An array of the most recently-issued commands. Used by the dumplog command for debugging purposes.
	 */
	readonly #commandLog: Array<CommandLogEntry>;
    /**
     * The maximum number of commands to keep in the command log at once. If the log exceeds this size, the oldest command will be removed.
     */
    readonly #commandLogSizeLimit = 10000;
	/**
	 * A set of functions to cleanly display objects.
	 */
	readonly prettyPrinter: PrettyPrinter;
	/**
	 * A set of functions for creating and managing Interactables.
	 */
	readonly interactableManager: BotInteractableManager;
	/**
	 * A set of functions for handling Interactions.
	 */
	readonly interactionHandler: BotInteractionHandler;
	/**
	 * A timeout which updates the client user's presence every 30 seconds.
	 */
	readonly #presenceUpdateInterval: NodeJS.Timeout;

	/**
	 * @param client - The Discord Client associated with the bot.
	 * @param game - The game the bot is managing.
	 */
	private constructor(client: Client, game: Game) {
		this.client = client;
		this.#game = game;
		this.#commandLog = [];
		this.prettyPrinter = new PrettyPrinter();
		this.interactableManager = new BotInteractableManager(this.#game);
		this.interactionHandler = new BotInteractionHandler(this.#game);
		this.#presenceUpdateInterval = setInterval(
			() => this.updatePresence(),
			30 * 1000
		);
	}

    /**
     * Logs the client into Discord.
     *
     * @returns The logged in client.
     */
    public static async login(): Promise<Client> {
        if (ClientContext.#loggedIn) {
            if (ClientContext.#instance) return ClientContext.#instance.client;
            else throw new Error("Client has already logged in, but has not yet been initialized.");
        }
        const credentials = loadCredentials();
        const client = new Client({
            partials: [
                Partials.User,
                Partials.Channel,
                Partials.GuildMember,
                Partials.Message,
                Partials.Reaction
            ],
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageReactions
            ]
        });
        ClientContext.#eventHandler = ClientEventHandler.Instance(client);
        await ClientContext.#loadClientEvents();
        await client.login(credentials.discord.token);
        ClientContext.#loggedIn = true;
        return client;
    }

    /**
     * Gets the client context, or creates it if it doesn't exist.
     * @param client - The Discord Client associated with the bot.
	 * @param game - The game the bot is managing.
     */
    public static Instance(client: Client, game: Game): ClientContext {
        if (ClientContext.#instance) return ClientContext.#instance;
        else return this.#instance = new this(client, game);
    }

    /**
     * The single instance of the bot that can exist.
     */
    public static get instance(): ClientContext {
        return ClientContext.#instance;
    }

    /**
     * Loads all of the client events from disk and passes them to the ClientEventHandler.
     */
    static async #loadClientEvents(): Promise<void> {
        const eventsDir = path.join(__dirname, "ClientEvents");
        readdir(eventsDir, async (error, files) => {
            if (error) console.log(error);

            if (files.length <= 0) {
                console.error(`Couldn't find events in ${eventsDir}.`);
                return process.exit(1);
            }
            let eventCount = 0;
            await Promise.all(files.map(async file => {
                const eventFilePath = path.join(eventsDir, file);
                await import(eventFilePath).then(eventFile => {
                    const importedEvent = eventFile.default as ClientEvent;
                    if ('name' in importedEvent && 'once' in importedEvent && 'execute' in importedEvent) {
                        const event = new ClientEvent({
                            name: importedEvent.name,
                            once: importedEvent.once,
                            execute: importedEvent.execute
                        });
                        ClientContext.#eventHandler.handle(event);
                        eventCount++;
                    }
                    else {
                        console.error(`The event at ${eventFilePath} is missing a required "name", "once", or "execute" property.`);
                    }
                });
            })).then(() => {
                console.log(`Loaded ${eventCount} client events.`);
            });
        });
    }

    /**
     * Sets the bot as fully initialized.
     */
    public initialize(): void {
        if (ClientContext.#initialized) return;
        ClientContext.#initialized = true;
    }

    /**
     * Whether or not the bot has finished initializing.
     * Until it is finished, it will not respond to messages or client events.
     */
    public static get initialized(): boolean {
        return ClientContext.#initialized;
    }

    /**
     * The game the bot is managing.
     */
    public get game(): Game {
        return this.#game;
    }

    /**
     * All commands usable by the bot itself.
     */
    public get botCommands(): Collection<string, BotCommand> {
        return ClientContext.#botCommands;
    }

    /**
     * All commands usable by moderators.
     */
    public get moderatorCommands(): Collection<string, ModeratorCommand> {
        return ClientContext.#moderatorCommands;
    }

    /**
     * All commands usable by players.
     */
    public get playerCommands(): Collection<string, PlayerCommand> {
        return ClientContext.#playerCommands;
    }

    /**
     * All commands usable by members with the eligible role.
     */
    public get eligibleCommands(): Collection<string, EligibleCommand> {
        return ClientContext.#eligibleCommands;
    }

    /**
     * Loads all of the commands from disk.
     */
    public async loadCommands(): Promise<void> {
        const commandsDir = path.join(__dirname, "..", "Commands");
        readdir(commandsDir, async (error, files) => {
            if (error) console.log(error);

            const commandFiles = files.filter(filename => filename.split('.').pop() === 'js');
            if (commandFiles.length <= 0) {
                console.log("Error: Couldn't find commands.");
                return process.exit(1);
            }
            await Promise.all(commandFiles.map(async file => {
                await import(path.join(commandsDir, file)).then(commandProps => {
                    const config = commandProps.config as CommandConfig;
                    if (config.usableBy === "Bot")
                        ClientContext.#botCommands.set(config.name, new BotCommand(config, commandProps.usage, commandProps.execute));
                    else if (config.usableBy === "Moderator")
                        ClientContext.#moderatorCommands.set(config.name, new ModeratorCommand(config, commandProps.usage, commandProps.execute));
                    else if (config.usableBy === "Player")
                        ClientContext.#playerCommands.set(config.name, new PlayerCommand(config, commandProps.usage, commandProps.execute));
                    else if (config.usableBy === "Eligible")
                        ClientContext.#eligibleCommands.set(config.name, new EligibleCommand(config, commandProps.usage, commandProps.execute));
                    else {
                        console.log(`Error: Invalid command at ${commandsDir}${file}`);
                        return process.exit(1);
                    }
                });
            })).then(() => {
                const commandCount = ClientContext.#botCommands.size + ClientContext.#moderatorCommands.size + ClientContext.#playerCommands.size + ClientContext.#eligibleCommands.size;
                console.log(`Loaded ${commandCount} commands.`);
            });
        });
    }

    /**
     * An array of the most recently-issued commands. Used by the dumplog command for debugging purposes.
     */
    public get commandLog(): CommandLogEntry[] {
        return this.#commandLog;
    }

    /**
     * Adds a command to the command log. If the log is at maximum capacity, removes the oldest one.
     * @param authorName - The name of the user who issued the command.
     * @param commandStr - The full text of the command that was issued.
     * @param timestamp - The timestamp at which the command was issued.
     */
    public logCommand(authorName: string, commandStr: string, timestamp: Date): void {
        if (this.#commandLog.length >= this.#commandLogSizeLimit)
            this.#commandLog.shift();
        this.#commandLog.push({
            timestamp: timestamp,
            author: authorName,
            content: commandStr
        });
    }

    /**
     * Gets a command by its type and alias. If the command does not exist, returns undefined.
     * @param type - The type of command.
     * @param alias - The alias to look up.
     */
    getCommand<T extends CommandType>(type: T, alias: string): CommandOf<T> {
        if (type === "Bot") return ClientContext.#botCommands.find(command => command.config.aliases.includes(alias)) as CommandOf<T>;
        if (type === "Moderator") return ClientContext.#moderatorCommands.find(command => command.config.aliases.includes(alias)) as CommandOf<T>;
        if (type === "Player") return ClientContext.#playerCommands.find(command => command.config.aliases.includes(alias)) as CommandOf<T>;
        if (type === "Eligible") return ClientContext.#eligibleCommands.find(command => command.config.aliases.includes(alias)) as CommandOf<T>;
        return undefined;
    }

    /**
     * Returns true if the command was issued in a valid channel for its type.
     * @param command - The command that was issued.
     * @param message - The message in which the command was sent.
     */
    commandIssuedInValidChannel(command: ModeratorCommand | PlayerCommand | EligibleCommand, message: UserMessage): boolean {
        const guild = this.#game.guildContext;
        if (command instanceof ModeratorCommand)
            return guild.sentInCommandChannel(message) || guild.sentInRoomChannel(message) || command.config.name === "delete_moderator";
        if (command instanceof PlayerCommand)
            return guild.sentInDMChannel(message) || guild.sentInRoomChannel(message);
        if (command instanceof EligibleCommand)
            return guild.sentInDMChannel(message) || this.#game.settings.debug && guild.sentInTestingChannel(message) || !this.#game.settings.debug && guild.sentInGeneralChannel(message);
        return false;
    }

	/**
	 * Updates the client user's presence.
	 */
	updatePresence(): void {
		let onlineSuffix = '';
		if (this.#game.settings.showOnlinePlayerCount && this.#game.inProgress && !this.#game.canJoin) {
			let onlinePlayers = 0;
			this.#game.livingPlayers.forEach(player => {
				if (player.online) onlinePlayers++;
			});
			const statusSuffix = onlinePlayers === 1 ? "player online" : "players online";
			onlineSuffix = ` - ${onlinePlayers} ${statusSuffix}`;
		}

		const activityName =
			this.#game.settings.debug ? `${this.#game.settings.debugModeActivity.name}${onlineSuffix}`
			: this.#game.inProgress && !this.#game.canJoin ? `${this.#game.settings.gameInProgressActivity.name}${onlineSuffix}`
			: this.#game.settings.onlineActivity.name;
		const activityType = this.#game.settings.debug ? this.#game.settings.debugModeActivity.type
			: this.#game.inProgress && !this.#game.canJoin ? this.#game.settings.gameInProgressActivity.type
			: this.#game.settings.onlineActivity.type;
		let url: string;
		if (this.#game.inProgress && !this.#game.canJoin) url = this.#game.settings.gameInProgressActivity.url;

		const presence: import("discord.js").PresenceData = {
			status: this.#game.settings.debug ? "dnd" : "online",
			activities: [
				{
					name: activityName,
					type: activityType,
					url: url
				}
			]
		};
		this.client.user.setPresence(presence);
	}

	static getActivityType(type: string): ActivityType {
		switch (type.toUpperCase()) {
			case "PLAYING":
				return ActivityType.Playing;
			case "STREAMING":
				return ActivityType.Streaming;
			case "LISTENING":
				return ActivityType.Listening;
			case "WATCHING":
				return ActivityType.Watching;
			case "COMPETING":
				return ActivityType.Competing;
			case "CUSTOM":
				return ActivityType.Custom;
		}
	}

    /**
     * The client's user account.
     */
    public get user(): ClientUser {
        return this.client.user;
    }
}
