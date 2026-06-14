// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SENTINEL, type SentinelToken, type Token } from "./Token.ts";
import { TrieNode } from "./TrieNode.ts";

export default class Trie {
    root: TrieNode;

    constructor() {
        this.root = new TrieNode();
    }

    insert(phrase: string, value: Token): void {
        const words = phrase.toLocaleLowerCase().trim().split(/[^\S\n]/);
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
                const sentinel: SentinelToken = { value: input[i], type: SENTINEL };
                output.push([sentinel]);
                i++;
            }
        }
        return output;
    }

    size(): number {
        return this.root.size();
    }
}
