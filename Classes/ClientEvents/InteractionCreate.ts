// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Events, type Interaction } from "discord.js";
import ClientEvent from "../ClientEvent.ts";

export default new ClientEvent({
    name: Events.InteractionCreate,
    once: false,
    execute: async (interaction: Interaction) => {
        if (!ClientEvent.clientReady) return;

        ClientEvent.client.interactionHandler.interceptInteraction(interaction);
    }
});
