// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Player from "../../../Data/Player.ts";
import type Status from "../../../Data/Status.ts";
import DisbandPartyAction from "../../../Data/Actions/DisbandPartyAction.ts";
import FollowAction from "../../../Data/Actions/FollowAction.ts";
import LeadAction from "../../../Data/Actions/LeadAction.ts";
import StopFollowingAction from "../../../Data/Actions/StopFollowingAction.ts";
import GameEntityManager from "../../../Classes/GameEntityManager.ts";
import { sendQueuedMessages } from "../../../Modules/messageHandler.ts";
import type { Mock } from "vitest";
import type { Message } from "discord.js";

describe('DisbandPartyAction test', () => {
    /**
     * Location: lobby
     *
     * Speed: 10
     */
    let astrid: Player;
    /**
     * Speed: 5
     */
    let asuka: Player;
    /**
     * Location: lobby
     *
     * Speed: 1
     */
    let nero: Player;
    /**
     * Inflicts spd+4, getting Astrid to the speed we need her at.
     */
    let fast: Status;
    /**
     * Changes Astrid's display name.
     */
    let concealed: Status;
    /**
     * The concealed display name to set for Astrid.
     */
    let concealedDisplayName: string;
    /**
     * Inflicts spd+1, getting Asuka to the speed we need her at.
     */
    let cheerful: Status;
    /**
     * Inflicts spd-4, getting Nero to the speed we need him at.
     */
    let crutches: Status;

    beforeAll(async () => {
        if (!game.inProgress) await game.entityLoader.loadAll();
        astrid = game.entityFinder.getLivingPlayer("Astrid");
        asuka = game.entityFinder.getLivingPlayer("Asuka");
        nero = game.entityFinder.getLivingPlayer("Nero");
        fast = game.entityFinder.getStatusEffect("fast");
        concealed = game.entityFinder.getStatusEffect("concealed");
        cheerful = game.entityFinder.getStatusEffect("cheerful");
        crutches = game.entityFinder.getStatusEffect("crutches");
        astrid.inflict(fast);
        astrid.inflict(concealed);
        concealedDisplayName = "an individual wearing a MASK";
        astrid.setPronouns(astrid.pronouns, "neutral");
        astrid.displayName = concealedDisplayName;
        asuka.inflict(cheerful);
        nero.inflict(crutches);
    });

    afterAll(() => {
        astrid.cure(fast);
        astrid.cure(concealed);
        astrid.displayName = "Astrid";
        astrid.setPronouns(astrid.pronouns, astrid.pronounString);
        asuka.cure(cheerful);
        nero.cure(crutches);
    });

    test('Setup is correct', () => {
        expect(astrid.speed).toBe(10);
        expect(asuka.speed).toBe(5);
        expect(nero.speed).toBe(1);
        expect(astrid.location.id).toBe("lobby");
        expect(asuka.location.id).toBe("lobby");
        expect(nero.location.id).toBe("lobby");
    });

    describe('DisbandPartyAction.performDisbandParty tests', () => {
        let deletePartySpy: Mock<typeof GameEntityManager.prototype.deleteParty>;
        let narrationMessage: Message<boolean>;
        let astridNotificationMessage: Message<boolean>;
        let asukaNotificationMessage: Message<boolean>;
        let neroNotificationMessage: Message<boolean>;

        const clearMessages = () => {
            astrid.location.channel.messages.cache.clear();
            astrid.notificationChannel.messages.cache.clear();
            asuka.notificationChannel.messages.cache.clear();
            nero.notificationChannel.messages.cache.clear();
        };

        const sendMessages = async () => {
            await sendQueuedMessages(game);
            narrationMessage = astrid.location.channel.messages.cache.last();
            astridNotificationMessage = astrid.notificationChannel.messages.cache.last();
            asukaNotificationMessage = asuka.notificationChannel.messages.cache.last();
            neroNotificationMessage = nero.notificationChannel.messages.cache.last();
        }

        beforeEach(async () => {
            deletePartySpy = vi.spyOn(GameEntityManager.prototype, 'deleteParty');
            const followAction1 = new FollowAction(game, undefined, asuka, asuka.location, false);
            await followAction1.performFollow(astrid);
            const followAction2 = new FollowAction(game, undefined, nero, nero.location, false);
            await followAction2.performFollow(astrid);
        });

        afterEach(async () => {
            const stopFollowingAction = new StopFollowingAction(game, undefined, astrid, astrid.location, false);
            await stopFollowingAction.performStopFollowing(false, new Set([astrid, asuka, nero]));
            await sendMessages();
            clearMessages();
            vi.restoreAllMocks();
        });

        test('disband party with one follower and do not stop following (no custom messages)', async () => {
            const leadAction = new LeadAction(game, undefined, astrid, astrid.location, false);
            await leadAction.performLead([asuka]);
            // Ensure the party was formed correctly.
            expect(astrid.party).not.toBeNull();
            expect(astrid.party.members).toHaveSize(2);
            expect(astrid.party.hasLeader(astrid)).toBe(true);
            expect(astrid.party.hasFollower(asuka)).toBe(true);
            expect(astrid.party.hasFollower(nero)).toBe(false);
            const partyId = astrid.party.id;
            expect(game.parties.has(partyId)).toBe(true);
            expect(game.whispers.has(partyId)).toBe(true);

            // Send the messages that are irrelevant to this test, then clear them from the cache.
            await sendMessages();
            clearMessages();

            // Now disband it.
            const disbandAction = new DisbandPartyAction(game, undefined, astrid, astrid.location, false);
            await disbandAction.performDisbandParty(false);

            expect(astrid.ledPlayers).toHaveLength(0);
            expect(astrid.getLedPlayer("Asuka")).toBeNull();
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(false);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).toHaveBeenCalledOnce();
            expect(game.parties.has(partyId)).toBe(false);
            expect(game.whispers.has(partyId)).toBe(false);
            expect(astrid.party).toBeNull();
            expect(asuka.party).toBeNull();
            expect(nero.party).toBeNull();
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(nero.followedPlayer).toStrictEqual(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(nero.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.isFollowing(astrid)).toBe(true);
            expect(nero.isFollowing(astrid)).toBe(true);
            expect(astrid.viewParty(false)).toBe(`You are not in a party.`);
            expect(asuka.viewParty(false)).toBe(`You are not in a party. However, you are following ${concealedDisplayName}.`);
            expect(nero.viewParty(false)).toBe(`You are not in a party. However, you are following ${concealedDisplayName}.`);
            expect(astrid.viewParty(true)).toBe(`Astrid is not in a party.`);
            expect(asuka.viewParty(true)).toBe(`Asuka is not in a party. However, she is following Astrid.`);
            expect(nero.viewParty(true)).toBe(`Nero is not in a party. However, he is following Astrid.`);

            // Check all of the sent messages.
            await sendMessages();
            expect(astrid.location.channel.messages.cache).toHaveSize(1);
            expect(narrationMessage.content).toBe(`> -# An individual wearing a MASK disbands their party, but Asuka is still following them.`);
            expect(astrid.notificationChannel.messages.cache).toHaveSize(1);
            expect(astridNotificationMessage.content).toBe(`You disband your party, but Asuka is still following you.`);
            expect(asuka.notificationChannel.messages.cache).toHaveSize(1);
            expect(asukaNotificationMessage.content).toBe(`An individual wearing a MASK has disbanded your party, but you are still following them.`);
            expect(nero.notificationChannel.messages.cache).toHaveSize(0);
        });

        test('disband party with two followers and do not stop following (no custom messages)', async () => {
            const leadAction = new LeadAction(game, undefined, astrid, astrid.location, false);
            await leadAction.performLead([asuka, nero]);
            // Ensure the party was formed correctly.
            expect(astrid.party).not.toBeNull();
            expect(astrid.party.members).toHaveSize(3);
            expect(astrid.party.hasLeader(astrid)).toBe(true);
            expect(astrid.party.hasFollower(asuka)).toBe(true);
            expect(astrid.party.hasFollower(nero)).toBe(true);
            const partyId = astrid.party.id;
            expect(game.parties.has(partyId)).toBe(true);
            expect(game.whispers.has(partyId)).toBe(true);

            // Send the messages that are irrelevant to this test, then clear them from the cache.
            await sendMessages();
            clearMessages();

            // Now disband it.
            const disbandAction = new DisbandPartyAction(game, undefined, astrid, astrid.location, false);
            await disbandAction.performDisbandParty(false);

            expect(astrid.ledPlayers).toHaveLength(0);
            expect(astrid.getLedPlayer("Asuka")).toBeNull();
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(false);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).toHaveBeenCalledOnce();
            expect(game.parties.has(partyId)).toBe(false);
            expect(game.whispers.has(partyId)).toBe(false);
            expect(astrid.party).toBeNull();
            expect(asuka.party).toBeNull();
            expect(nero.party).toBeNull();
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(nero.followedPlayer).toStrictEqual(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(nero.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.isFollowing(astrid)).toBe(true);
            expect(nero.isFollowing(astrid)).toBe(true);
            expect(astrid.viewParty(false)).toBe(`You are not in a party.`);
            expect(asuka.viewParty(false)).toBe(`You are not in a party. However, you are following ${concealedDisplayName}.`);
            expect(nero.viewParty(false)).toBe(`You are not in a party. However, you are following ${concealedDisplayName}.`);
            expect(astrid.viewParty(true)).toBe(`Astrid is not in a party.`);
            expect(asuka.viewParty(true)).toBe(`Asuka is not in a party. However, she is following Astrid.`);
            expect(nero.viewParty(true)).toBe(`Nero is not in a party. However, he is following Astrid.`);

            // Check all of the sent messages.
            await sendMessages();
            expect(astrid.location.channel.messages.cache).toHaveSize(1);
            expect(narrationMessage.content).toBe(`> -# An individual wearing a MASK disbands their party, but Asuka and Nero are still following them.`);
            expect(astrid.notificationChannel.messages.cache).toHaveSize(1);
            expect(astridNotificationMessage.content).toBe(`You disband your party, but Asuka and Nero are still following you.`);
            expect(asuka.notificationChannel.messages.cache).toHaveSize(1);
            expect(asukaNotificationMessage.content).toBe(`An individual wearing a MASK has disbanded your party, but you are still following them.`);
            expect(nero.notificationChannel.messages.cache).toHaveSize(1);
            expect(neroNotificationMessage.content).toBe(`An individual wearing a MASK has disbanded your party, but you are still following them.`);
        });

        test('disband party with one follower and stop following (no custom messages)', async () => {
            const leadAction = new LeadAction(game, undefined, astrid, astrid.location, false);
            await leadAction.performLead([asuka]);
            // Ensure the party was formed correctly.
            expect(astrid.party).not.toBeNull();
            expect(astrid.party.members).toHaveSize(2);
            expect(astrid.party.hasLeader(astrid)).toBe(true);
            expect(astrid.party.hasFollower(asuka)).toBe(true);
            expect(astrid.party.hasFollower(nero)).toBe(false);
            const partyId = astrid.party.id;
            expect(game.parties.has(partyId)).toBe(true);
            expect(game.whispers.has(partyId)).toBe(true);

            // Send the messages that are irrelevant to this test, then clear them from the cache.
            await sendMessages();
            clearMessages();

            // Now disband it.
            const disbandAction = new DisbandPartyAction(game, undefined, astrid, astrid.location, false);
            await disbandAction.performDisbandParty(true);

            expect(astrid.ledPlayers).toHaveLength(0);
            expect(astrid.getLedPlayer("Asuka")).toBeNull();
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(false);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).toHaveBeenCalledOnce();
            expect(game.parties.has(partyId)).toBe(false);
            expect(game.whispers.has(partyId)).toBe(false);
            expect(astrid.party).toBeNull();
            expect(asuka.party).toBeNull();
            expect(nero.party).toBeNull();
            expect(asuka.followedPlayer).toBeNull();
            expect(nero.followedPlayer).toStrictEqual(astrid);
            expect(asuka.followedPlayerDisplayName).toBe("");
            expect(nero.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.isFollowing(astrid)).toBe(false);
            expect(nero.isFollowing(astrid)).toBe(true);
            expect(astrid.viewParty(false)).toBe(`You are not in a party.`);
            expect(asuka.viewParty(false)).toBe(`You are not in a party.`);
            expect(nero.viewParty(false)).toBe(`You are not in a party. However, you are following ${concealedDisplayName}.`);
            expect(astrid.viewParty(true)).toBe(`Astrid is not in a party.`);
            expect(asuka.viewParty(true)).toBe(`Asuka is not in a party.`);
            expect(nero.viewParty(true)).toBe(`Nero is not in a party. However, he is following Astrid.`);

            // Check all of the sent messages.
            await sendMessages();
            expect(astrid.location.channel.messages.cache).toHaveSize(1);
            expect(narrationMessage.content).toBe(`> -# An individual wearing a MASK disbands their party.`);
            expect(astrid.notificationChannel.messages.cache).toHaveSize(1);
            expect(astridNotificationMessage.content).toBe(`You disband your party.`);
            expect(asuka.notificationChannel.messages.cache).toHaveSize(1);
            expect(asukaNotificationMessage.content).toBe(`An individual wearing a MASK has disbanded your party. You are no longer following them.`);
            expect(nero.notificationChannel.messages.cache).toHaveSize(0);
        });

        test('disband party with two followers and stop following (no custom messages)', async () => {
            const leadAction = new LeadAction(game, undefined, astrid, astrid.location, false);
            await leadAction.performLead([asuka, nero]);
            // Ensure the party was formed correctly.
            expect(astrid.party).not.toBeNull();
            expect(astrid.party.members).toHaveSize(3);
            expect(astrid.party.hasLeader(astrid)).toBe(true);
            expect(astrid.party.hasFollower(asuka)).toBe(true);
            expect(astrid.party.hasFollower(nero)).toBe(true);
            const partyId = astrid.party.id;
            expect(game.parties.has(partyId)).toBe(true);
            expect(game.whispers.has(partyId)).toBe(true);

            // Send the messages that are irrelevant to this test, then clear them from the cache.
            await sendMessages();
            clearMessages();

            // Now disband it.
            const disbandAction = new DisbandPartyAction(game, undefined, astrid, astrid.location, false);
            await disbandAction.performDisbandParty(true);

            expect(astrid.ledPlayers).toHaveLength(0);
            expect(astrid.getLedPlayer("Asuka")).toBeNull();
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(false);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).toHaveBeenCalledOnce();
            expect(game.parties.has(partyId)).toBe(false);
            expect(game.whispers.has(partyId)).toBe(false);
            expect(astrid.party).toBeNull();
            expect(asuka.party).toBeNull();
            expect(nero.party).toBeNull();
            expect(asuka.followedPlayer).toBeNull();
            expect(nero.followedPlayer).toBeNull();
            expect(asuka.followedPlayerDisplayName).toBe("");
            expect(nero.followedPlayerDisplayName).toBe("");
            expect(asuka.isFollowing(astrid)).toBe(false);
            expect(nero.isFollowing(astrid)).toBe(false);
            expect(astrid.viewParty(false)).toBe(`You are not in a party.`);
            expect(asuka.viewParty(false)).toBe(`You are not in a party.`);
            expect(nero.viewParty(false)).toBe(`You are not in a party.`);
            expect(astrid.viewParty(true)).toBe(`Astrid is not in a party.`);
            expect(asuka.viewParty(true)).toBe(`Asuka is not in a party.`);
            expect(nero.viewParty(true)).toBe(`Nero is not in a party.`);

            // Check all of the sent messages.
            await sendMessages();
            expect(astrid.location.channel.messages.cache).toHaveSize(1);
            expect(narrationMessage.content).toBe(`> -# An individual wearing a MASK disbands their party.`);
            expect(astrid.notificationChannel.messages.cache).toHaveSize(1);
            expect(astridNotificationMessage.content).toBe(`You disband your party.`);
            expect(asuka.notificationChannel.messages.cache).toHaveSize(1);
            expect(asukaNotificationMessage.content).toBe(`An individual wearing a MASK has disbanded your party. You are no longer following them.`);
            expect(nero.notificationChannel.messages.cache).toHaveSize(1);
            expect(neroNotificationMessage.content).toBe(`An individual wearing a MASK has disbanded your party. You are no longer following them.`);
        });

        test('disband party with two followers and do not stop following (with custom messages)', async () => {
            const leadAction = new LeadAction(game, undefined, astrid, astrid.location, false);
            await leadAction.performLead([asuka, nero]);
            // Ensure the party was formed correctly.
            expect(astrid.party).not.toBeNull();
            expect(astrid.party.members).toHaveSize(3);
            expect(astrid.party.hasLeader(astrid)).toBe(true);
            expect(astrid.party.hasFollower(asuka)).toBe(true);
            expect(astrid.party.hasFollower(nero)).toBe(true);
            const partyId = astrid.party.id;
            expect(game.parties.has(partyId)).toBe(true);
            expect(game.whispers.has(partyId)).toBe(true);

            // Send the messages that are irrelevant to this test, then clear them from the cache.
            await sendMessages();
            clearMessages();

            const customNarration = `An individual wearing a MASK disbands their party.`;
            const customLeaderNotification = `You disband the party.`;
            const customFollowerNotification = `Your party has been disbanded, but you are still following the party leader.`;

            // Now disband it.
            const disbandAction = new DisbandPartyAction(game, undefined, astrid, astrid.location, false);
            await disbandAction.performDisbandParty(false, customNarration, customLeaderNotification, customFollowerNotification);

            expect(astrid.ledPlayers).toHaveLength(0);
            expect(astrid.getLedPlayer("Asuka")).toBeNull();
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(false);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).toHaveBeenCalledOnce();
            expect(game.parties.has(partyId)).toBe(false);
            expect(game.whispers.has(partyId)).toBe(false);
            expect(astrid.party).toBeNull();
            expect(asuka.party).toBeNull();
            expect(nero.party).toBeNull();
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(nero.followedPlayer).toStrictEqual(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(nero.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.isFollowing(astrid)).toBe(true);
            expect(nero.isFollowing(astrid)).toBe(true);
            expect(astrid.viewParty(false)).toBe(`You are not in a party.`);
            expect(asuka.viewParty(false)).toBe(`You are not in a party. However, you are following ${concealedDisplayName}.`);
            expect(nero.viewParty(false)).toBe(`You are not in a party. However, you are following ${concealedDisplayName}.`);
            expect(astrid.viewParty(true)).toBe(`Astrid is not in a party.`);
            expect(asuka.viewParty(true)).toBe(`Asuka is not in a party. However, she is following Astrid.`);
            expect(nero.viewParty(true)).toBe(`Nero is not in a party. However, he is following Astrid.`);

            // Check all of the sent messages.
            await sendMessages();
            expect(astrid.location.channel.messages.cache).toHaveSize(1);
            expect(narrationMessage.content).toBe(`> -# ${customNarration}`);
            expect(astrid.notificationChannel.messages.cache).toHaveSize(1);
            expect(astridNotificationMessage.content).toBe(customLeaderNotification);
            expect(asuka.notificationChannel.messages.cache).toHaveSize(1);
            expect(asukaNotificationMessage.content).toBe(customFollowerNotification);
            expect(nero.notificationChannel.messages.cache).toHaveSize(1);
            expect(neroNotificationMessage.content).toBe(customFollowerNotification);
        });
    });
});
