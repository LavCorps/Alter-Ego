// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Collection } from "discord.js";

abstract class BaseInvocation<T extends boolean> {
    protected _valid: T;

    protected constructor(valid: T) {
        this._valid = valid;
    }

    public get valid(): T {
        return this._valid;
    }
}

export class ValidInvocation extends BaseInvocation<true> {
    args: Collection<string, any>;

    constructor(args: Collection<string, any>) {
        super(true);
        this.args = args;
    }
}

export class InvalidInvocation extends BaseInvocation<false> {
    errors: string[];

    constructor(errors: string[]) {
        super(false);
        this.errors = errors;
    }
}

export type Invocation = ValidInvocation | InvalidInvocation;
