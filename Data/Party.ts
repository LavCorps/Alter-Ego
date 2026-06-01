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
     * A collection of display names for the members of the party.
     * The key for each entry is the player's name, and the value is the display name they had at the time of joining.
     */
    #memberDisplayNames: Collection<string, string>;
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
        this.leader.joinParty(this);
        this.followers = new Collection();
        this.members = new Collection();
        this.#memberDisplayNames = new Collection();
        this.members.set(leader.name, leader);
        this.#memberDisplayNames.set(leader.name, leader.displayName);
        for (const follower of followers) {
            this.followers.set(follower.name, follower);
            this.members.set(follower.name, follower);
            this.#memberDisplayNames.set(follower.name, follower.displayName);
            follower.joinParty(this);
        }
    }

    /**
     * Returns true if the party has the given player as a member.
     * @param player - The player to check for membership in the party.
     */
    hasMember(player: Player): boolean {
        return this.members.has(player.name);
    }

    /**
     * Returns true if the party has the given player as the leader.
     * @param player - The player to check for being the leader of the party.
     */
    hasLeader(player: Player): boolean {
        return this.leader.name === player.name;
    }

    /**
     * Returns true if the party has the given player as a follower.
     * @param player - The player to check for being a follower in the party.
     */
    hasFollower(player: Player): boolean {
        return this.followers.has(player.name);
    }

    /**
     * Returns the display name of the member they had at the time of joining.
     * @param player - The player to get the display name for.
     */
    getMemberDisplayName(player: Player): string {
        return this.#memberDisplayNames.get(player.name);
    }

    /**
     * Adds one or more players to the party as followers.
     * @param players - The players to add to the party.
     */
    async addFollowers(players: Player[]): Promise<void> {
        let deleteWhisper = false;
        for (const player of players) {
            if (player.canSee()) deleteWhisper = true; // TODO: Will this cause the whisper to be created without being deleted first if all of the new players are blind?
            this.followers.set(player.name, player);
            this.members.set(player.name, player);
            this.#memberDisplayNames.set(player.name, player.displayName);
            player.joinParty(this);
        }
        if (deleteWhisper) this.deleteWhisper();
        this.whisper = await this.getGame().entityLoader.createWhisper(Array.from(this.members.values()), this.idPrefix, WhisperType.PARTY);
        this.id = this.whisper.id;
    }

    /**
     * Removes a follower from the party.
     * @param player - The follower to remove from the party.
     * @param action - The action that caused the player to be removed.
     * @param leaveNarration - The narration to send to the party whisper channel when the player leaves. Optional.
     */
    async removeFollower(player: Player, action?: Action, leaveNarration: string = ""): Promise<void> {
        player.leaveParty();
        this.followers.delete(player.name);
        this.members.delete(player.name);
        this.#memberDisplayNames.delete(player.name);
        const whisperNarration = action ? leaveNarration : "";
        player.removeFromWhispers(whisperNarration, action);
        this.id = this.whisper.id;
        if (this.followers.size === 0) {
            await this.disband();
        }
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
     */
    async disband(): Promise<void> {
        for (const member of this.members.values())
            member.leaveParty();
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
