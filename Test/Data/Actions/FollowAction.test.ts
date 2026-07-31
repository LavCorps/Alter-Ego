// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Player from "../../../Data/Player.ts";
import type Status from "../../../Data/Status.ts";
import FollowAction from "../../../Data/Actions/FollowAction.ts";
import QueueMoveAction from "../../../Data/Actions/QueueMoveAction.ts";
import StopAction from "../../../Data/Actions/StopAction.ts";

describe('FollowAction test', () => {
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
    });

    test('Setup is correct', () => {
        expect(astrid.speed).toBe(10);
        expect(asuka.speed).toBe(5);
        expect(nero.speed).toBe(1);
        expect(astrid.location.id).toBe("lobby");
        expect(asuka.location.id).toBe("lobby");
        expect(nero.location.id).toBe("lobby");
    });

    describe('FollowAction.performFollow tests', () => {
        afterEach(async () => {
            const action = new StopAction(testGame, undefined, astrid, astrid.location, false);
            await action.performStop(false, undefined, true, new Set([astrid, asuka, nero]));
        });

        test('stationary player follows stationary player', async () => {
            const action = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await action.performFollow(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.party).toBeNull();
            expect(asuka.isMoving).toBe(false);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.currentMovingSpeed).toBe(0);
            expect(asuka.moveTimer).toBeNull();
            expect(asuka.moveQueue).toHaveLength(0);
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(asuka.isFollowing(astrid)).toBe(true);
        });

        test('stationary player follows different stationary player', async () => {
            const action1 = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await action1.performFollow(astrid);
            expect(asuka.isFollowing(astrid)).toBe(true);

            const action2 = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await action2.performFollow(nero);
            expect(asuka.followedPlayerDisplayName).toBe(nero.name);
            expect(asuka.followedPlayer).toStrictEqual(nero);
            expect(asuka.isFollowing(astrid)).toBe(false);
            expect(asuka.isFollowing(nero)).toBe(true);
        });

        test('slow stationary player follows fast moving player at slowest speed', async () => {
            const queueMoveAction = new QueueMoveAction(testGame, undefined, astrid, astrid.location, false);
            const destination = "HALL 5";
            astrid.moveQueue = [destination];
            await queueMoveAction.performQueueMove(false, destination);

            const followAction = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await followAction.performFollow(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.party).toBeNull();
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.currentMovingSpeed).toBe(asuka.speed);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.moveQueue).toHaveLength(1);
            expect(asuka.moveQueue[0]).toBe(destination);
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(asuka.isFollowing(astrid)).toBe(true);
        });

        test('fast stationary player follows slow moving player at slowest speed', async () => {
            const queueMoveAction = new QueueMoveAction(testGame, undefined, asuka, asuka.location, false);
            const destination = "HALL 5";
            asuka.moveQueue = [destination];
            await queueMoveAction.performQueueMove(false, destination);

            const followAction = new FollowAction(testGame, undefined, astrid, astrid.location, false);
            await followAction.performFollow(asuka);
            expect(astrid.followedPlayerDisplayName).toBe(asuka.name);
            expect(astrid.party).toBeNull();
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(false);
            expect(astrid.currentMovingSpeed).toBe(asuka.speed);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.moveQueue).toHaveLength(1);
            expect(astrid.moveQueue[0]).toBe(destination);
            expect(astrid.followedPlayer).toStrictEqual(asuka);
            expect(astrid.isFollowing(asuka)).toBe(true);
        });

        test('slow stationary player follows fast running player at slowest speed', async () => {
            const queueMoveAction = new QueueMoveAction(testGame, undefined, astrid, astrid.location, false);
            const destination = "HALL 5";
            astrid.moveQueue = [destination];
            await queueMoveAction.performQueueMove(true, destination);

            const followAction = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await followAction.performFollow(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.party).toBeNull();
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(true);
            expect(asuka.currentMovingSpeed).toBe(asuka.speed);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.moveQueue).toHaveLength(1);
            expect(asuka.moveQueue[0]).toBe(destination);
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(asuka.isFollowing(astrid)).toBe(true);
        });

        test('fast stationary player follows slow running player at slowest speed', async () => {
            const queueMoveAction = new QueueMoveAction(testGame, undefined, asuka, asuka.location, false);
            const destination = "HALL 5";
            asuka.moveQueue = [destination];
            await queueMoveAction.performQueueMove(true, destination);

            const followAction = new FollowAction(testGame, undefined, astrid, astrid.location, false);
            await followAction.performFollow(asuka);
            expect(astrid.followedPlayerDisplayName).toBe(asuka.name);
            expect(astrid.party).toBeNull();
            expect(astrid.isMoving).toBe(true);
            expect(astrid.isRunning).toBe(true);
            expect(astrid.currentMovingSpeed).toBe(asuka.speed);
            expect(astrid.moveTimer).not.toBeNull();
            expect(astrid.moveQueue).toHaveLength(1);
            expect(astrid.moveQueue[0]).toBe(destination);
            expect(astrid.followedPlayer).toStrictEqual(asuka);
            expect(astrid.isFollowing(asuka)).toBe(true);
        });

        test('moving player follows moving player', async() => {
            const queueMoveAction1 = new QueueMoveAction(testGame, undefined, astrid, astrid.location, false);
            const destination1 = "HALL 5";
            astrid.moveQueue = [destination1];
            await queueMoveAction1.performQueueMove(false, destination1);

            const queueMoveAction2 = new QueueMoveAction(testGame, undefined, asuka, asuka.location, false);
            const destination2 = "HALL 3";
            asuka.moveQueue = [destination2];
            await queueMoveAction2.performQueueMove(false, destination2);

            const followAction = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await followAction.performFollow(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.party).toBeNull();
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.currentMovingSpeed).toBe(asuka.speed);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.moveQueue).toHaveLength(1);
            expect(asuka.moveQueue[0]).toBe(destination1);
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(asuka.isFollowing(astrid)).toBe(true);
        });

        test('player following moving player follows different moving player', async() => {
            const queueMoveAction1 = new QueueMoveAction(testGame, undefined, astrid, astrid.location, false);
            const destination1 = "HALL 5";
            astrid.moveQueue = [destination1];
            await queueMoveAction1.performQueueMove(false, destination1);

            const queueMoveAction2 = new QueueMoveAction(testGame, undefined, nero, nero.location, false);
            const destination2 = "HALL 3";
            nero.moveQueue = [destination2];
            await queueMoveAction2.performQueueMove(false, destination2);

            const followAction1 = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await followAction1.performFollow(nero);
            expect(asuka.followedPlayerDisplayName).toBe(nero.name);
            expect(asuka.party).toBeNull();
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.currentMovingSpeed).toBe(nero.speed);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.moveQueue).toHaveLength(1);
            expect(asuka.moveQueue[0]).toBe(destination2);
            expect(asuka.followedPlayer).toStrictEqual(nero);
            expect(asuka.isFollowing(nero)).toBe(true);

            const followAction2 = new FollowAction(testGame, undefined, asuka, asuka.location, false);
            await followAction2.performFollow(astrid);
            expect(asuka.followedPlayerDisplayName).toBe(concealedDisplayName);
            expect(asuka.party).toBeNull();
            expect(asuka.isMoving).toBe(true);
            expect(asuka.isRunning).toBe(false);
            expect(asuka.currentMovingSpeed).toBe(asuka.speed);
            expect(asuka.moveTimer).not.toBeNull();
            expect(asuka.moveQueue).toHaveLength(1);
            expect(asuka.moveQueue[0]).toBe(destination1);
            expect(asuka.followedPlayer).toStrictEqual(astrid);
            expect(asuka.isFollowing(astrid)).toBe(true);
        });
    });
});
