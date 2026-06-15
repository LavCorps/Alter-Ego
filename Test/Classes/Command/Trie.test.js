import { constantFactory, inventoryItemFactory, playerFactory } from "../../../Classes/Command/Token.ts";
import Trie from "../../../Classes/Command/Trie.ts";
import { clearQueue } from "../../../Modules/messageHandler.js";

describe("Trie class from NG Commands", () => {
    beforeAll(async () => {
        if (!game.inProgress) await game.entityLoader.loadAll();
    });

    beforeEach(async () => {
        trie = new Trie();
    });

    afterEach(async () => {
        clearQueue(game);
        vi.resetAllMocks();
    });

    /** @type Trie */
    let trie;

    describe("data loading", () => {
        test("1", async () => {
            const data = "Last one in is a **{rotten egg}!**";
            trie.insert(data, constantFactory(data));
            expect(trie.size()).toBe(8); // 7 words + root node
        });
        test("2", async () => {
            const data1 = "The quick brown fox";
            const data2 = "The lazy dog";
            trie.insert(data1, constantFactory(data1));
            trie.insert(data2, constantFactory(data2));
            expect(trie.size()).toBe(7); // root node + shared "the" node + 3 words + 2 words
            expect(trie.root.children.get("the").children.size).toBe(2); // two descending nodes from "the"
        });
    });

    describe("input tokenization", () => {
        beforeEach(async () => {
            /** @type string[] */
            const data = ["Last one in is a **{rotten egg}!**"];
            for (const line of data) {
                trie.insert(line, constantFactory(line));
            }
        });
        test("1", async () => {
            const stream = trie.tokenize(["Last", "one", "in", "is", "a", "**{rotten", "egg}!**"]);
            expect(stream[0][0].type).toBe(-1);
            expect(stream[0][0].value).toBe("Last one in is a **{rotten egg}!**");
        });
        test("2", async () => {
            const stream = trie.tokenize(["Last", "one", "in", "is", "a", "rotten", "egg!"]);
            expect(stream[0][0].type).toBe(-999);
            expect(stream[0][0].value).toBe("Last");
            expect(stream[1][0].type).toBe(-999);
            expect(stream[1][0].value).toBe("one");
            expect(stream[2][0].type).toBe(-999);
            expect(stream[2][0].value).toBe("in");
            expect(stream[3][0].type).toBe(-999);
            expect(stream[3][0].value).toBe("is");
            expect(stream[4][0].type).toBe(-999);
            expect(stream[4][0].value).toBe("a");
            expect(stream[5][0].type).toBe(-999);
            expect(stream[5][0].value).toBe("rotten");
            expect(stream[6][0].type).toBe(-999);
            expect(stream[6][0].value).toBe("egg!");
        });
    });

    describe("benchmarking", () => {
        test("load all loadable game data into trie", async () => {
            const start = process.hrtime.bigint();
            for (const player of game.players.values()) {
                trie.insert(player.displayName, playerFactory(player.displayName, player));
            }
            const playerConclude = process.hrtime.bigint();
            for (const item of game.inventoryItems) {
                if (item.prefab !== null) {
                    trie.insert(item.prefab.id, inventoryItemFactory(item.prefab.id, item));
                }
            }
            const inventoryItemConclude = process.hrtime.bigint();
            const allTime = inventoryItemConclude - start;
            const playerTime = playerConclude - start;
            const inventoryItemTime = inventoryItemConclude - playerConclude;
            console.log(`full trie load took ${Number(allTime) / 1000000}ms`);
            console.log(`player trie load took ${Number(playerTime) / 1000000}ms`);
            console.log(`inventory item trie load took ${Number(inventoryItemTime) / 1000000}ms`);
        });
    });
});
