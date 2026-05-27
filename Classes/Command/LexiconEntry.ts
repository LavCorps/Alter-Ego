// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { TokenType } from "./Token.ts";

export type LexiconEntry = {
    value: string;
    type: TokenType;
    attributes: Record<string, string>;
    priority: number;
}
