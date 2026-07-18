// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type HidingSpot from "../HidingSpot.ts";
import CureAction from "./CureAction.ts";
import { generateListString } from "../../Modules/helpers.ts";
import type Fixture from "../Fixture.ts";

/**
 * Represents an emerge action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#emerge-action
 */
export default class EmergeAction extends Action {
    /**
     * Performs an emerge action.
     *
     * @param hidingSpot - The hiding spot to emerge from. If one is not specified, it will be searched for.
     */
    async performEmerge(hidingSpot?: HidingSpot): Promise<void> {
        if (this.performed) return;
        super.perform();

        const party = this.player.party;
        const players = party ? party.getMemberSet() : new Set([this.player]);

        if (!hidingSpot) {
            const hidingSpotFixture = this.getGame().entityFinder.getFixture(this.player.hidingSpot, this.player.location.id);
            if (hidingSpotFixture && players.values().every(player => player.hidingSpot === hidingSpotFixture.name))
                hidingSpot = hidingSpotFixture.hidingSpot;
        }

        this.getGame().narrationHandler.narrateEmerge(this, hidingSpot, this.player, players);
        if (hidingSpot)
            await hidingSpot.removePlayers(players, this);
        else {
            for (const player of players) {
                const whisperNarration = this.getGame().notificationGenerator.generateEmergeNotification(player, new Set([player]), false, "hiding");
                await player.removeFromWhispers(whisperNarration, this, false);
                player.hidingSpot = "";
            }
        }
        const hiddenStatus = this.getGame().entityFinder.getStatusEffect("hidden");
        for (const player of players) {
            const cureAction = new CureAction(this.getGame(), undefined, player, player.location, true);
            cureAction.performCure(hiddenStatus, true, false, true);
        }
        this.location?.setOccupantsString();

        const emergingPlayerList = generateListString(Array.from(players).map(player => player.name));
        this.getGame().logHandler.logEmerge(hidingSpot, this.player, emergingPlayerList, this.forced);
        this.successMessage = `Successfully brought ${emergingPlayerList} out of hiding.`;
    }

    /**
     * Finds the required Fixture to call performEmerge.
     * 
     * @param args - The args as strings.
     */
    parseInteractionArgs(args: string[]): [Fixture] {
        return [this.getGame().entityFinder.getFixture(args[0], args[1])];
    }

    /**
     * Validates the parsed args. The results can be passed directly into performEmerge.
     * 
     * @param args - The args after being parsed.
     * @privateRemarks
     * As this is my second effort in making an action an interactable, I will leave notes of what I was doing, and thinking, for later review...
     * These should be deleted before merge.
     * - AC
     */
    validateInteractionArgs(args: [Fixture]): [HidingSpot] | [] {
        /** 
         * @privateRemarks
         * If the player is not hidden, then validation fails.
         * - AC
         */
        if (!this.player.isHidden()) return [];
        /** 
         * @privateRemarks
         * If we somehow get args that is not a length of 1, then validation fails.
         * - AC
         */
        if (args.length !== 1) return [];
        /** 
         * @privateRemarks
         * This mirrors InspectAction.validateInteractionArgs, utilizing the new hasBehaviorAttribute style, and respecting the behavior attribute utilized in the hide_player command...
         * - AC
         */
        if (this.player.hasBehaviorAttribute("disable hide")) return [];
        /** 
         * @privateRemarks
         * Forbid emerging if the party is not "ready". This may be unnecessary, but mirrors the hide player command.
         * ... Actually, in the case that players form a party while hiding in a fixture, this may be a useful sanity check.
         * - AC
         */
        if (this.player.party && !this.player.party.positionsSynchronized) return [];
        /** 
         * @privateRemarks
         * This checks if the given fixture is falsy. Most importantly, this catches undefined.
         * - AC
         */
        if (!args[0]) return [];
        /** 
         * @privateRemarks
         * I believe this is correct. If the fixture is inaccessible, validation fails.
         * - AC
         */
        if (!args[0].accessible) return [];
        /** 
         * @privateRemarks
         * If a fixture is "locked", it cannot be emerged from. Validation fails.
         * - AC
         */
        if (args[0].childPuzzle !== null && args[0].childPuzzle.type.endsWith("lock") && !args[0].childPuzzle.solved) return [];
        /** 
         * @privateRemarks
         * ...?
         * This is simply mirroring InspectAction.validateInteractionArgs() - I am not sure what the purpose of it is...
         * - AC
         */
        if (!args[0].getLocation()) return [];
        /** 
         * @privateRemarks
         * This check is more obvious. If the player location id does not match the fixture location id, then validation fails.
         * - AC
         */
        if (args[0].getLocation().id !== this.player.location.id) return [];
        /** 
         * @privateRemarks
         * If the player is not hiding in the given fixture, then validation fails.
         * - AC
         */
        if (this.player.hidingSpot !== args[0].name) return [];
        /** 
         * @privateRemarks
         * If, somehow, the hiding spot is falsy (thus likely undefined or null), validation fails.
         * - AC
         */
        if (!args[0].hidingSpot) return [];
        /** 
         * @privateRemarks
         * Finally, it is time to return the fixture hiding spot.
         * - AC
         */
        return [args[0].hidingSpot];
    }
}
