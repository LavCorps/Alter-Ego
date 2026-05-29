// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Action from "./Action.ts";
import type Game from "./Game.ts";
import GameConstruct from "./GameConstruct.ts";
import type Player from "./Player.ts";
import Whisper from "./Whisper.ts";
import { WhisperType } from "../Modules/enums.js";
import { Collection } from "discord.js";

/**
 * Represents a group of players who are traveling together.
 * The party has a leader, who is responsible for moving the party to new rooms, and followers,
 * who will automatically follow the leader when they move to a new room.
 * The party also has a whisper that the members can use to communicate with each other.
 * 
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/party.html
 */
export default class Party extends GameConstruct {
    /**
     * The prefix for the ID of the party. This is used to generate the party's ID.
     * By default, this is set to `party`.
     */
    private idPrefix: string;
    /**
     * The unique ID of the party. This will always match the ID of the party's associated whisper.
     */
    id: string;
    /**
     * A collection of players in the party. The key for each entry is the player's name.
     */
    members: Collection<string, Player>;
    /**
     * The leader of the party. This is the player who is responsible for moving the party.
     */
    leader: Player;
    /**
     * The followers of the party. These are the players who will follow the leader when they move to a new room. This is a subset of the members collection.
     * The key for each entry is the player's name.
     */
    followers: Collection<string, Player>;
    /**
     * The whisper associated with the party. This is the whisper that the party members are using to communicate with each other.
     */
    whisper: Whisper;

    /**
     * @param game - The game this party belongs to.
     * @param leader - The leader of the party. This is the player who is responsible for moving the party.
     * @param followers - The followers of the party. These are the players who will follow the leader when they move to a new room.
     * @param idPrefix - The prefix for the ID of the party. This is used to generate the party's ID. Optional. By default, this is set to `party`.
     */
    constructor(game: Game, leader: Player, followers: Player[], idPrefix: string = "party") {
        super(game);
        this.idPrefix = idPrefix;
        this.leader = leader;
        this.followers = new Collection();
        this.members = new Collection();
        this.members.set(leader.name, leader);
        for (const follower of followers) {
            this.followers.set(follower.name, follower);
            this.members.set(follower.name, follower);
        }
    }

    /**
     * Adds a player to the party as a follower.
     * @param player - The player to add to the party.
     */
    async addFollower(player: Player): Promise<void> {
        if (player.canSee()) this.deleteWhisper();
        this.followers.set(player.name, player);
        this.members.set(player.name, player);
        this.whisper = await this.getGame().entityLoader.createWhisper(Array.from(this.members.values()), this.idPrefix, WhisperType.PARTY);
        this.id = this.whisper.id;
    }

    /**
     * Removes a follower from the party.
     * @param player - The follower to remove from the party.
     * @param action - The action that caused the player to be removed.
     * @param leaveNarration - The narration to send to the party whisper channel when the player leaves. Optional.
     */
    removeFollower(player: Player, action?: Action, leaveNarration: string = ""): void {
        this.followers.delete(player.name);
        this.members.delete(player.name);
        const whisperNarration = action ? leaveNarration : "";
        player.removeFromWhispers(whisperNarration, action);
        this.id = this.whisper.id;
    }

    /**
     * Removes all members from the whisper and sets it to null.
     */
    deleteWhisper(): void {
        for (const player of this.members.values())
            player.removeFromWhispers("");
        this.whisper = null;
    }

    /**
     * Disbands the party, removing all members and deleting the party's whisper.
      * @param action - The action that caused the party to be disbanded. Optional.
     */
    async disband(): Promise<void> {
        await this.getGame().entityLoader.deleteParty(this);
    }

    /**
     * Gets the phrase that should be used to refer to the party's associated entity.
     * If there is no associated entity, returns the `idPrefix` preceded by "a".
     */
    getContainingPhrase(): string {
        return `a ${this.idPrefix}`;
    }

    /**
     * Gets the preposition that should be used to refer to the party's associated entity.
     */
    getPreposition(): string {
        return "in";
    }
}