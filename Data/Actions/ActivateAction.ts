// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { MessageDisplayType } from "../../Modules/enums.js";
import Action from "../Action.ts";
import type Fixture from "../Fixture.ts";
import type Interactable from "../../Classes/Interactables/Interactable.ts";

/**
 * Represents an activate action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#activate-action
 */
export default class ActivateAction extends Action {
	/**
	 * Performs an activate action.
     *
	 * @param fixture - The fixture to activate.
	 * @param narrate - Whether or not to narrate the fixture's activation.
	 * @param customNarration - The custom text of the narration. Optional.
	 */
	async performActivate(fixture: Fixture, narrate: boolean, customNarration?: string): Promise<void> {
		if (this.performed) return;
		super.perform();
		this.getGame().logHandler.logActivate(fixture, this.player, this.forced);
		fixture.activate(this.player);
		let initiatedDescription: string;
		let messageDisplayType: MessageDisplayType;
		if (this.player && fixture.process.recipe !== null) {
			initiatedDescription = fixture.process.recipe.initiatedDescription.parseFor(this.player, fixture);
			messageDisplayType = fixture.process.recipe.initiatedDescription.messageDisplayType;
		}
        const interactables = await this.#getInteractables(fixture);
		if (narrate)
			this.getGame().narrationHandler.narrateActivate(this, fixture, this.player, initiatedDescription !== undefined && initiatedDescription !== "", customNarration, interactables);
		if (initiatedDescription) {
			this.player.sendDescription(initiatedDescription, fixture, messageDisplayType ?? MessageDisplayType.STANDARD, interactables);
		}
        this.successMessage = `Successfully activated ${fixture.name} at ${fixture.location.getEntityID()}${this.player ? ` for ${this.player.name}` : ``}.`;
	}

    async #getInteractables(fixture: Fixture): Promise<Interactable[]> {
        let interactables: Interactable[] = [];
        const interactableManager = this.getGame().botContext.interactableManager;
        interactables = interactables.concat(await interactableManager.createInspectActionInteractable([fixture], this.player));
        interactables = interactables.concat(await interactableManager.getActivateOrDeactivateInteractables(fixture, this.player, true));
        return interactables;
    }

    /**
     * Finds the required fixture to call performActivate.
     *
     * @param args - The args as strings.
     */
    parseInteractionArgs(args: string[]): [Fixture, boolean] {
        const fixture = this.getGame().entityFinder.getFixture(args[0], args[1]);
        const narrate = args[2].toLowerCase() === 'true';
        return [fixture, narrate];
    }

    /**
     * Validates the parsed args. The results can be passed directly into performActivate.
     *
     * @param args - The args after being parsed.
     */
    validateInteractionArgs(args: [Fixture, boolean]): [Fixture, boolean] {
        const errorMessageGenerator = this.getGame().errorMessageGenerator;
        if (this.player.hasBehaviorAttribute("disable use"))
            throw new Error(errorMessageGenerator.generateCommandDisabledError(this.player.getBehaviorAttributeStatusEffects("disable use")[0]));
        if (this.player.hasBehaviorAttribute("disable all") && !this.player.hasBehaviorAttribute("enable use"))
            throw new Error(errorMessageGenerator.generateCommandDisabledError(this.player.getBehaviorAttributeStatusEffects("disable all")[0]));
        if (args.length !== 2) throw new Error(errorMessageGenerator.generateInsufficientArgumentsError());
        if (!args[0] || !args[0]?.accessible) throw new Error(errorMessageGenerator.generateInvalidEntityError("Fixture"));
        if (args[0].location.id !== this.player.location.id) throw new Error(errorMessageGenerator.generatePlayerLocationMismatchError());
        if (this.player.isHidden() && this.player.hidingSpot !== args[0].name)
            throw new Error(errorMessageGenerator.generateCommandDisabledError(this.player.getBehaviorAttributeStatusEffects("hidden")[0]));
        const context = this.forced ? "Moderator" : "Player";
        if (args[0].recipeTag === "" || !this.forced && !args[0].activatable)
            throw new Error(errorMessageGenerator.generateFixtureNotActivatableError(args[0], context));
        if (args[0].activated) throw new Error(errorMessageGenerator.generateFixtureAlreadyInActivationStateError(args[0], context));
        return [args[0], args[1]];
    }
}
