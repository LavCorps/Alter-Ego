// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Collection } from "discord.js";

abstract class BaseInvocation {
    abstract valid: boolean;
}

export class ValidInvocation extends BaseInvocation {
    valid: true;
    args: Collection<string, any>;

    constructor(args: Collection<string, any>) {
        super();
        this.valid = true;
        this.args = args;
    }
}

export class InvalidInvocation extends BaseInvocation {
    valid: false;
    errors: string[];

    constructor(errors: string[]) {
        super();
        this.valid = false;
        this.errors = errors;
    }
}

export type Invocation = ValidInvocation | InvalidInvocation;
