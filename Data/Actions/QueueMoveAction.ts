// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Action from "../Action.ts";
import type Exit from "../Exit.js";
import Room from "../Room.ts";
import MoveAction from "./MoveAction.ts";
import StartMoveAction from "./StartMoveAction.ts";

/**
 * Represents a queue move action.
 *
 * @see https://msvblank.github.io/Alter-Ego/reference/data_structures/action.html#queue-move-action
 */
export default class QueueMoveAction extends Action {
	/**
	 * Performs a queue move action.
     *
	 * @param isRunning - Whether the player is running.
	 * @param destinationString - The destination the user supplied.
     * @param customSpeed - A custom speed at which to move. Optional. If not provided, the player's current speed will be used.
	 */
	async performQueueMove(isRunning: boolean, destinationString: string, customSpeed?: number): Promise<void> {
		if (this.performed) return;
		super.perform();
		const currentRoom = this.player.location;
		let exit: Exit = null;
		let destinationRoom: Room = null;
		let entrance: Exit = null;
		let isMovingInstantly = false;
        const canMoveFreely = this.getGame().guildContext.hasFreeMovementRole(this.player.member);

		exit = currentRoom.getExit(destinationString);
		if (!exit) {
            if (this.forced || canMoveFreely) {
				// If the player is forced by a moderator or can move freely, they can instantly move to any room.
				destinationRoom = this.getGame().entityFinder.getRoom(destinationString);
				isMovingInstantly = true;
			}
			else {
				// Otherwise, check that the desired room is adjacent to the current room.
				const destRoomId = Room.generateValidId(destinationString);
				for (const targetExit of currentRoom.exits.values()) {
					if (targetExit.dest.id === destRoomId) {
						exit = targetExit;
						break;
					}
				}
			}
		}
		if (exit) {
			destinationRoom = exit.dest;
			entrance = destinationRoom.getExit(exit.link);
		}
		if (!destinationRoom) {
			this.player.moveQueue.length = 0;
            if (this.forced && this.message)
                this.getGame().communicationHandler.reply(this.message, `Couldn't find room or exit "${destinationString}".`);
			else
                this.getGame().communicationHandler.sendMessageToPlayer(this.player, `There is no exit "${destinationString}" that you can currently move to. Please try the name of an exit in the room you're in or the name of the room you want to go to.`, false);
            return;
		}

		if (exit) {
			const startMoveAction = new StartMoveAction(this.getGame(), this.message, this.player, this.player.location, this.forced);
			await startMoveAction.performStartMove(isRunning, currentRoom, destinationRoom, exit, entrance, customSpeed);
            const verb = isRunning ? `running` : `moving`;
            this.successMessage = `Successfully started ${verb} ${this.player.name} to ${exit.name} in ${this.location.channel}.`;
            if (this.player.moveQueue.length > 1)
                this.successMessage += ` ${this.player.originalPronouns.Dpos} move queue is now: "${this.player.moveQueue.join(' > ')}".`;
		}
		else {
			const moveAction = new MoveAction(this.getGame(), this.message, this.player, this.player.location, this.forced);
			await moveAction.performMove(isRunning, currentRoom, destinationRoom, exit, entrance, isMovingInstantly && canMoveFreely);
			this.player.moveQueue.length = 0;
            // If anyone if following the player who teleported, they have lost track of them and should stop following them.
            for (const occupant of this.location.occupants) {
                if (occupant.isFollowing(this.player)) {
                    occupant.stopFollowing();
                }
            }
            this.successMessage = `Successfully moved ${this.player.name} to ${destinationRoom.channel}.`;
		}
	}

	/**
	 * Finds the required room item to call performQueueMove.
     *
	 * @param args - The args as strings.
	 */
	parseInteractionArgs(args: string[]): [Room, boolean, string] {
		const location = this.getGame().entityFinder.getRoom(args[0]);
		const isRunning = args[1].toLowerCase() === 'true';
		let exit: Exit = this.getGame().entityFinder.getExit(location, args[2]);
		const exitName = exit ? exit.name : "";
		return [location, isRunning, exitName];
	}

	/**
	 * Validates the parsed args. The results can be passed directly into performQueueMove.
     *
	 * @param args - The args after being parsed.
	 */
	validateInteractionArgs(args: [Room, boolean, string]): [boolean, string] {
        const errorMessageGenerator = this.getGame().errorMessageGenerator;
		if (args.length !== 3) throw new Error(errorMessageGenerator.generateInsufficientArgumentsError());
		if (!args[0]) throw new Error(errorMessageGenerator.generateInvalidEntityError("Room"));
		if (args[0].id !== this.player.location.id) throw new Error(errorMessageGenerator.generatePlayerLocationMismatchError());
		if (this.player.isMoving) throw new Error(errorMessageGenerator.generateAlreadyMovingError());
        if (this.player.followedPlayer) throw new Error(errorMessageGenerator.generateCannotMoveAlreadyFollowingPlayerError(this.player));
		if (args[1] === false) {
            if (this.player.hasBehaviorAttribute("disable move"))
                throw new Error(errorMessageGenerator.generateCommandDisabledError(this.player.getBehaviorAttributeStatusEffects("disable move")[0]));
            if (this.player.hasBehaviorAttribute("disable all") && !this.player.hasBehaviorAttribute("enable move"))
                throw new Error(errorMessageGenerator.generateCommandDisabledError(this.player.getBehaviorAttributeStatusEffects("disable all")[0]));
        }
		if (args[1] === true) {
            if (this.player.hasBehaviorAttribute("disable run"))
                throw new Error(errorMessageGenerator.generateCommandDisabledError(this.player.getBehaviorAttributeStatusEffects("disable run")[0]));
            if (this.player.hasBehaviorAttribute("disable all") && !this.player.hasBehaviorAttribute("enable run"))
                throw new Error(errorMessageGenerator.generateCommandDisabledError(this.player.getBehaviorAttributeStatusEffects("disable all")[0]));
        }
        const context = this.forced ? "Moderator" : "Player";
        if (this.player.speed <= 0) throw new Error(errorMessageGenerator.generateCannotMoveWithNoSpeedError(this.player, context));
        if (this.player.party && !this.player.party.canMove(args[1])) throw new Error(errorMessageGenerator.generatePartyCannotMoveError(this.player, args[1], context));
		if (!args[2]) throw new Error(errorMessageGenerator.generateInvalidEntityError("Exit"));
		return [args[1], args[2]];
	}
}
