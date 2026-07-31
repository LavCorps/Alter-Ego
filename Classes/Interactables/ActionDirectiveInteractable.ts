// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Interactable from "./Interactable.ts";
import type ActionDirective from "../ActionDirective.ts";
import type { InteractableType } from "../../Modules/enums.ts";

export default abstract class ActionDirectiveInteractable extends Interactable {
    /**
     * The action directive for this interactable.
     */
    readonly actionDirective: ActionDirective;

    /**
     * @param type - The type of interactive message component to create.
     * @param actionDirective - The action directive for this interactable.
     * @param priority - The priority level of the interactable. This determines how high up it will appear in a list of interactable components.
     * @param respondWithModal - Whether to respond to an interaction with a modal. Defaults to false.
     */
    protected constructor(type: InteractableType, actionDirective: ActionDirective, priority: number, respondWithModal = false) {
        super(type, actionDirective.customId, priority, respondWithModal)
        this.actionDirective = actionDirective;
    }
}
