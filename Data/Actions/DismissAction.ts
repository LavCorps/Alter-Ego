// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import DisbandPartyAction from "./DisbandPartyAction.ts";
import type Interactable from "../../Classes/Interactables/Interactable.ts";
import type Player from "../Player.ts";
import { generateListString } from "../../Modules/helpers.ts";

/**
 * Represents a dismiss action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#dismiss-action
 */
export default class DismissAction extends Action {
    /**
     * Performs a dismiss action.
     *
     * @param followers - The followers to dismiss.
     * @param stopFollowing - Whether or not all of the listed followers should stop following the leader. Defaults to false.
     */
    async performDismissAction(followers: Player[], stopFollowing: boolean = false): Promise<void> {
        if (this.performed) return;
        super.perform();
        const party = this.player.party;

        // If all followers are being dismissed, disband the party instead.
        const disband = party.followers.size === followers.length && party.followers.every(follower => followers.includes(follower));
        if (disband) {
            const disbandAction = new DisbandPartyAction(this.getGame(), this.message, this.player, this.location, this.forced, this.whisper, this.user);
            await disbandAction.performDisbandParty(stopFollowing);
            this.successMessage = disbandAction.successMessage;
            return;
        }

        // Otherwise, just dismiss the listed players.
        const leaderInteractables = this.#getLeaderInteractables();
        const followerInteractables = this.#getFollowerInteractables(followers);
        this.getGame().narrationHandler.narrateDismiss(this, this.player, followers, leaderInteractables, followerInteractables);
        for (const follower of followers) {
            this.player.stopLeading(follower);
            await party.removeFollower(follower, this, this.getGame().notificationGenerator.generateDismissNotification(this.player, false, party.getMemberDisplayName(follower)));
            if (stopFollowing) follower.stopFollowing();
        }
        const dismissedFollowerList = generateListString(followers.map(follower => follower.name));
        this.getGame().logHandler.logDismiss(this.player, dismissedFollowerList, this.forced);
        this.successMessage = `Successfully dismissed ${dismissedFollowerList} from ${this.player.name}'s party.`;
    }

    /**
     * Gets an array of interactables to send to the player performing the action.
     */
    #getLeaderInteractables(): Interactable[] {
        let interactables = this.getGame().clientContext.interactableManager.getViewPartyInteractables(this.player);
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
     * Finds the required player to call performDismiss.
     *
     * @param args - The args as strings.
     */
    parseInteractionArgs(args: string[]): [Player] {
        const player = this.getGame().entityFinder.getLivingPlayer(args[0]);
        return [player];
    }

    /**
     * Validates the parsed args. The results can be passed directly into performDismiss.
     *
     * @param args - The args after being parsed.
     */
    validateInteractionArgs(args: [Player]): [Player[]] {
        const errorMessageGenerator = this.getGame().errorMessageGenerator;
        if (args.length !== 1) throw new Error(errorMessageGenerator.generateInsufficientArgumentsError());
        if (!args[0] || args[0].getEntityType() !== "Player") throw new Error(errorMessageGenerator.generateInvalidEntityError("Player"));
        const follower = args[0];
        if (follower.location?.id !== this.player.location.id) throw new Error(errorMessageGenerator.generatePlayerLocationMismatchError());
        const disabledStatusEffects = this.player.getStatusEffectsDisablingCommand("dismiss");
        if (disabledStatusEffects.length > 0)
            throw new Error(errorMessageGenerator.generateCommandDisabledError(disabledStatusEffects[0]));
        const hiddenStatusEffects = this.player.getBehaviorAttributeStatusEffects("hidden");
        if (hiddenStatusEffects.length > 0 && !this.player.isHiddenWith(follower))
            throw new Error(errorMessageGenerator.generateCommandDisabledError(hiddenStatusEffects[0]));
        const context = this.forced ? "Moderator" : "Player";
        if (!this.player.party) throw new Error(errorMessageGenerator.generateNotInPartyError(this.player, "Player"));
        if (!this.player.party.hasLeader(this.player)) throw new Error(errorMessageGenerator.generateNotPartyLeaderError(this.player, context, false));
        if (follower?.name === this.player.name) throw new Error(errorMessageGenerator.generateCannotSelectSelfError(this.player, context, "dismiss"));
        if (!follower.isFollowing(this.player)) throw new Error(errorMessageGenerator.generateCannotSelectNonFollowerError(this.player, follower, context, "dismiss"));
        return [[follower]];
    }
}
