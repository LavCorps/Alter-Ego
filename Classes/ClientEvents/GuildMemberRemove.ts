// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import ClientEvent from "../ClientEvent.ts";

export default new ClientEvent({
    name: Events.GuildMemberRemove,
    once: false,
    execute: async (member: GuildMember | PartialGuildMember) => {
        if (!ClientEvent.clientReady) return;

        const game = ClientEvent.client.game;
        const player = game.entityFinder.getPlayerById(member.id);
        if (game.inProgress && player) {
            game.communicationHandler.sendToCommandChannel(
                `Warning: The user whose ID is assigned to the player ${player.name} has left the server. ` +
                `If they do not join the server again, an error will be thrown the next time player data is loaded. ` +
                `If you wish to keep ${player.name}'s data on the spreadsheet, it is recommended you make ${player.originalPronouns.obj} an NPC.\n\n` +
                `Otherwise, if they do join the server again, they will be automatically re-assigned the ` +
                `${player.alive ? game.guildContext.playerRole?.name ?? 'Player' : game.guildContext.deadRole?.name ?? 'Dead'} role.`
            );
        }
    }
});
