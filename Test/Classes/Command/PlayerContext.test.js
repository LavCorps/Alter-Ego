import PlayerContext from "../../../Classes/Command/PlayerContext.ts";
import Trie from "../../../Classes/Command/Trie.ts";
import PrettyPrinter from "../../../Classes/PrettyPrinter.ts";
import { clearQueue } from "../../../Modules/messageHandler.js";
import { createMockMessage } from "../../__mocks__/libs/discord.js";

describe("PlayerContext class from NG Commands", () => {
    beforeAll(async () => {
        if (!game.inProgress) await game.entityLoader.loadAll();
    });

    beforeEach(async () => {
        kyra = game.entityFinder.getPlayer("Kyra");
    });

    /** @type {import("../../../Data/Player.ts").default} */
    let kyra;

    const printer = new PrettyPrinter();

    afterEach(async () => {
        clearQueue(game);
        vi.resetAllMocks();
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
            console.log(printer.prettyString(trie))
        });
    });
});
