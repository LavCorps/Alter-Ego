// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Exit from "../../../Data/Exit.ts";
import Player from "../../../Data/Player.ts";
import type Room from "../../../Data/Room.ts";
import type Status from "../../../Data/Status.ts";
import DisbandPartyAction from "../../../Data/Actions/DisbandPartyAction.ts";
import FollowAction from "../../../Data/Actions/FollowAction.ts";
import LeadAction from "../../../Data/Actions/LeadAction.ts";
import MoveAction from "../../../Data/Actions/MoveAction.ts";
import StartMoveAction from "../../../Data/Actions/StartMoveAction.ts";
import QueueMoveAction from "../../../Data/Actions/QueueMoveAction.ts";
import StopAction from "../../../Data/Actions/StopAction.ts";
import GameEntityManager from "../../../Classes/GameEntityManager.ts";
import GameMovementHandler from "../../../Classes/GameMovementHandler.ts";
import GameNarrationHandler from "../../../Classes/GameNarrationHandler.ts";
import { sendQueuedMessages } from "../../../Modules/messageHandler.ts";
import type { Mock } from "vitest";
import type { Message } from "discord.js";

describe('StartMoveAction test', () => {
    /**
     * Location: lobby
     *
     * Position: center of room ({ x: 2500, y: 100, z: 3080 })
     *
     * Speed: 10
     *
     * Stamina: 6
     *
     * Carry weight: 5
     */
    let astrid: Player;
    /**
     * Location: lobby
     *
     * Position: HALL 5 ({ x: 2763, y: 100, z: 3138 })
     *
     * Speed: 5
     *
     * Stamina: 3
     *
     * Carry weight: 6
     */
    let asuka: Player;
    /**
     * Location: lobby
     *
     * Position: MAIN ENTRANCE ({ x: 2500, y: 100, z: 3175 })
     *
     * Speed: 1
     *
     * Stamina: 1
     *
     * Carry weight: 4
     */
    let nero: Player;
    /**
     * The room all the players are in.
     */
    let lobby: Room;
    /**
     * Position: { x: 2500, y: 100, z: 3175 }
     */
    let mainEntrance: Exit;
    /**
     * Position: { x: 2238, y: 100, z: 3138 }
     */
    let hall3: Exit;
    /**
     * Position: { x: 2763, y: 100, z: 3138 }
     */
    let hall5: Exit;
    /**
     * A long room where players can easily run out of stamina.
     */
    let meatballRoom: Room;
    /**
     * Position: { x: 425, y: 0, z: 3475 }
     */
    let meatballBeginning: Exit;
    /**
     * Position: { x: 425, y: 0, z: -7125 }
     */
    let meatballEnd: Exit;
    /**
     * A room with a restricted exit puzzle.
     */
    let cave9: Room;
    /**
     * Position: { x: 4812, y: 200, z: 450 }
     */
    let cave9Door: Exit;
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
    let lobbyNarrationMessage: Message<boolean>;
    let hall5NarrationMessage: Message<boolean>;
    let meatballNarrationMessage: Message<boolean>;
    let cave9NarrationMessage: Message<boolean>;
    let astridNotificationMessage: Message<boolean>;
    let asukaNotificationMessage: Message<boolean>;
    let neroNotificationMessage: Message<boolean>;
    let calculateMoveTimeSpy: Mock<typeof GameMovementHandler.prototype.calculateMoveTime>;
    let doAfterDelaySpy: Mock<typeof Player.prototype.doAfterDelay>;
    let narrateStartMoveSpy: Mock<typeof GameNarrationHandler.prototype.narrateStartMove>;
    let narrateReachedHalfStaminaSpy: Mock<typeof GameNarrationHandler.prototype.narrateReachedHalfStamina>;
    let queueMoveSpy: Mock<typeof QueueMoveAction.prototype.performQueueMove>;
    let movePlayersSpy: Mock<typeof GameMovementHandler.prototype.movePlayers>;
    let moveSpy: Mock<typeof MoveAction.prototype.performMove>;
    let deletePartySpy: Mock<typeof GameEntityManager.prototype.deleteParty>;
    const clearMessages = () => {
        lobby.channel.messages.cache.clear();
        hall5.dest.channel.messages.cache.clear();
        meatballRoom.channel.messages.cache.clear();
        cave9.channel.messages.cache.clear();
        astrid.notificationChannel.messages.cache.clear();
        asuka.notificationChannel.messages.cache.clear();
        nero.notificationChannel.messages.cache.clear();
    };

    const sendMessages = async () => {
        await sendQueuedMessages(game);
        lobbyNarrationMessage = lobby.channel.messages.cache.first();
        hall5NarrationMessage = hall5.dest.channel.messages.cache.first();
        meatballNarrationMessage = meatballRoom.channel.messages.cache.first();
        cave9NarrationMessage = cave9.channel.messages.cache.first();
        astridNotificationMessage = astrid.notificationChannel.messages.cache.first();
        asukaNotificationMessage = asuka.notificationChannel.messages.cache.first();
        neroNotificationMessage = nero.notificationChannel.messages.cache.first();
    }

    beforeAll(async () => {
        if (!game.inProgress) await game.entityLoader.loadAll();
        astrid = game.entityFinder.getLivingPlayer("Astrid");
        asuka = game.entityFinder.getLivingPlayer("Asuka");
        nero = game.entityFinder.getLivingPlayer("Nero");
        lobby = game.entityFinder.getRoom("lobby");
        mainEntrance = game.entityFinder.getExit(astrid.location, "MAIN ENTRANCE");
        hall3 = game.entityFinder.getExit(astrid.location, "HALL 3");
        hall5 = game.entityFinder.getExit(astrid.location, "HALL 5");
        meatballRoom = game.entityFinder.getRoom("meatball-room");
        meatballBeginning = game.entityFinder.getExit(meatballRoom, "BEGINNING");
        meatballEnd = game.entityFinder.getExit(meatballRoom, "END");
        cave9 = game.entityFinder.getRoom("cave-9");
        cave9Door = game.entityFinder.getExit(cave9, "DOOR");
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

    beforeEach(async () => {
        calculateMoveTimeSpy = vi.spyOn(GameMovementHandler.prototype, 'calculateMoveTime');
        doAfterDelaySpy = vi.spyOn(Player.prototype, 'doAfterDelay');
        narrateStartMoveSpy = vi.spyOn(GameNarrationHandler.prototype, 'narrateStartMove');
        narrateReachedHalfStaminaSpy = vi.spyOn(GameNarrationHandler.prototype, 'narrateReachedHalfStamina');
        deletePartySpy = vi.spyOn(GameEntityManager.prototype, 'deleteParty');
        queueMoveSpy = vi.spyOn(QueueMoveAction.prototype, 'performQueueMove');
        movePlayersSpy = vi.spyOn(GameMovementHandler.prototype, 'movePlayers');
        moveSpy = vi.spyOn(MoveAction.prototype, 'performMove');
        await sendMessages();
        clearMessages();
        vi.useFakeTimers();
        asuka.setPos(hall5.pos);
        nero.setPos(mainEntrance.pos);
    });

    afterEach(async () => {
        for (const player of [astrid, asuka, nero]) {
            player.location.removePlayer(player);
            lobby.addPlayer(player);
            const action = new StopAction(game, undefined, player, player.location, false);
            action.performStop(false, undefined, true);
            player.restoreStamina();
        }
        await sendMessages();
        clearMessages();
        vi.restoreAllMocks();
        vi.clearAllTimers();
        vi.useRealTimers();
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
        expect(astrid.stamina).toBe(6);
        expect(asuka.stamina).toBe(3);
        expect(nero.stamina).toBe(1);
        expect(astrid.location.id).toBe("lobby");
        expect(asuka.location.id).toBe("lobby");
        expect(nero.location.id).toBe("lobby");
        expect(astrid.pos).toStrictEqual({ x: 2500, y: 100, z: 3080 });
        expect(asuka.pos).toStrictEqual({ x: 2763, y: 100, z: 3138 });
        expect(nero.pos).toStrictEqual({ x: 2500, y: 100, z: 3175 });
    });

    describe('one player starts moving with no party', () => {
        test('player moves to the destination room (walking)', async () => {
            const startMoveAction = new StartMoveAction(game, undefined, astrid, astrid.location, false);
            await startMoveAction.performStartMove(false, hall5);
            expect(calculateMoveTimeSpy).toHaveBeenCalledOnce();
            const calculatedTime = 3852.926;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(calculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).not.toHaveBeenCalled();
            expect(queueMoveSpy).not.toHaveBeenCalled();
            expect(astrid.remainingTime).toBeCloseTo(calculatedTime, 3);
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(10);

            await sendMessages();
            expect(lobbyNarrationMessage.content).toBe(`> -# An individual wearing a MASK starts walking toward HALL 5.`);
            expect(astridNotificationMessage.content).toBe(`> -# You start walking toward HALL 5.`);

            /**
             * Fast forward halfway through the move to ensure that certain values have been updated.
             * We don't fast forward by exactly half of the full time because time only elapses in increments of Game.ticks,
             * which is 100ms. So, we fast forward by 1900ms, which is the closest we can get to half of the full time (which is 1926.463ms).
             * The timeRatio at this point should be about 0.493.
             */
            const elapsedTime = 1900;
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(astrid.remainingTime).toBeCloseTo(1952.926, 3);
            expect(elapsedTime / calculatedTime).toBeCloseTo(0.493, 3);
            expect(astrid.pos).toStrictEqual({ x: 2630, y: 100, z: 3109 });
            expect(astrid.stamina).toBeCloseTo(5.947, 3);
            expect(moveSpy).not.toHaveBeenCalled();

            /**
             * Fast forward to the end of the move.
             */
            await vi.advanceTimersByTimeAsync(2000);
            expect(astrid.remainingTime).toBeCloseTo(0, 3);
            expect(astrid.isMoving).toBe(false);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(0);
            expect(astrid.pos).toStrictEqual(hall5.pos);
            expect(astrid.stamina).toBeCloseTo(5.891, 3);
            expect(narrateReachedHalfStaminaSpy).not.toHaveBeenCalled();
            expect(astrid.hasStatus("weary")).toBe(false);
            expect(moveSpy).toBeInvokedWith(false, lobby, hall5.dest, hall5, hall5.getLinkedExit());

            clearMessages();
            await sendMessages();
            expect(lobbyNarrationMessage.content).toBe(`An individual wearing a MASK exits into HALL 5 carrying an APPLE and an unpeeled ORANGE.`);
            expect(astridNotificationMessage.content).toBe(`> -# You exit into HALL 5 carrying an APPLE and an unpeeled ORANGE.`);
            expect(hall5NarrationMessage.content).toBe(`An individual wearing a MASK enters from the LOBBY carrying an APPLE and an unpeeled ORANGE.`);
        });

        test('player moves to the destination room (walking) (with next move in queue)', async () => {
            astrid.moveQueue = ["HALL 5", "LOVE SUITE"];
            const startMoveAction = new StartMoveAction(game, undefined, astrid, astrid.location, false);
            await startMoveAction.performStartMove(false, hall5);
            expect(calculateMoveTimeSpy).toHaveBeenCalledOnce();
            const calculatedTime = 3852.926;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(calculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).not.toHaveBeenCalled();
            expect(queueMoveSpy).not.toHaveBeenCalled();
            expect(astrid.remainingTime).toBeCloseTo(calculatedTime, 3);
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(10);

            /**
             * Fast forward halfway through the move to ensure that certain values have been updated.
             * We don't fast forward by exactly half of the full time because time only elapses in increments of Game.ticks,
             * which is 100ms. So, we fast forward by 1900ms, which is the closest we can get to half of the full time (which is 1926.463ms).
             * The timeRatio at this point should be about 0.493.
             */
            const elapsedTime = 1900;
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(astrid.remainingTime).toBeCloseTo(1952.926, 3);
            expect(elapsedTime / calculatedTime).toBeCloseTo(0.493, 3);
            expect(astrid.pos).toStrictEqual({ x: 2630, y: 100, z: 3109 });
            expect(astrid.stamina).toBeCloseTo(5.947, 3);
            expect(moveSpy).not.toHaveBeenCalled();

            /**
             * Fast forward to the end of the move.
             */
            await vi.advanceTimersByTimeAsync(2000);
            expect(astrid.remainingTime).not.toBeCloseTo(0, 3);
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(10);
            expect(moveSpy).toBeInvokedWith(false, lobby, hall5.dest, hall5, hall5.getLinkedExit());
            expect(astrid.moveQueue).not.toHaveLength(0);
        });

        test('moving player runs out of stamina', async () => {
            nero.location.removePlayer(nero);
            meatballRoom.addPlayer(nero);
            nero.setPos(meatballBeginning.pos);
            nero.moveQueue = ["END", "NEXT ROOM"];
            const startMoveAction = new StartMoveAction(game, undefined, nero, nero.location, false);
            await startMoveAction.performStartMove(true, meatballEnd);
            expect(calculateMoveTimeSpy).toHaveBeenCalledOnce();
            const calculatedTime = 424339.472;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(calculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).not.toHaveBeenCalled();
            expect(queueMoveSpy).not.toHaveBeenCalled();
            expect(nero.remainingTime).toBeCloseTo(calculatedTime, 3);
            expect(nero.isMoving).toBe(true);
            expect(nero.isRunning).toBe(true);
            expect(nero.moveTimer).not.toBeNull();
            expect(nero.currentMovingSpeed).toEqual(1);

            await sendMessages();
            expect(meatballNarrationMessage.content).toBe(`> -# Nero starts running toward the END.`);
            expect(neroNotificationMessage.content).toBe(`> -# You start running toward the END.`);

            /**
             * Fast forward to when we might expect Nero to have depleted half of his stamina.
             * For the sake of simplicity, we'll go with 17 seconds.
             */
            const elapsedTime = 17000;
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(nero.remainingTime).toBeCloseTo(407339.472, 3);
            expect(nero.stamina).toBeCloseTo(0.490, 3);
            expect(narrateReachedHalfStaminaSpy).toHaveBeenCalledOnce();

            clearMessages();
            await sendMessages();
            expect(meatballNarrationMessage.content).toBe(`> -# Nero's breathing is getting heavy. It seems like he's starting to get tired.`);
            expect(neroNotificationMessage.content).toBe(`Your breathing is getting heavy. You might want to stop moving and rest soon.`);

            /**
             * Fast forward to when we expect Nero to have run out of stamina.
             */
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(nero.remainingTime).toBeCloseTo(0, 3);
            expect(nero.isMoving).toBe(false);
            expect(nero.isRunning).toBe(false);
            expect(nero.moveTimer).toBeNull();
            expect(nero.currentMovingSpeed).toEqual(0);
            expect(nero.pos).toStrictEqual({ x: 425, y: 0, z: 2641 });
            expect(nero.stamina).toBeCloseTo(0, 3);
            expect(nero.hasStatus("weary")).toBe(true);
            nero.cure(game.entityFinder.getStatusEffect("weary"));
            expect(nero.moveQueue).toHaveLength(0);
            clearMessages();
            await sendMessages();
            expect(meatballNarrationMessage.content).toBe(`> -# Nero stops moving. He seems weary.`);
            expect(neroNotificationMessage.content).toBe(`After to moving to this room, you have become **weary**. You need to take a short break before moving to another room.`);
        });

        test('no stamina decrease behavior attribute prevents stamina loss', async () => {
            const noStaminaDecrease = game.entityFinder.getStatusEffect("meatball stamina");
            astrid.inflict(noStaminaDecrease);
            const startMoveAction = new StartMoveAction(game, undefined, astrid, astrid.location, false);
            await startMoveAction.performStartMove(false, hall5);
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(10);
            expect(astrid.hasBehaviorAttribute("no stamina decrease")).toBe(true);

            /**
             * Fast forward halfway through the move.
             */
            const elapsedTime = 1900;
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(astrid.stamina).toBeCloseTo(astrid.maxStamina, 3);
            expect(moveSpy).not.toHaveBeenCalled();

            /**
             * Fast forward to the end of the move.
             */
            await vi.advanceTimersByTimeAsync(2000);
            expect(astrid.remainingTime).toBeCloseTo(0, 3);
            expect(astrid.isMoving).toBe(false);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(0);
            expect(astrid.pos).toStrictEqual(hall5.pos);
            expect(astrid.stamina).toBeCloseTo(astrid.maxStamina, 3);
            expect(narrateReachedHalfStaminaSpy).not.toHaveBeenCalled();
            expect(astrid.hasStatus("weary")).toBe(false);
            astrid.cure(noStaminaDecrease);
        });

        test('exit is locked', async () => {
            hall5.lock();
            astrid.moveQueue = ["HALL 5", "LOVE SUITE"];
            const startMoveAction = new StartMoveAction(game, undefined, astrid, astrid.location, false);
            await startMoveAction.performStartMove(false, hall5);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            await sendMessages();

            await vi.advanceTimersByTimeAsync(3900);
            expect(astrid.remainingTime).toBeCloseTo(0, 3);
            expect(astrid.isMoving).toBe(false);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(0);
            expect(astrid.pos).toStrictEqual(hall5.pos);
            expect(moveSpy).not.toHaveBeenCalled();
            expect(astrid.moveQueue).toHaveLength(0);

            clearMessages();
            await sendMessages();
            expect(lobbyNarrationMessage.content).toBe(`> -# An individual wearing a MASK tries to open HALL 5, but it seems to be locked.`);
            expect(astridNotificationMessage.content).toBe(`You try to open HALL 5, but it seems to be locked.`);
            hall5.unlock();
        });

        test('exit has restricted exit puzzle that the player can pass', async () => {
            astrid.location.removePlayer(astrid);
            cave9.addPlayer(astrid);
            const cave9Puzzle = game.entityFinder.getPuzzle("DOOR", "cave-9", "restricted exit");
            cave9Puzzle.setAccessible();
            const startMoveAction = new StartMoveAction(game, undefined, astrid, astrid.location, false);
            await startMoveAction.performStartMove(false, cave9Door);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            await sendMessages();

            await vi.advanceTimersByTimeAsync(2900);
            expect(astrid.remainingTime).toBeCloseTo(0, 3);
            expect(astrid.isMoving).toBe(false);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(0);
            expect(astrid.pos).toStrictEqual(cave9Door.pos);
            expect(moveSpy).toBeInvokedWith(false, cave9, cave9Door.dest, cave9Door, cave9Door.getLinkedExit());
            expect(astrid.moveQueue).toHaveLength(0);

            clearMessages();
            await sendMessages();
            expect(cave9NarrationMessage.content).toBe(`An individual wearing a MASK exits into the DOOR carrying an APPLE and an unpeeled ORANGE.`);
            expect(astridNotificationMessage.content).toBe(`> -# You exit into the DOOR carrying an APPLE and an unpeeled ORANGE.`);
        });

        test('exit has restricted exit puzzle that the player cannot pass', async () => {
            nero.location.removePlayer(nero);
            cave9.addPlayer(nero);
            const cave9Puzzle = game.entityFinder.getPuzzle("DOOR", "cave-9", "restricted exit");
            cave9Puzzle.setAccessible();
            const startMoveAction = new StartMoveAction(game, undefined, nero, nero.location, false);
            await startMoveAction.performStartMove(false, cave9Door);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            await sendMessages();

            await vi.advanceTimersByTimeAsync(8600);
            expect(nero.remainingTime).toBeCloseTo(0, 3);
            expect(nero.isMoving).toBe(false);
            expect(nero.isRunning).toBe(false);
            expect(nero.moveTimer).toBeNull();
            expect(nero.currentMovingSpeed).toEqual(0);
            expect(nero.pos).toStrictEqual(cave9Door.pos);
            expect(moveSpy).not.toHaveBeenCalled();
            expect(nero.moveQueue).toHaveLength(0);

            clearMessages();
            await sendMessages();
            expect(cave9NarrationMessage.content).toBe(`> -# Nero tries to open the DOOR, but it seems to be locked.`);
            expect(neroNotificationMessage.content).toBe(`You try to open the DOOR, but it seems to be locked.`);
        });
    });

    describe('one player starts moving with followers', () => {
        test('moving player runs out of stamina', async () => {
            asuka.location.removePlayer(asuka);
            meatballRoom.addPlayer(asuka);
            nero.location.removePlayer(nero);
            meatballRoom.addPlayer(nero);
            asuka.setPos(meatballBeginning.pos);
            nero.setPos(meatballBeginning.pos);
            const followAction = new FollowAction(game, undefined, asuka, asuka.location, false);
            await followAction.performFollow(nero);
            await sendMessages();
            clearMessages();

            const startMoveAction = new StartMoveAction(game, undefined, nero, nero.location, false);
            await startMoveAction.performStartMove(true, meatballEnd);
            expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(2);
            const calculatedTime = 424339.472;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(calculatedTime, 3);
            expect(calculateMoveTimeSpy.mock.results[1].value).toBeCloseTo(calculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).toHaveBeenCalledOnce();
            expect(nero.remainingTime).toBeCloseTo(calculatedTime, 3);
            expect(nero.isMoving).toBe(true);
            expect(nero.isRunning).toBe(true);
            expect(nero.moveTimer).not.toBeNull();
            expect(nero.currentMovingSpeed).toEqual(1);

            await vi.advanceTimersByTimeAsync(100);
            expect(queueMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledTimes(2);
            expect(asuka.remainingTime).toBeCloseTo(calculatedTime, 3);
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(true);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.currentMovingSpeed).toEqual(1);

            await sendMessages();
            expect(meatballNarrationMessage.content).toBe(`> -# Nero starts running toward the END.`);
            expect(meatballRoom.channel.messages.cache.last().content).toBe(`> -# Asuka starts running toward the END.`);
            expect(neroNotificationMessage.content).toBe(`> -# You start running toward the END.`);
            expect(asukaNotificationMessage.content).toBe(`> -# You start running toward the END.`);

            /**
             * Fast forward to when we might expect Nero to have depleted half of his stamina.
             * For the sake of simplicity, we'll go with 16.9 seconds (making up for the advance by 100ms earlier).
             */
            const elapsedTime = 16900;
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(nero.remainingTime).toBeCloseTo(407339.472, 3);
            expect(nero.stamina).toBeCloseTo(0.490, 3);
            expect(asuka.stamina).toBeGreaterThan(nero.stamina);
            expect(narrateReachedHalfStaminaSpy).toHaveBeenCalledOnce();

            clearMessages();
            await sendMessages();
            expect(meatballNarrationMessage.content).toBe(`> -# Nero's breathing is getting heavy. It seems like he's starting to get tired.`);
            expect(neroNotificationMessage.content).toBe(`Your breathing is getting heavy. You might want to stop moving and rest soon.`);

            /**
             * Fast forward to when we expect Nero to have run out of stamina.
             */
            await vi.advanceTimersByTimeAsync(elapsedTime + 100);
            expect(nero.remainingTime).toBeCloseTo(0, 3);
            expect(nero.isMoving).toBe(false);
            expect(nero.isRunning).toBe(false);
            expect(nero.moveTimer).toBeNull();
            expect(nero.currentMovingSpeed).toEqual(0);
            expect(nero.pos).toStrictEqual({ x: 425, y: 0, z: 2641 });
            expect(nero.stamina).toBeCloseTo(0, 3);
            expect(nero.hasStatus("weary")).toBe(true);
            nero.cure(game.entityFinder.getStatusEffect("weary"));
            expect(nero.moveQueue).toHaveLength(0);
            expect(asuka.remainingTime).toBeCloseTo(0, 3);
            expect(asuka.isMoving).toBe(false);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.moveTimer).toBeNull();
            expect(asuka.currentMovingSpeed).toEqual(0);
            // We can expect Asuka to be a little behind.
            expect(asuka.pos).toStrictEqual({ x: 425, y: 0, z: 2646 });
            expect(asuka.stamina).not.toBeCloseTo(0, 3);
            expect(asuka.hasStatus("weary")).toBe(false);

            clearMessages();
            await sendMessages();
            expect(meatballNarrationMessage.content).toBe(`> -# Nero stops moving. He seems weary.`);
            expect(meatballRoom.channel.messages.cache.last().content).toBe(`> -# Asuka stops moving.`);
            expect(neroNotificationMessage.content).toBe(`After to moving to this room, you have become **weary**. You need to take a short break before moving to another room.`);
            expect(asukaNotificationMessage.content).toBe(`> -# You stop moving.`);
        });

        test('following player runs out of stamina', async () => {
            asuka.location.removePlayer(asuka);
            meatballRoom.addPlayer(asuka);
            nero.location.removePlayer(nero);
            meatballRoom.addPlayer(nero);
            asuka.setPos(meatballBeginning.pos);
            nero.setPos(meatballBeginning.pos);
            const followAction = new FollowAction(game, undefined, nero, nero.location, false);
            await followAction.performFollow(asuka);
            await sendMessages();
            clearMessages();

            const startMoveAction = new StartMoveAction(game, undefined, asuka, asuka.location, false);
            await startMoveAction.performStartMove(true, meatballEnd);
            expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(2);
            const asukaCalculatedTime = 151645.207;
            const neroCalculatedTime = 424339.472;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(asukaCalculatedTime, 3);
            expect(calculateMoveTimeSpy.mock.results[1].value).toBeCloseTo(neroCalculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).toHaveBeenCalledOnce();
            expect(asuka.remainingTime).toBeCloseTo(asukaCalculatedTime, 3);
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(true);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.currentMovingSpeed).toEqual(5);

            await vi.advanceTimersByTimeAsync(100);
            expect(queueMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledTimes(2);
            expect(nero.remainingTime).toBeCloseTo(neroCalculatedTime, 3);
            expect(nero.isMoving).toBe(true);
            expect(nero.isRunning).toBe(true);
            expect(nero.moveTimer).not.toBeNull();
            expect(nero.currentMovingSpeed).toEqual(1);

            await sendMessages();
            expect(meatballNarrationMessage.content).toBe(`> -# Asuka starts running toward the END.`);
            expect(meatballRoom.channel.messages.cache.last().content).toBe(`> -# Nero starts running toward the END.`);
            expect(neroNotificationMessage.content).toBe(`> -# You start running toward the END.`);
            expect(asukaNotificationMessage.content).toBe(`> -# You start running toward the END.`);

            /**
             * Fast forward to when we might expect Nero to have depleted half of his stamina.
             * For the sake of simplicity, we'll go with 17 seconds.
             */
            const elapsedTime = 17000;
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(nero.remainingTime).toBeCloseTo(407339.472, 3);
            expect(nero.stamina).toBeCloseTo(0.490, 3);
            expect(asuka.stamina).toBeGreaterThan(nero.stamina);
            expect(narrateReachedHalfStaminaSpy).toHaveBeenCalledOnce();

            clearMessages();
            await sendMessages();
            expect(meatballNarrationMessage.content).toBe(`> -# Nero's breathing is getting heavy. It seems like he's starting to get tired.`);
            expect(neroNotificationMessage.content).toBe(`Your breathing is getting heavy. You might want to stop moving and rest soon.`);

            /**
             * Fast forward to when we expect Nero to have run out of stamina.
             */
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(nero.remainingTime).toBeCloseTo(0, 3);
            expect(nero.isMoving).toBe(false);
            expect(nero.isRunning).toBe(false);
            expect(nero.moveTimer).toBeNull();
            expect(nero.currentMovingSpeed).toEqual(0);
            expect(nero.pos).toStrictEqual({ x: 425, y: 0, z: 2641 });
            expect(nero.stamina).toBeCloseTo(0, 3);
            expect(nero.hasStatus("weary")).toBe(true);
            nero.cure(game.entityFinder.getStatusEffect("weary"));
            expect(nero.moveQueue).toHaveLength(0);
            expect(asuka.remainingTime).toBeGreaterThan(0);
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(true);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.currentMovingSpeed).toEqual(5);
            // Asuka will have made it further than Nero, due to moving at a higher speed.
            expect(asuka.pos).toStrictEqual({ x: 425, y: 0, z: 1091 });
            expect(asuka.stamina).not.toBeCloseTo(0, 3);
            expect(asuka.hasStatus("weary")).toBe(false);

            clearMessages();
            await sendMessages();
            expect(meatballRoom.channel.messages.cache).toHaveSize(2);
            expect(meatballNarrationMessage.content).toBe(`> -# Asuka's breathing is getting heavy. It seems like she's starting to get tired.`);
            expect(meatballRoom.channel.messages.cache.last().content).toBe(`> -# Nero stops moving. He seems weary.`);
            expect(asukaNotificationMessage.content).toBe(`Your breathing is getting heavy. You might want to stop moving and rest soon.`);
            expect(neroNotificationMessage.content).toBe(`After to moving to this room, you have become **weary**. You need to take a short break before moving to another room.`);
        });

        test('follower is closer to exit than moving player', async () => {
            const followAction = new FollowAction(game, undefined, asuka, asuka.location, false);
            await followAction.performFollow(astrid);
            await sendMessages();
            clearMessages();

            const startMoveAction = new StartMoveAction(game, undefined, astrid, astrid.location, false);
            await startMoveAction.performStartMove(false, hall5);
            expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(2);
            const asukaCalculatedTime = 0;
            const astridCalculatedTime = 3852.926;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(astridCalculatedTime, 3);
            expect(calculateMoveTimeSpy.mock.results[1].value).toBeCloseTo(asukaCalculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).toHaveBeenCalledOnce();
            expect(astrid.remainingTime).toBeCloseTo(astridCalculatedTime, 3);
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(10);
            expect(asuka.remainingTime).toBeCloseTo(astridCalculatedTime + 100, 3);
            expect(asuka.isMoving).toBe(false);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.currentMovingSpeed).toEqual(0);

            /**
             * Fast forward to the end of Astrid's move.
             */
            await vi.advanceTimersByTimeAsync(3900);
            expect(astrid.remainingTime).toBeCloseTo(0, 3);
            expect(astrid.isMoving).toBe(false);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(0);
            expect(astrid.pos).toStrictEqual(hall5.pos);
            expect(moveSpy).toBeInvokedWith(false, lobby, hall5.dest, hall5, hall5.getLinkedExit());
            moveSpy.mockClear();
            // Asuka still shouldn't have started moving yet.
            expect(asuka.location).toStrictEqual(lobby);
            expect(asuka.isMoving).toBe(false);
            expect(asuka.remainingTime).toBeCloseTo(52.926, 3);

            /**
             * Fast forward to the end of Asuka's delay timer.
             */
            await vi.advanceTimersByTimeAsync(100);
            expect(queueMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledTimes(2);
            expect(asuka.remainingTime).toBeCloseTo(0, 3);
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.currentMovingSpeed).toEqual(5);
            expect(moveSpy).not.toHaveBeenCalled();
            /**
             * Fast forward to the end of Asuka's move timer.
             */
            await vi.advanceTimersByTimeAsync(100);
            expect(asuka.remainingTime).toBeCloseTo(0, 3);
            expect(asuka.isMoving).toBe(false);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.moveTimer).toBeNull();
            expect(asuka.currentMovingSpeed).toEqual(0);
            expect(asuka.pos).toStrictEqual(hall5.pos);
            expect(moveSpy).toBeInvokedWith(false, lobby, hall5.dest, hall5, hall5.getLinkedExit());
            expect(asuka.location).toStrictEqual(astrid.location);
        });

        test('exit locks before follower reaches it', async () => {
            const followAction = new FollowAction(game, undefined, nero, nero.location, false);
            await followAction.performFollow(astrid);
            await sendMessages();
            clearMessages();

            const startMoveAction = new StartMoveAction(game, undefined, astrid, astrid.location, false);
            await startMoveAction.performStartMove(false, hall5);
            expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(2);
            const astridCalculatedTime = 3852.926;
            const neroCalculatedTime = 11310.121;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(astridCalculatedTime, 3);
            expect(calculateMoveTimeSpy.mock.results[1].value).toBeCloseTo(neroCalculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).toHaveBeenCalledOnce();
            expect(astrid.remainingTime).toBeCloseTo(astridCalculatedTime, 3);
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(10);

            await vi.advanceTimersByTimeAsync(100);
            expect(queueMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledTimes(2);
            expect(nero.remainingTime).toBeCloseTo(neroCalculatedTime, 3);
            expect(nero.isMoving).toBe(true);
            expect(nero.isRunning).toBe(false);
            expect(nero.moveTimer).not.toBeNull();
            expect(nero.currentMovingSpeed).toEqual(1);

            await sendMessages();
            expect(lobbyNarrationMessage.content).toBe(`> -# An individual wearing a MASK starts walking toward HALL 5.`);
            expect(lobby.channel.messages.cache.last().content).toBe(`> -# Nero starts walking toward HALL 5.`);
            expect(astridNotificationMessage.content).toBe(`> -# You start walking toward HALL 5.`);
            expect(neroNotificationMessage.content).toBe(`> -# You start walking toward HALL 5.`);

            /**
             * Fast forward to the end of Astrid's move.
             */
            await vi.advanceTimersByTimeAsync(3800);
            expect(astrid.remainingTime).toBeCloseTo(0, 3);
            expect(astrid.isMoving).toBe(false);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(0);
            expect(astrid.pos).toStrictEqual(hall5.pos);
            expect(astrid.stamina).toBeCloseTo(5.891, 3);
            expect(narrateReachedHalfStaminaSpy).not.toHaveBeenCalled();
            expect(astrid.hasStatus("weary")).toBe(false);
            expect(moveSpy).toBeInvokedWith(false, lobby, hall5.dest, hall5, hall5.getLinkedExit());

            moveSpy.mockClear();
            clearMessages();
            await sendMessages();
            expect(lobbyNarrationMessage.content).toBe(`An individual wearing a MASK exits into HALL 5 carrying an APPLE and an unpeeled ORANGE.`);
            expect(astridNotificationMessage.content).toBe(`> -# You exit into HALL 5 carrying an APPLE and an unpeeled ORANGE.`);
            expect(hall5NarrationMessage.content).toBe(`An individual wearing a MASK enters from the LOBBY carrying an APPLE and an unpeeled ORANGE.`);

            hall5.lock();

            /**
             * Fast forward to the end of Nero's move.
             */
            await vi.advanceTimersByTimeAsync(7600);
            expect(nero.remainingTime).toBeCloseTo(0, 3);
            expect(nero.isMoving).toBe(false);
            expect(nero.isRunning).toBe(false);
            expect(nero.moveTimer).toBeNull();
            expect(nero.currentMovingSpeed).toEqual(0);
            expect(nero.pos).toStrictEqual(hall5.pos);
            expect(moveSpy).not.toHaveBeenCalled();
            expect(nero.moveQueue).toHaveLength(0);
            expect(nero.isFollowing(astrid)).toBe(false);

            clearMessages();
            await sendMessages();
            expect(lobbyNarrationMessage.content).toBe(`> -# Nero tries to open HALL 5, but it seems to be locked.`);
            expect(neroNotificationMessage.content).toBe(`You try to open HALL 5, but it seems to be locked.`);
            hall5.unlock();
        });

        test('exit has restricted exit puzzle that only the follower can pass (but they stop when the moving player stops)', async () => {
            nero.location.removePlayer(nero);
            cave9.addPlayer(nero);
            astrid.location.removePlayer(astrid);
            cave9.addPlayer(astrid);
            const cave9Puzzle = game.entityFinder.getPuzzle("DOOR", "cave-9", "restricted exit");
            cave9Puzzle.setAccessible();
            const followAction = new FollowAction(game, undefined, astrid, astrid.location, false);
            await followAction.performFollow(nero);
            await sendMessages();
            clearMessages();

            const startMoveAction = new StartMoveAction(game, undefined, nero, nero.location, false);
            await startMoveAction.performStartMove(false, cave9Door);
            expect(calculateMoveTimeSpy).toHaveBeenCalledTimes(2);
            const calculatedTime = 8523.792;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(calculatedTime, 3);
            expect(calculateMoveTimeSpy.mock.results[1].value).toBeCloseTo(calculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).toHaveBeenCalledOnce();
            expect(nero.remainingTime).toBeCloseTo(calculatedTime, 3);
            expect(nero.isMoving).toBe(true);
            expect(nero.isRunning).toBe(false);
            expect(nero.moveTimer).not.toBeNull();
            expect(nero.currentMovingSpeed).toEqual(1);

            await vi.advanceTimersByTimeAsync(100);
            expect(queueMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledTimes(2);
            expect(astrid.remainingTime).toBeCloseTo(calculatedTime, 3);
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(1);

            await sendMessages();
            expect(cave9.channel.messages.cache).toHaveSize(2);
            expect(cave9NarrationMessage.content).toBe(`> -# Nero starts walking toward the DOOR.`);
            expect(cave9.channel.messages.cache.last().content).toBe(`> -# An individual wearing a MASK starts walking toward the DOOR.`);
            expect(neroNotificationMessage.content).toBe(`> -# You start walking toward the DOOR.`);
            expect(astrid.notificationChannel.messages.cache.last().content).toBe(`> -# You start walking toward the DOOR.`);

            /**
             * Fast forward to the end of Nero's move.
             */
            await vi.advanceTimersByTimeAsync(8600);
            expect(nero.remainingTime).toBeCloseTo(0, 3);
            expect(nero.isMoving).toBe(false);
            expect(nero.isRunning).toBe(false);
            expect(nero.moveTimer).toBeNull();
            expect(nero.currentMovingSpeed).toEqual(0);
            expect(nero.pos).toStrictEqual(cave9Door.pos);
            expect(astrid.remainingTime).toBeCloseTo(0, 3);
            expect(astrid.isMoving).toBe(false);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.moveTimer).toBeNull();
            expect(astrid.currentMovingSpeed).toEqual(0);
            expect(astrid.pos).toStrictEqual({ x: 4812, y: 200, z: 453 });
            expect(astrid.isFollowing(nero)).toBe(true);
            expect(moveSpy).not.toHaveBeenCalled();

            clearMessages();
            await sendMessages();
            expect(cave9NarrationMessage.content).toBe(`> -# Nero tries to open the DOOR, but it seems to be locked.`);
            expect(cave9.channel.messages.cache.last().content).toBe(`> -# An individual wearing a MASK stops moving.`);
            expect(neroNotificationMessage.content).toBe(`You try to open the DOOR, but it seems to be locked.`);
            expect(astrid.notificationChannel.messages.cache.last().content).toBe(`> -# You stop moving.`);
            cave9Puzzle.setInaccessible();
        });
    });

    describe('party leader starts moving', () => {
        beforeEach(async () => {
            const followAction1 = new FollowAction(game, undefined, asuka, asuka.location, false);
            await followAction1.performFollow(astrid);
            const followAction2 = new FollowAction(game, undefined, nero, nero.location, false);
            await followAction2.performFollow(astrid);
            const leadAction = new LeadAction(game, undefined, astrid, astrid.location, false);
            await leadAction.performLead([asuka, nero]);
            await vi.advanceTimersByTimeAsync(7800);
            await sendMessages();
            clearMessages();
            vi.clearAllMocks();
        });

        afterEach(async () => {
            const disbandAction = new DisbandPartyAction(game, undefined, astrid, astrid.location, false);
            await disbandAction.performDisbandParty(true);
        });

        test('party member positions are always the same', async () => {
            const party = astrid.party;
            for (const member of party.members.values())
                expect(member.positionMatches(party.leader));

            const startMoveAction = new StartMoveAction(game, undefined, astrid, astrid.location, false);
            await startMoveAction.performStartMove(false, mainEntrance);
            expect(calculateMoveTimeSpy).toHaveBeenCalledOnce();
            const calculatedTime = 4045.566;
            expect(calculateMoveTimeSpy.mock.results[0].value).toBeCloseTo(calculatedTime, 3);
            expect(narrateStartMoveSpy).toHaveBeenCalledOnce();
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(doAfterDelaySpy).not.toHaveBeenCalled();
            expect(queueMoveSpy).not.toHaveBeenCalled();
            for (const member of party.members.values()) {
                expect(member.remainingTime).toBeCloseTo(calculatedTime, 3);
                expect(member.isMoving).toBe(true);
                expect(member.isRunning).toBe(false);
                expect(member.moveTimer).not.toBeNull();
                expect(member.currentMovingSpeed).toEqual(1);
            }

            await sendMessages();
            expect(lobby.channel.messages.cache).toHaveSize(1);
            expect(astrid.notificationChannel.messages.cache).toHaveSize(1);
            expect(asuka.notificationChannel.messages.cache).toHaveSize(1);
            expect(nero.notificationChannel.messages.cache).toHaveSize(1);
            let narration = `An individual wearing a MASK starts walking toward the MAIN ENTRANCE with Asuka and Nero. `
                + `An individual wearing a MASK carries an APPLE and an unpeeled ORANGE; Asuka carries a POT.`;
            expect(lobbyNarrationMessage.content).toBe(`> -# ${narration}`);
            expect(astridNotificationMessage.content).toBe(`> -# You start walking toward the MAIN ENTRANCE with Asuka and Nero.`);
            expect(asukaNotificationMessage.content).toBe(`> -# Following an individual wearing a MASK, you start walking toward the MAIN ENTRANCE with Nero.`);
            expect(neroNotificationMessage.content).toBe(`> -# Following an individual wearing a MASK, you start walking toward the MAIN ENTRANCE with Asuka.`);

            /**
             * Fast forward a quarter of the way through the move to ensure that the players are moving in sync.
             * The timeRatio at this point should be about 0.247.
             */
            let elapsedTime = 1000;
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(elapsedTime / calculatedTime).toBeCloseTo(0.247, 3);
            for (const member of party.members.values()) {
                expect(member.remainingTime).toBeCloseTo(3045.566, 3);
                expect(member.pos).toStrictEqual({ x: 2500, y: 100, z: 3103 });
            }
            expect(moveSpy).not.toHaveBeenCalled();
            /**
             * Fast forward to the halfway mark.
             */
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(2 * elapsedTime / calculatedTime).toBeCloseTo(0.494, 3);
            for (const member of party.members.values()) {
                expect(member.remainingTime).toBeCloseTo(2045.566, 3);
                expect(member.pos).toStrictEqual({ x: 2500, y: 100, z: 3127 });
            }
            expect(moveSpy).not.toHaveBeenCalled();
            /**
             * Fast forward to the three quarters mark.
             */
            await vi.advanceTimersByTimeAsync(elapsedTime);
            expect(3 * elapsedTime / calculatedTime).toBeCloseTo(0.742, 3);
            for (const member of party.members.values()) {
                expect(member.remainingTime).toBeCloseTo(1045.566, 3);
                expect(member.pos).toStrictEqual({ x: 2500, y: 100, z: 3150 });
            }
            expect(moveSpy).not.toHaveBeenCalled();

            /**
             * Fast forward to the end of the move.
             */
            await vi.advanceTimersByTimeAsync(1100);
            expect(movePlayersSpy).toHaveBeenCalledOnce();
            expect(narrateReachedHalfStaminaSpy).not.toHaveBeenCalled();
            expect(moveSpy).toHaveBeenCalledTimes(3);
            expect(moveSpy).toBeInvokedWith(false, lobby, mainEntrance.dest, mainEntrance, mainEntrance.getLinkedExit());
            for (const member of party.members.values()) {
                expect(member.remainingTime).toBeCloseTo(0, 3);
                expect(member.isMoving).toBe(false);
                expect(member.isRunning).toBe(false);
                expect(member.moveTimer).toBeNull();
                expect(member.currentMovingSpeed).toEqual(0);
                expect(member.pos).toStrictEqual(mainEntrance.pos);
                expect(member.hasStatus("weary")).toBe(false);
            }

            /*clearMessages();
            await sendMessages();
            expect(lobbyNarrationMessage.content).toBe(`An individual wearing a MASK exits into HALL 5.`);
            expect(astridNotificationMessage.content).toBe(`> -# You exit into HALL 5.`);
            expect(hall5NarrationMessage.content).toBe(`An individual wearing a MASK enters from the LOBBY.`);*/
        });

        test('party leader runs out of stamina', async () => {

        });

        test('party follower runs out of stamina', async () => {

        });

        test('exit has restricted exit puzzle that only the leader can pass', async () => {

        });

        test('exit has restricted exit puzzle that the leader and one follower can pass', async () => {

        });

        test('exit has restricted exit puzzle that only a follower can pass', async () => {

        });
    });
});
