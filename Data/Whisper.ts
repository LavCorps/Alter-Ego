// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Collection, type TextChannel } from "discord.js";
import { generatePlayerListString } from "../Modules/helpers.ts";
import { WhisperType } from "../Modules/enums.js"; 
import type Action from "./Action.ts";
import type Game from "./Game.ts";
import GameConstruct from "./GameConstruct.ts";
import type HidingSpot from "./HidingSpot.ts";
import type Party from "./Party.ts";
import type Player from "./Player.ts";
import Room from "./Room.ts";

/**
 * Represents a group of two or more players speaking quietly to each other such that no one else in the room can hear them.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/whisper.html
 */
export default class Whisper extends GameConstruct {
    /**
     * The type of the whisper. This is based on the entity the whisper is associated with, if there is one.
     */
    readonly type: WhisperType;
    /**
     * The unique ID of the whisper.
     * Consists of the location ID (if it has a fixed location), associated entity name (if it exists),
     * and a lowercase, alphabetized list of all the players' displayNames separated by hyphens.
     */
    id: string;
    /**
     * A collection of players in the whisper. The key for each entry is the player's name.
     */
    players: Collection<string, Player>;
    /**
     * The ID of the room the players are whispering in.
     */
    locationId: string;
    /**
     * The name of the hiding spot the whisper belongs to.
     * @deprecated
     */
    hidingSpotName: string;
    /**
     * The name of the entity the whisper belongs to.
     * This can be the name of a hiding spot or a party.
     */
    associatedEntityName: string;
    /**
     * The name that the whisper's channel will be set to.
     * Usually matches the ID, but capped to fit within Discord's channel name character limit.
     */
    channelName: string;
    /**
     * The Discord channel the whisper is occurring in.
     */
    channel: TextChannel;
    /**
     * Whether or not the whisper has been deleted.
     */
    deleted: boolean;

    /**
     * @param game - The game this whisper is occurring in.
     * @param type - The type of the whisper, based on the entity it belongs to.
     * @param players - The players in the whisper.
     * @param associatedEntityName - The name of the entity the whisper belongs to. This can be the name of a hiding spot or a party. Optional.
     */
    constructor(game: Game, type: WhisperType, players: Player[], associatedEntityName?: string) {
        super(game);
        this.type = type;
        this.players = new Collection();
        for (const player of players)
            this.players.set(player.name, player);
        if (this.players.size > 0) {
            this.locationId = this.players.first().location.id;
        }
        if (associatedEntityName) {
            this.associatedEntityName = associatedEntityName;
            this.hidingSpotName = associatedEntityName;
        }
        this.id = Whisper.generateValidId(this.players.map(player => player), this.location, this.associatedEntityName);
        const discordChannelNameCharacterLimit = 100;
        this.channelName = this.id.substring(0, discordChannelNameCharacterLimit);
        this.deleted = false;
    }

    /**
     * The room the players are whispering in.
     */
    get location(): Room {
        return this.getGame().entityFinder.getRoom(this.locationId);
    }

    /**
     * Sets the location.
     */
    setLocation(room: Room): void {
        this.locationId = room.id;
    }

    /**
     * The entity associated with the whisper, if it exists. This can be a hiding spot or a party.
     * If no associated entity exists, this is null.
     */
    get associatedEntity(): HidingSpot | Party {
        if (this.type === WhisperType.HIDING_SPOT) return this.getGame().entityFinder.getFixture(this.associatedEntityName, this.locationId)?.hidingSpot;
        else if (this.type === WhisperType.PARTY) return this.getGame().entityFinder.getParty(this.id);
        return null;
    }

    /**
     * Generate a grammatically correct list of players in the whisper.
     *
     * @param players - The list of players to include in the generated string. Defaults to all players in the whisper.
     */
    generatePlayerListString(players: Player[] = this.players.map(player => player)): string {
        return generatePlayerListString(players);
    }

    /**
     * Generate a grammatically correct list of players in the whisper, excluding the given player.
     *
     * @param player - The player to exclude.
     */
    generatePlayerListStringExcluding(player: Player): string {
        return this.generatePlayerListString(this.players.filter(participant => participant.name !== player.name).map(player => player));
    }

    /**
     * Generate a grammatically correct list of players in the whisper, excluding any players with the given displayName.
     *
     * @deprecated
     * @param playerDisplayName - The displayName to exclude.
     */
    generatePlayerListStringExcludingDisplayName(playerDisplayName: string): string {
        return this.generatePlayerListString(this.players.filter(participant => participant.displayName !== playerDisplayName).map(player => player));
    }

    /**
     * Removes a player from the whisper. If the whisper has no more players after this, or the resulting whisper already exists, deletes the whisper entirely.
     *
     * @param player - The player to remove.
     * @param narration - The text of the narration to send in the whisper channel when the player is removed.
     * @param action - The action that caused the player to be removed.
     */
    async removePlayer(player: Player, narration?: string, action?: Action): Promise<void> {
        await this.revokeChannelAccess(player);
        this.players.delete(player.name);
        const newId = Whisper.generateValidId(this.players.map(player => player), this.location, this.associatedEntityName);
        const deleteWhisper = this.players.size === 0 || this.getGame().whispers.get(newId);
        if (!deleteWhisper) {
            this.getGame().entityLoader.updateWhisperId(this, newId);
            if (narration) this.getGame().narrationHandler.narrateLeaveWhisper(action, player, this, narration);
        }
        else {
            this.deleted = true;
            this.getGame().entityLoader.deleteWhisper(this);
        }
    }

    /**
     * Revoke access to the whisper channel for a player.
     */
    async revokeChannelAccess(player: Player): Promise<void> {
        if (!player.isNPC) await this.channel.permissionOverwrites.delete(player.id);
    }

    /**
     * Generate an ID in all lowercase with
     *
     * @param players - The players in the whisper.
     * @param location - The location of the whisper. Optional.
     * @param associatedEntityName - The name of the entity the whisper belongs to. This can be the name of a hiding spot or a party. Optional.
     */
    static generateValidId(players: Player[], location?: Room, associatedEntityName?: string): string {
        const locationString = location ? `${location.id}-` : ``;
        const hidingSpotString = associatedEntityName ? `${associatedEntityName}-` : ``;
        const playerListString = players.map(player => player.displayName).sort().join('-');
        return Room.generateValidId(`${locationString}${hidingSpotString}${playerListString}`);
    }
}
