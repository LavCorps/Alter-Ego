// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ClientEvents } from "discord.js";
import ClientContext from "./ClientContext.ts";

type ClientEventCallback = (...args: any) => Promise<void>;

interface ClientEventConstructorArgs {
    /**
     * The name of the event.
     */
    name: keyof ClientEvents;
    /**
     * Whether or not the event should only be handled once.
     */
    once: boolean;
    /**
     * The code to execute when the event is triggered.
     */
    execute: ClientEventCallback;
}

/**
 * Represents an API event that can be read by the client.
 *
 * Not to be confused with the GameEntity named Event.
 */
export default class ClientEvent {
    /**
     * The name of the event.
     */
    readonly name: keyof ClientEvents;
    /**
     * Whether or not the event should only be handled once.
     */
    readonly once: boolean;
    /**
     * The code to execute when the event is triggered.
     */
    readonly execute: ClientEventCallback;

    /**
     * @param args - The args to construct the event with.
     */
    constructor(args: ClientEventConstructorArgs) {
        this.name = args.name;
        this.once = args.once;
        this.execute = args.execute;
    }

    /**
     * The client context this event belongs to.
     */
    static get client() {
        return ClientContext.instance;
    }

    /**
     * Whether or not the bot has finished initializing.
     * Until it is finished, it will not respond to messages or client events.
     */
    static get clientReady(): boolean {
        return ClientContext.initialized;
    }
}
