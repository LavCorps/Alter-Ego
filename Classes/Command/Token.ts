// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { SlotTypes } from "./Pattern.ts";

export const CONSTANT = -1;

export const REFERENCE = -2;

export type TokenType = typeof REFERENCE | typeof CONSTANT | SlotTypes;

export interface Token {
    type: TokenType;
    value: string;
    attributes: Record<string, string>;
}
