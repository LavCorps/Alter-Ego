// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { generateListString } from "../../Modules/helpers.ts";
import Action from "../Action.ts";
import type Interactable from "../../Classes/Interactables/Interactable.ts";
import type Player from "../Player.ts";

/**
 * Represents a disband party action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#disband-party-action
 */
export default class DisbandPartyAction extends Action {
    /**
     * Performs a disband party action.
     *
     * @param stopFollowing - Whether or not all followers should stop following the leader. Defaults to false.
     * @param customNarration - A custom narration to send instead of the default narration. Optional.
     * @param customLeaderNotification - A custom notification to send to the leader instead of the default notification. Optional.
     * @param customFollowerNotification - A custom notification to send to the followers instead of the default notification. Optional.
     */
    async performDisbandParty(stopFollowing: boolean = false, customNarration?: string, customLeaderNotification?: string, customFollowerNotification?: string): Promise<void> {
        if (this.performed) return;
        super.perform();
        const party = this.player.party;
        const followers = party ? party.followers.map(player => player) : [];
        const leaderInteractables = this.#getLeaderInteractables();
        const followerInteractables = this.#getFollowerInteractables(followers);
        this.getGame().narrationHandler.narrateDisbandParty(this, this.player, followers, stopFollowing, customNarration, customLeaderNotification, customFollowerNotification, leaderInteractables, followerInteractables);
        for (const follower of followers) {
            this.player.stopLeading(follower);
            if (stopFollowing) follower.stopFollowing();
        }
        if (party) await party.disband();
        const stoppedFollowerList = generateListString(followers.map(follower => follower.name));
        this.getGame().logHandler.logDisband(this.player, stopFollowing ? stoppedFollowerList : ``, this.forced);
        const appendString = stopFollowing && stoppedFollowerList ? ` and made ${stoppedFollowerList} stop following ${this.player.originalPronouns.obj}` : ``;
        this.successMessage = `Successfully disbanded ${this.player.name}'s party${appendString}.`;
    }

    /**
     * Gets an array of interactables to send to the player performing the action.
     */
    #getLeaderInteractables(): Interactable[] {
        let interactables: Interactable[] = [];
        return interactables;
    }

    /**
     * Gets an array of interactables to send to each follower.
     * @param followers - The followers to send interactables to.
     * @returns A map of arrays of interactables, where the key for each entry is the name of the player to send them to.
     */
    #getFollowerInteractables(followers: Player[]): Map<string, Interactable[]> {
        const interactableManager = this.getGame().clientContext.interactableManager;
        let interactables: Map<string, Interactable[]> = new Map();
        for (const follower of followers) {
            let followerInteractables = interactableManager.getViewPartyInteractables(follower);
            followerInteractables = followerInteractables.concat(interactableManager.getStopFollowingInteractables(follower));
            interactables.set(follower.name, followerInteractables);
        }
        return interactables;
    }

    /**
     * Finds the required player to call performDisbandParty.
     *
     * @param args - The args as strings.
     */
    parseInteractionArgs(args: string[]): string[] {
        return [];
    }

    /**
     * Validates the parsed args. The results can be passed directly into performDismiss.
     *
     * @param args - The args after being parsed.
     */
    validateInteractionArgs(args: string[]): [] {
        const errorMessageGenerator = this.getGame().errorMessageGenerator;
        if (args.length !== 0) throw new Error(errorMessageGenerator.generateInsufficientArgumentsError());
        const disabledStatusEffects = this.player.getStatusEffectsDisablingCommand("disband");
        if (disabledStatusEffects.length > 0)
            throw new Error(errorMessageGenerator.generateCommandDisabledError(disabledStatusEffects[0]));
        const context = this.forced ? "Moderator" : "Player";
        if (!this.player.party) throw new Error(errorMessageGenerator.generateNotInPartyError(this.player, "Player"));
        if (!this.player.party.hasLeader(this.player)) throw new Error(errorMessageGenerator.generateNotPartyLeaderError(this.player, context, false));
        return [];
    }
}
