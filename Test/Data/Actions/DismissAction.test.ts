// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Player from "../../../Data/Player.ts";
import type Status from "../../../Data/Status.ts";
import DisbandPartyAction from "../../../Data/Actions/DisbandPartyAction.ts";
import DismissAction from "../../../Data/Actions/DismissAction.ts";
import FollowAction from "../../../Data/Actions/FollowAction.ts";
import LeadAction from "../../../Data/Actions/LeadAction.ts";
import GameEntityManager from "../../../Classes/GameEntityManager.ts";
import { sendQueuedMessages } from "../../../Modules/messageHandler.ts";
import type { Mock } from "vitest";
import type { Message } from "discord.js";

describe('DismissAction test', () => {
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
        if (!testGame.inProgress) await testGame.entityLoader.loadAll();
        astrid = testGame.entityFinder.getLivingPlayer("Astrid");
        asuka = testGame.entityFinder.getLivingPlayer("Asuka");
        nero = testGame.entityFinder.getLivingPlayer("Nero");
        fast = testGame.entityFinder.getStatusEffect("fast");
        concealed = testGame.entityFinder.getStatusEffect("concealed");
        cheerful = testGame.entityFinder.getStatusEffect("cheerful");
        crutches = testGame.entityFinder.getStatusEffect("crutches");
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

    describe('DismissAction.performDismiss tests', () => {
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
            await sendQueuedMessages(testGame);
            narrationMessage = astrid.location.channel.messages.cache.last();
            astridNotificationMessage = astrid.notificationChannel.messages.cache.last();
            asukaNotificationMessage = asuka.notificationChannel.messages.cache.last();
            neroNotificationMessage = nero.notificationChannel.messages.cache.last();
        }

        beforeEach(async () => {
            deletePartySpy = vi.spyOn(GameEntityManager.prototype, 'deleteParty');
            const followAction1 = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await followAction1.performFollow(astrid);
            const followAction2 = new FollowAction(testGame, undefined, nero, nero.location, false);
            await followAction2.performFollow(astrid);
            const leadAction = new LeadAction(testGame, undefined, astrid, astrid.location, false);
            await leadAction.performLead([asuka, nero]);
            await sendMessages();
            clearMessages();
        });

        afterEach(async () => {
            const disbandAction = new DisbandPartyAction(testGame, undefined, astrid, astrid.location, false);
            await disbandAction.performDisbandParty(true);
            await sendMessages();
            clearMessages();
            vi.restoreAllMocks();
        });

        test('party setup is correct', () => {
            expect(astrid.party).not.toBeNull();
            expect(astrid.party.members).toHaveSize(3);
            expect(astrid.party.hasLeader(astrid)).toBe(true);
            expect(astrid.party.hasFollower(asuka)).toBe(true);
            expect(astrid.party.hasFollower(nero)).toBe(true);
            expect(testGame.parties.has(astrid.party.id)).toBe(true);
            expect(testGame.whispers.has(astrid.party.id)).toBe(true);
        });

        test('dismiss one follower and do not stop following', async () => {
            const dismissAction = new DismissAction(testGame, undefined, astrid, astrid.location, false);
            await dismissAction.performDismissAction([nero], false);

            expect(astrid.ledPlayers).toHaveLength(1);
            expect(astrid.getLedPlayer("Asuka")).toStrictEqual(asuka);
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(true);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).not.toHaveBeenCalled();
            expect(testGame.parties.has("party-an-individual-wearing-a-mask-asuka")).toBe(true);
            expect(testGame.whispers.has("party-an-individual-wearing-a-mask-asuka")).toBe(true);
            expect(astrid.party).not.toBeNull();
            expect(asuka.party).not.toBeNull();
            expect(nero.party).toBeNull();
            expect(astrid.party).toStrictEqual(asuka.party);
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(nero.followedPlayer).toStrictEqual(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(nero.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.isFollowing(astrid)).toBe(true);
            expect(nero.isFollowing(astrid)).toBe(true);
            expect(astrid.viewParty(false)).toBe(`You are the leader of a party.\n\nAsuka is traveling together with you.`);
            expect(asuka.viewParty(false)).toBe(`You are in a party led by ${concealedDisplayName}.`);
            expect(nero.viewParty(false)).toBe(`You are not in a party. However, you are following ${concealedDisplayName}.`);
            expect(astrid.viewParty(true)).toBe(`Astrid is the leader of a party.\n\nAsuka is traveling together with her.`);
            expect(asuka.viewParty(true)).toBe(`Asuka is in a party led by Astrid.`);
            expect(nero.viewParty(true)).toBe(`Nero is not in a party. However, he is following Astrid.`);

            // Check all of the sent messages.
            await sendMessages();
            expect(astrid.location.channel.messages.cache).toHaveSize(1);
            expect(narrationMessage.content).toBe(`> -# An individual wearing a MASK stops leading Nero.`);
            expect(astrid.notificationChannel.messages.cache).toHaveSize(1);
            expect(astridNotificationMessage.content).toBe(`You stop leading Nero.`);
            expect(asuka.notificationChannel.messages.cache).toHaveSize(0);
            expect(nero.notificationChannel.messages.cache).toHaveSize(1);
            expect(neroNotificationMessage.content).toBe(`An individual wearing a MASK stops leading you.`);
        });

        test('dismiss all followers and do not stop following', async () => {
            const dismissAction = new DismissAction(testGame, undefined, astrid, astrid.location, false);
            await dismissAction.performDismissAction([nero, asuka], false);

            expect(astrid.ledPlayers).toHaveLength(0);
            expect(astrid.getLedPlayer("Asuka")).toBeNull();
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(false);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).toHaveBeenCalledOnce();
            expect(testGame.parties.has("party-an-individual-wearing-a-mask-asuka-nero")).toBe(false);
            expect(testGame.parties.has("party-an-individual-wearing-a-mask-asuka")).toBe(false);
            expect(testGame.parties.has("party-an-individual-wearing-a-mask")).toBe(false);
            expect(testGame.whispers.has("party-an-individual-wearing-a-mask-asuka-nero")).toBe(false);
            expect(testGame.whispers.has("party-an-individual-wearing-a-mask-asuka")).toBe(false);
            expect(testGame.whispers.has("party-an-individual-wearing-a-mask")).toBe(false);
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

        test('dismiss one follower and stop following', async () => {
            const dismissAction = new DismissAction(testGame, undefined, astrid, astrid.location, false);
            await dismissAction.performDismissAction([nero], true);

            expect(astrid.ledPlayers).toHaveLength(1);
            expect(astrid.getLedPlayer("Asuka")).toStrictEqual(asuka);
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(true);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).not.toHaveBeenCalled();
            expect(testGame.parties.has("party-an-individual-wearing-a-mask-asuka")).toBe(true);
            expect(testGame.whispers.has("party-an-individual-wearing-a-mask-asuka")).toBe(true);
            expect(astrid.party).not.toBeNull();
            expect(asuka.party).not.toBeNull();
            expect(nero.party).toBeNull();
            expect(astrid.party).toStrictEqual(asuka.party);
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(nero.followedPlayer).toBeNull();
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(nero.followedPlayerDisplayName).toBe("");
            expect(asuka.isFollowing(astrid)).toBe(true);
            expect(nero.isFollowing(astrid)).toBe(false);
            expect(astrid.viewParty(false)).toBe(`You are the leader of a party.\n\nAsuka is traveling together with you.`);
            expect(asuka.viewParty(false)).toBe(`You are in a party led by ${concealedDisplayName}.`);
            expect(nero.viewParty(false)).toBe(`You are not in a party.`);
            expect(astrid.viewParty(true)).toBe(`Astrid is the leader of a party.\n\nAsuka is traveling together with her.`);
            expect(asuka.viewParty(true)).toBe(`Asuka is in a party led by Astrid.`);
            expect(nero.viewParty(true)).toBe(`Nero is not in a party.`);

            // Check all of the sent messages.
            await sendMessages();
            expect(astrid.location.channel.messages.cache).toHaveSize(1);
            expect(narrationMessage.content).toBe(`> -# An individual wearing a MASK stops leading Nero.`);
            expect(astrid.notificationChannel.messages.cache).toHaveSize(1);
            expect(astridNotificationMessage.content).toBe(`You stop leading Nero.`);
            expect(asuka.notificationChannel.messages.cache).toHaveSize(0);
            expect(nero.notificationChannel.messages.cache).toHaveSize(1);
            expect(neroNotificationMessage.content).toBe(`An individual wearing a MASK stops leading you.`);
        });

        test('dismiss all followers and stop following', async () => {
            const dismissAction = new DismissAction(testGame, undefined, astrid, astrid.location, false);
            await dismissAction.performDismissAction([nero, asuka], true);

            expect(astrid.ledPlayers).toHaveLength(0);
            expect(astrid.getLedPlayer("Asuka")).toBeNull();
            expect(astrid.getLedPlayer("Nero")).toBeNull();
            expect(astrid.isLeading(asuka)).toBe(false);
            expect(astrid.isLeading(nero)).toBe(false);
            expect(deletePartySpy).toHaveBeenCalledOnce();
            expect(testGame.parties.has("party-an-individual-wearing-a-mask-asuka-nero")).toBe(false);
            expect(testGame.parties.has("party-an-individual-wearing-a-mask-asuka")).toBe(false);
            expect(testGame.parties.has("party-an-individual-wearing-a-mask")).toBe(false);
            expect(testGame.whispers.has("party-an-individual-wearing-a-mask-asuka-nero")).toBe(false);
            expect(testGame.whispers.has("party-an-individual-wearing-a-mask-asuka")).toBe(false);
            expect(testGame.whispers.has("party-an-individual-wearing-a-mask")).toBe(false);
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
    });
});
