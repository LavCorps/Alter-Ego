// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Collection } from "discord.js";
import type GameEntity from "../../Data/GameEntity.ts";

abstract class BaseInvocation<M extends boolean, V extends boolean> {
    private readonly _matched: M;
    private readonly _validated: V;

    protected constructor(matched: M, validated: V) {
        this._matched = matched;
        this._validated = validated;
    }

    public get matched(): M {
        return this._matched;
    }

    public get validated(): V {
        return this._validated;
    }
}

export class ValidatedInvocation extends BaseInvocation<true, true> {
    args: Collection<string, GameEntity[]>;

    constructor(args: Collection<string, GameEntity[]>) {
        super(true, true);
        this.args = args;
    }
}

export class MatchedInvocation extends BaseInvocation<true, false> {
    args: Collection<string, GameEntity[]>;

    constructor(args: Collection<string, GameEntity[]>) {
        super(true, false);
        this.args = args;
    }
}

export class InvalidInvocation extends BaseInvocation<false, false> {
    errors: string[];

    constructor(errors: string[]) {
        super(false, false);
        this.errors = errors;
    }
}

export type MatchResult = MatchedInvocation | InvalidInvocation;
export type ValidationResult = ValidatedInvocation | InvalidInvocation;
export type Invocation = ValidatedInvocation | MatchedInvocation | InvalidInvocation;
