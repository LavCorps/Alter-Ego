// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export type TokenType = 0 | 1 | 2;

export interface Token {
    type: TokenType;
    value: string;
    attributes: Record<string, string>
}
