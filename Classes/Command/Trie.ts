// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Token } from "./Token.ts";
import { TrieNode } from "./TrieNode.ts";

export class Trie {
    root: TrieNode;

    constructor() {
        this.root = new TrieNode();
    }

    insert(phrase: string, value: Token): void {
        const words = phrase.toLocaleLowerCase().trim().split(/\s+/);
        let node = this.root;

        for (const word of words) {
            node = node.extend(word);
        }

        node.imbue(value);
    }

    tokenize(words: string[]): Token[][] {
        const input: string[] = words.map((word) => word.toLocaleLowerCase());
        const output: Token[][] = [];
        let i = 0;

        while (i < input.length) {
            let node = this.root;
            let longestMatch: Token[] | null = null;
            let longestLen = 0;
            let j = i;
            while (j < input.length && node.children.has(input[j])) {
                node = node.children.get(input[j]);
                j++;
                if (node.value.length !== 0) {
                    longestMatch = node.value;
                    longestLen = j - i;
                }
            }
            if (longestMatch !== null) {
                output.push(longestMatch);
                i += longestLen;
            } else {
                throw new Error("input does not resolve to token‽");
            }
        }
        return output;
    }

    size(): number {
        return this.root.size();
    }
}
