import PlayerContext from "../../../Classes/Command/PlayerContext.ts";
import { ItemContainerToken, PrepositionToken } from "../../../Classes/Command/Token.ts";
import Trie from "../../../Classes/Command/Trie.ts";
import PrettyPrinter from "../../../Classes/PrettyPrinter.ts";
import type Fixture from "../../../Data/Fixture.ts";
import type InventoryItem from "../../../Data/InventoryItem.ts";
import type Player from "../../../Data/Player.ts";
import { clearQueue } from "../../../Modules/messageHandler.js";
import { createMockMessage } from "../../__mocks__/libs/discord.js";

describe("PlayerContext class from NG Commands", () => {
    beforeAll(async () => {
        if (!game.inProgress) await game.entityLoader.loadAll();
    });

    beforeEach(async () => {
        kyra = game.entityFinder.getPlayer("Kyra");
    });

    let kyra: Player;

    const printer = new PrettyPrinter();

    afterEach(async () => {
        clearQueue(game);
        vi.resetAllMocks();
    });

    describe("constructor()", () => {
        test("verify that stashedItems does not include top-level items", async () => {
            const context = new PlayerContext(game, kyra, "test", createMockMessage());
            const noStash: Set<InventoryItem> = new Set();
            const stash: Set<InventoryItem> = new Set();

            for (const item of context.heldItems) noStash.add(item);
            for (const item of context.equippedItems) noStash.add(item);
            for (const item of context.stashedItems) stash.add(item);

            for (const item of stash) expect(noStash.has(item)).toBeFalsy();
            for (const item of noStash) expect(stash.has(item)).toBeFalsy();
        });

        test("verify that stashedItems are not duplicated", async () => {
            const context = new PlayerContext(game, kyra, "test", createMockMessage());
            let stashCount = 0;
            const stash: Set<InventoryItem> = new Set();

            for (const item of context.stashedItems) {
                stash.add(item);
                stashCount += 1;
            }

            expect(stash.size).toStrictEqual(stashCount);
        });
    });

    describe("getLexicon()", () => {
        test("feed Kyra Context to Trie", async () => {
            const start = process.hrtime.bigint();
            const trie = new Trie();
            const trieInitConclude = process.hrtime.bigint();
            const context = new PlayerContext(game, kyra, "test", createMockMessage());
            const contextInitConclude = process.hrtime.bigint();
            const tokens = context.getLexicon();
            const getLexiconConclude = process.hrtime.bigint();
            for (const token of tokens) {
                trie.insert(token.value, token);
            }
            const trieLoadConclude = process.hrtime.bigint();
            console.log(`full trie load from context took ${Number(trieLoadConclude - start) / 1000000}ms`);
            console.log(`  trie init took ${Number(trieInitConclude - start) / 1000000}ms`);
            console.log(`  context init took ${Number(contextInitConclude - trieInitConclude) / 1000000}ms`);
            console.log(`  lexicon building took ${Number(getLexiconConclude - contextInitConclude) / 1000000}ms`);
            console.log(`  trie loading took ${Number(trieLoadConclude - getLexiconConclude) / 1000000}ms`);
            console.log(`final trie size is ${trie.size()}`);
            console.log(printer.prettyString(trie));
        });
    });

    describe("lexicon usage tests", () => {
        test("kyra: (drop) coffee on floor", async () => {
            const trie = new Trie();
            {
                const context = new PlayerContext(game, kyra, "test", createMockMessage());
                const tokens = context.getLexicon();
                for (const token of tokens) {
                    trie.insert(token.value, token);
                }
            }
            const streams = trie.tokenize(["coffee", "on", "floor"]);
            expect(streams.length).toBe(3);
            for (const stream of streams) {
                // this is a simple test, and will break if a second valid tokenization for "coffee" is ever introduced to the environment kyra resides within
                expect(stream.length).toBe(1);
            }
            // ItemContainerToken: should be COFFEE, type -1, with empty preposition string
            const coffee = streams[0][0] as ItemContainerToken<InventoryItem>;
            expect(coffee.value).toBe("COFFEE");
            expect(coffee.type).toBe(-1);
            expect(coffee.preposition).toBe("");
            // PrepositionToken: should be "on", type -2,
            const preposition = streams[1][0] as PrepositionToken;
            expect(preposition.value).toBe("on");
            expect(preposition.type).toBe(-2);
            // ItemContainerToken: should be FLOOR, type -1, with preposition "on"
            const floor = streams[2][0] as ItemContainerToken<Fixture>;
            expect(floor.value).toBe("FLOOR");
            expect(floor.type).toBe(-1);
            expect(floor.preposition).toBe("on");
        });
    });
});
