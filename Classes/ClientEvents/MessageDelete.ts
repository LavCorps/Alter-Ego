// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ChannelType, Events, type PartialMessage } from "discord.js";
import ClientEvent from "./ClientEvent.ts";
import { deleteSpectatorMessage } from "../../Modules/messageHandler.ts";

export default new ClientEvent({
    name: Events.MessageDelete,
    once: false,
    execute: async (message: UserMessage | PartialMessage) => {
        if (!ClientEvent.clientReady) return;

        const game = ClientEvent.client.game;
        if (message.channel.type !== ChannelType.DM && game.inProgress && game.guildContext.sentInDialogChannel(message))
            deleteSpectatorMessage(game, message);
    }
});
