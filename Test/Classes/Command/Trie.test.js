import { constantFactory } from "../../../Classes/Command/Token.ts";
import Trie from "../../../Classes/Command/Trie.ts";
import { clearQueue, sendQueuedMessages } from "../../../Modules/messageHandler.js";

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
});
