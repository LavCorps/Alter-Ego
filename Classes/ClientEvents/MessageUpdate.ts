// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ChannelType, Events, type PartialMessage } from "discord.js";
import ClientEvent from "../ClientEvent.ts";
import { editSpectatorMessage } from "../../Modules/messageHandler.ts";

export default new ClientEvent({
    name: Events.MessageUpdate,
    once: false,
    execute: async (messageOld: UserMessage | PartialMessage, messageNew: UserMessage) => {
        if (!ClientEvent.clientReady) return;
        if (messageOld.partial || messageNew.partial || messageOld.author.bot || messageOld.content === messageNew.content) return;

        const game = ClientEvent.client.game;
        if (messageOld.channel.type !== ChannelType.DM && game.inProgress && game.guildContext.sentInDialogChannel(messageOld))
            editSpectatorMessage(game, messageOld, messageNew);
    }
});
