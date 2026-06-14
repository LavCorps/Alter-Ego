// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Token } from "./Token.ts";

export class TrieNode {
    children: Map<string, TrieNode>;
    value: Token[];

    constructor() {
        this.children = new Map();
        this.value = [];
    }

    imbue(value: Token): void {
        this.value.push(value);
    }

    extend(word: string): TrieNode {
        if (!this.children.has(word)) {
            this.children.set(word, new TrieNode());
        }
        return this.children.get(word);
    }

    size(): number {
        let i = 1;
        for (const child of this.children.values()) {
            i += child.size()
        }
        return i;
    }
}
