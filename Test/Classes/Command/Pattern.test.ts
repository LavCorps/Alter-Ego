// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Slot } from "../../../Classes/Command/Pattern.ts";
import { EntityToken, ItemContainerToken } from "../../../Classes/Command/Token.ts";
import Player from "../../../Data/Player.ts";
import { clearQueue } from "../../../Modules/messageHandler.js";

describe("Pattern file from NG Commands", () => {
    beforeAll(async () => {
        if (!game.inProgress) await game.entityLoader.loadAll();
    });

    beforeEach(async () => {
        kyra = game.entityFinder.getPlayer("Kyra");
    });

    afterEach(async () => {
        clearQueue(game);
        vi.resetAllMocks();
    });

    let kyra: Player;

    describe("Slot class from NG Commands", () => {
        test("Slot.satisfiedBy()", async () => {
            const slot = new Slot(Player, "kyra");
            const goodToken = new EntityToken("Kyra", kyra);
            const badToken = new ItemContainerToken("COFFEE", kyra.inventory.get("RIGHT HAND").equippedItem)
            expect(slot.satisfiedBy(goodToken)).toBeTruthy();
            expect(slot.satisfiedBy(badToken)).toBeFalsy();
        });
    });
});
