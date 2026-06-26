// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Events, type GuildMember } from "discord.js";
import ClientEvent from "../ClientEvent.ts";

export default new ClientEvent({
    name: Events.GuildMemberAdd,
    once: false,
    execute: async (member: GuildMember) => {
        if (!ClientEvent.clientReady) return;

        const game = ClientEvent.client.game;
        const player = game.entityFinder.getPlayerById(member.id);
        if (game.inProgress && player) {
            const role = player.alive ? game.guildContext.playerRole : game.guildContext.deadRole;
            await member.roles.add(role);

            const addToChannel = player.alive && !player.hasBehaviorAttribute("no channel");
            if (addToChannel)
                player.location.joinChannel(player);

            game.communicationHandler.sendToCommandChannel(
                `<@${member.id}>, the user assigned to the player ${player.name}, has joined the server. ` +
                `The ${role.name} role has been automatically assigned to them. ` +
                (addToChannel ? `Additionally, they have been added to the ${player.location.channel} channel. ` : ``) +
                `No further action is required.`
            );
        }
    }
});
