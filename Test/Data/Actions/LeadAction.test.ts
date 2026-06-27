// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Party from "../../../Data/Party.ts";
import Player from "../../../Data/Player.ts";
import type Status from "../../../Data/Status.ts";
import DisbandPartyAction from "../../../Data/Actions/DisbandPartyAction.ts";
import FollowAction from "../../../Data/Actions/FollowAction.ts";
import LeadAction from "../../../Data/Actions/LeadAction.ts";
import QueueMoveAction from "../../../Data/Actions/QueueMoveAction.ts";
import StartMoveAction from "../../../Data/Actions/StartMoveAction.ts";
import StopAction from "../../../Data/Actions/StopAction.ts";
import GameEntityManager from "../../../Classes/GameEntityManager.ts";
import { WhisperType } from "../../../Modules/enums.js";
import type { Mock } from "vitest";

describe('LeadAction test', () => {
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
        game.messageQueue.manual = false;
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
        astrid.displayName = concealedDisplayName;
        asuka.inflict(cheerful);
        nero.inflict(crutches);
    });

    afterAll(() => {
        astrid.cure(fast);
        astrid.cure(concealed);
        astrid.displayName = "Astrid";
        asuka.cure(cheerful);
        nero.cure(crutches);
        game.messageQueue.manual = true;
    });

    test('Setup is correct', () => {
        expect(astrid.speed).toBe(10);
        expect(asuka.speed).toBe(5);
        expect(nero.speed).toBe(1);
        expect(astrid.location.id).toBe("lobby");
        expect(asuka.location.id).toBe("lobby");
        expect(nero.location.id).toBe("lobby");
    });

    describe('LeadAction.performLead tests', () => {
        let createPartySpy: Mock<typeof GameEntityManager.prototype.createParty>;
        let createWhisperSpy: Mock<typeof GameEntityManager.prototype.createWhisper>;
        let addFollowersSpy: Mock<typeof Party.prototype.addFollowers>;
        let deleteWhisperSpy: Mock<typeof Party.prototype.deleteWhisper>;
        let doAfterDelaySpy: Mock<typeof Player.prototype.doAfterDelay>;
        let queueMoveSpy: Mock<typeof QueueMoveAction.prototype.performQueueMove>;
        let performStartMoveSpy: Mock<typeof StartMoveAction.prototype.performStartMove>;
        let calculateMoveTimeSpy: Mock<typeof Player.prototype.calculateMoveTime>;
        let moveSpy: Mock<typeof Player.prototype.move>;

        beforeEach(() => {
            createPartySpy = vi.spyOn(GameEntityManager.prototype, 'createParty');
            createWhisperSpy = vi.spyOn(GameEntityManager.prototype, 'createWhisper');
            addFollowersSpy = vi.spyOn(Party.prototype, 'addFollowers');
            deleteWhisperSpy = vi.spyOn(Party.prototype, 'deleteWhisper');
            doAfterDelaySpy = vi.spyOn(Player.prototype, 'doAfterDelay');
            queueMoveSpy = vi.spyOn(QueueMoveAction.prototype, 'performQueueMove');
            performStartMoveSpy = vi.spyOn(StartMoveAction.prototype, 'performStartMove');
            calculateMoveTimeSpy = vi.spyOn(Player.prototype, 'calculateMoveTime');
            moveSpy = vi.spyOn(Player.prototype, 'move');
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        describe('party is retained between tests', () => {
            beforeAll(async () => {
                const followAction1 = new FollowAction(game, undefined, asuka, asuka.location, false);
                await followAction1.performFollow(astrid);
                const followAction2 = new FollowAction(game, undefined, nero, nero.location, false);
                await followAction2.performFollow(astrid);
            });

            afterAll(() => {
                for (const player of [astrid, asuka, nero]) {
                    const stopAction = new StopAction(game, undefined, player, player.location, false);
                    stopAction.performStop(false, undefined, true);
                }
            });

            test('stationary player leads stationary player', async () => {
                const action = new LeadAction(game, undefined, astrid, astrid.location, false);
                await action.performLead([asuka]);
                expect(astrid.ledPlayers).toHaveLength(1);
                expect(astrid.ledPlayers[0]).toStrictEqual(asuka);
                expect(astrid.getLedPlayer("Asuka")).toStrictEqual(asuka);
                expect(astrid.isLeading(asuka)).toBe(true);
                expect(createPartySpy).toHaveBeenCalledTimes(1);
                expect(astrid.party).not.toBeNull();
                expect(asuka.party).not.toBeNull();
                expect(astrid.party).toStrictEqual(asuka.party);
                expect(astrid.party.leader).toStrictEqual(astrid);
                expect(astrid.party.followers).toHaveSize(1);
                expect(astrid.party.followers.has("Astrid")).toBe(false);
                expect(astrid.party.followers.has("Asuka")).toBe(true);
                expect(astrid.party.members).toHaveSize(2);
                expect(astrid.party.members.has("Astrid")).toBe(true);
                expect(astrid.party.members.has("Asuka")).toBe(true);
                expect(astrid.party.getMemberDisplayName(astrid)).toBe(concealedDisplayName);
                expect(astrid.party.getMemberDisplayName(asuka)).toBe(asuka.name);
                expect(astrid.party.whisper).not.toBeNull();
                expect(astrid.party.whisper.type).toEqual(WhisperType.PARTY);
                expect(astrid.party.whisper.associatedEntity).not.toBeNull();
                expect(astrid.party.whisper.associatedEntity).toBeInstanceOf(Party);
                expect(astrid.party.whisper.associatedEntity).toStrictEqual(astrid.party);
                expect(astrid.party.id).toBe("party-an-individual-wearing-a-mask-asuka");
                expect(astrid.party.id).toBe(astrid.party.whisper.id);
                expect(astrid.party.whisper.players).toHaveSize(2);
                expect(astrid.party.whisper.players.has("Astrid")).toBe(true);
                expect(astrid.party.whisper.players.has("Asuka")).toBe(true);
            });

            test('stationary player leads stationary player she was already leading', async () => {
                const action = new LeadAction(game, undefined, astrid, astrid.location, false);
                await action.performLead([asuka]);
                expect(astrid.ledPlayers).toHaveLength(1);
                expect(astrid.ledPlayers[0]).toStrictEqual(asuka);
                expect(astrid.getLedPlayer("Asuka")).toStrictEqual(asuka);
                expect(astrid.isLeading(asuka)).toBe(true);
                expect(createPartySpy).toHaveBeenCalledTimes(0);
                expect(deleteWhisperSpy).toHaveBeenCalledTimes(0);
                expect(createWhisperSpy).toHaveBeenCalledTimes(0);
                expect(astrid.party).not.toBeNull();
                expect(asuka.party).not.toBeNull();
                expect(astrid.party).toStrictEqual(asuka.party);
                expect(astrid.party.id).toBe("party-an-individual-wearing-a-mask-asuka");
                expect(astrid.party.id).toBe(astrid.party.whisper.id);
                expect(astrid.party.leader).toStrictEqual(astrid);
                expect(astrid.party.followers).toHaveSize(1);
                expect(astrid.party.followers.has("Astrid")).toBe(false);
                expect(astrid.party.followers.has("Asuka")).toBe(true);
                expect(astrid.party.members).toHaveSize(2);
                expect(astrid.party.members.has("Astrid")).toBe(true);
                expect(astrid.party.members.has("Asuka")).toBe(true);
            });

            test('stationary player leads another stationary player while already in a party', async () => {
                const action = new LeadAction(game, undefined, astrid, astrid.location, false);
                await action.performLead([nero]);
                expect(astrid.ledPlayers).toHaveLength(2);
                expect(astrid.ledPlayers[0]).toStrictEqual(asuka);
                expect(astrid.ledPlayers[1]).toStrictEqual(nero);
                expect(astrid.getLedPlayer("Asuka")).toStrictEqual(asuka);
                expect(astrid.getLedPlayer("Nero")).toStrictEqual(nero);
                expect(astrid.isLeading(asuka)).toBe(true);
                expect(astrid.isLeading(nero)).toBe(true);
                expect(createPartySpy).toHaveBeenCalledTimes(0);
                expect(addFollowersSpy).toHaveBeenCalledTimes(1);
                expect(addFollowersSpy).toBeInvokedWith([nero]);
                expect(deleteWhisperSpy).toHaveBeenCalledTimes(1);
                expect(createWhisperSpy).toHaveBeenCalledTimes(1);
                expect(astrid.party.whisper).not.toBeNull();
                expect(astrid.party.whisper.type).toEqual(WhisperType.PARTY);
                expect(astrid.party.whisper.associatedEntity).not.toBeNull();
                expect(astrid.party.whisper.associatedEntity).toBeInstanceOf(Party);
                expect(astrid.party.whisper.associatedEntity).toStrictEqual(astrid.party);
                expect(astrid.party.id).toBe("party-an-individual-wearing-a-mask-asuka-nero");
                expect(astrid.party.id).toBe(astrid.party.whisper.id);
                expect(astrid.party.whisper.players).toHaveSize(3);
                expect(astrid.party.whisper.players.has("Astrid")).toBe(true);
                expect(astrid.party.whisper.players.has("Asuka")).toBe(true);
                expect(astrid.party.whisper.players.has("Nero")).toBe(true);
            });
        });

        describe('leader is moving and party is reset after each test', () => {
            test('moving player leads one moving player and all players stop', async () => {
                vi.clearAllTimers();
                vi.useFakeTimers();
                const followAction1 = new FollowAction(game, undefined, asuka, asuka.location, false);
                await followAction1.performFollow(astrid);
                const followAction2 = new FollowAction(game, undefined, nero, nero.location, false);
                await followAction2.performFollow(astrid);
                const queueMoveAction = new QueueMoveAction(game, undefined, astrid, astrid.location, false);
                const destination = "HALL 5";
                astrid.moveQueue = [destination];
                await queueMoveAction.performQueueMove(false, destination);
                // Ensure Astrid is the only player to have started moving at this point.
                expect(doAfterDelaySpy).toHaveBeenCalledTimes(2);
                expect(queueMoveSpy).toHaveBeenCalledOnce();
                expect(performStartMoveSpy).toHaveBeenCalledOnce();
                expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(3);
                expect(moveSpy).toHaveBeenCalledOnce();
                await vi.advanceTimersByTimeAsync(1000);
                // Player.doAfterDelay should not have been called again.
                expect(doAfterDelaySpy).toHaveBeenCalledTimes(2);
                expect(queueMoveSpy).toHaveBeenCalledTimes(3);
                expect(performStartMoveSpy).toHaveBeenCalledTimes(3);
                expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(5);
                expect(moveSpy).toHaveBeenCalledTimes(3);
                expect(astrid.isMoving).toBe(true);
                expect(asuka.isMoving).toBe(true);
                expect(nero.isMoving).toBe(true);

                const action = new LeadAction(game, undefined, astrid, astrid.location, false);
                await action.performLead([asuka]);
                expect(astrid.ledPlayers).toHaveLength(1);
                expect(astrid.ledPlayers[0]).toStrictEqual(asuka);
                expect(createPartySpy).toHaveBeenCalledTimes(1);
                expect(astrid.party).not.toBeNull();
                expect(asuka.party).not.toBeNull();
                expect(astrid.party).toStrictEqual(asuka.party);

                expect(astrid.isMoving).toBe(false);
                expect(asuka.isMoving).toBe(false);
                expect(nero.isMoving).toBe(false);
                for (const player of [astrid, asuka, nero])
                    player.stopMoving();
                const disbandPartyAction = new DisbandPartyAction(game, undefined, astrid, astrid.location, false);
                await disbandPartyAction.performDisbandParty(true);
                for (const player of [astrid, asuka, nero]) {
                    const stopAction = new StopAction(game, undefined, player, player.location, false);
                    stopAction.performStop(false, undefined, true);
                }
                vi.clearAllTimers();
                vi.useRealTimers();
            });

            test('moving player leads two moving players and all players stop', async () => {
                vi.clearAllTimers();
                vi.useFakeTimers();
                const followAction1 = new FollowAction(game, undefined, asuka, asuka.location, false);
                await followAction1.performFollow(astrid);
                const followAction2 = new FollowAction(game, undefined, nero, nero.location, false);
                await followAction2.performFollow(astrid);
                const queueMoveAction = new QueueMoveAction(game, undefined, astrid, astrid.location, false);
                const destination = "HALL 5";
                astrid.moveQueue = [destination];
                await queueMoveAction.performQueueMove(false, destination);
                // Ensure Astrid is the only player to have started moving at this point.
                expect(doAfterDelaySpy).toHaveBeenCalledTimes(2);
                expect(queueMoveSpy).toHaveBeenCalledOnce();
                expect(performStartMoveSpy).toHaveBeenCalledOnce();
                expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(3);
                expect(moveSpy).toHaveBeenCalledOnce();
                await vi.advanceTimersByTimeAsync(1000);
                // Player.doAfterDelay should not have been called again.
                expect(doAfterDelaySpy).toHaveBeenCalledTimes(2);
                expect(queueMoveSpy).toHaveBeenCalledTimes(3);
                expect(performStartMoveSpy).toHaveBeenCalledTimes(3);
                expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(5);
                expect(moveSpy).toHaveBeenCalledTimes(3);
                expect(astrid.isMoving).toBe(true);
                expect(asuka.isMoving).toBe(true);
                expect(nero.isMoving).toBe(true);

                const action = new LeadAction(game, undefined, astrid, astrid.location, false);
                await action.performLead([asuka, nero]);
                expect(astrid.ledPlayers).toHaveLength(2);
                expect(astrid.ledPlayers[0]).toStrictEqual(asuka);
                expect(astrid.ledPlayers[1]).toStrictEqual(nero);
                expect(createPartySpy).toHaveBeenCalledTimes(1);
                expect(astrid.party).not.toBeNull();
                expect(asuka.party).not.toBeNull();
                expect(astrid.party).toStrictEqual(asuka.party);
                expect(astrid.party).toStrictEqual(nero.party);

                expect(astrid.isMoving).toBe(false);
                expect(asuka.isMoving).toBe(false);
                expect(nero.isMoving).toBe(false);
                for (const player of [astrid, asuka, nero])
                    player.stopMoving();
                const disbandPartyAction = new DisbandPartyAction(game, undefined, astrid, astrid.location, false);
                await disbandPartyAction.performDisbandParty(true);
                for (const player of [astrid, asuka, nero]) {
                    const stopAction = new StopAction(game, undefined, player, player.location, false);
                    stopAction.performStop(false, undefined, true);
                }
                vi.clearAllTimers();
                vi.useRealTimers();
            });
        });
    });
});
