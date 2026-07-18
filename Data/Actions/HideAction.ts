// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type HidingSpot from "../HidingSpot.ts";
import InflictAction from "./InflictAction.ts";
import { generateListString } from "../../Modules/helpers.ts";
import type Fixture from "../Fixture.ts";

/**
 * Represents a hide action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#hide-action
 */
export default class HideAction extends Action {
    /**
     * Performs a hide action.
     *
     * @param hidingSpot - The hiding spot to hide in.
     */
    async performHide(hidingSpot: HidingSpot): Promise<void> {
        if (this.performed) return;
        super.perform();

        const party = this.player.party;
        const players = party ? party.getMemberSet() : new Set([this.player]);

        this.getGame().narrationHandler.narrateHide(this, hidingSpot, this.player, players);
        let successful = false;
        if (hidingSpot.occupants.length + players.size <= hidingSpot.capacity || this.forced) {
            const hiddenStatus = this.getGame().entityFinder.getStatusEffect("hidden");
            for (const player of players) {
                const hiddenStatusAction = new InflictAction(this.getGame(), undefined, player, player.location, false);
                await hiddenStatusAction.performInflict(hiddenStatus, true, false, true);
            }
            await hidingSpot.addPlayers(players);
            const occupantsString = this.location.generateOccupantsString(this.location.occupants.filter(occupant => !occupant.isHidden() && !players.has(occupant)));
            this.location.setOccupantsString(occupantsString);
            // If a party is hiding before their positions are synchronized, we must make them stop moving, and synchronize their positions manually.
            if (party && !party.positionsSynchronized) {
                this.getGame().movementHandler.stopMoving(players);
                for (const member of party.members.values())
                    member.setPos(this.player.pos);
            }
            successful = true;
        }

        const hiddenPlayerList = generateListString(Array.from(players).map(player => player.name));
        this.getGame().logHandler.logHide(hidingSpot, this.player, hiddenPlayerList, successful, this.forced);
        this.successMessage = `Successfully hid ${hiddenPlayerList} in ${hidingSpot.getFixture().getContainingPhrase()}.`;
    }

    /**
     * Finds the required Fixture to call performHide.
     * 
     * @param args - The args as strings.
     */
    parseInteractionArgs(args: string[]): [Fixture] {
        return [this.getGame().entityFinder.getFixture(args[0], args[1])];
    }

    /**
     * Validates the parsed args. The results can be passed directly into performHide.
     * 
     * @param args - The args after being parsed.
     * @privateRemarks
     * As this is my first effort in making an action an interactable, I will leave notes of what I was doing, and thinking, for later review...
     * These should be deleted before merge.
     * - AC
     */
    validateInteractionArgs(args: [Fixture]): [HidingSpot] | [] {
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
         * Forbid hiding if the party is not "ready".
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
         * If a fixture is "locked", it cannot be hidden in. Validation fails.
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
         * I am unsure about this one, but we should probably have a "sanity check" against fixtures with a hiding spot capacity of zero.
         * - AC
         */
        if (args[0].hidingSpotCapacity === 0) return [];
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
