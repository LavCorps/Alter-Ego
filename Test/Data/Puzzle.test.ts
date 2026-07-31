// SPDX-FileCopyrightText: 2019 Alter Ego Contributors
// SPDX-FileCopyrightText: 2026 Ms. VBLANK <alteregomolly@pm.me>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type Puzzle from '../../Data/Puzzle.ts';

describe('Puzzle test', () => {
    beforeAll(async () => {
        if (!testGame.inProgress) await testGame.entityLoader.loadAll();
    });

    describe('getSolutionSatisfiedByWeight', () => {
        let puzzle: Puzzle;

        describe('SCALE (solution: "99.0001", rounds to 99)', () => {
            beforeAll(() => {
                puzzle = testGame.entityFinder.getPuzzle('SCALE');
            });

            test('exact weight "99" matches', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('99')).toBe('99.0001');
            });

            test('weight "99.000" matches (both round to 99)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('99.000')).toBe('99.0001');
            });

            test('weight "99.0001" matches (same as solution)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('99.0001')).toBe('99.0001');
            });

            test('weight "99.0004" matches (rounds to 99)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('99.0004')).toBe('99.0001');
            });

            test('weight "98.9995" matches (rounds to 99)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('98.9995')).toBe('99.0001');
            });

            test('weight "99.0005" does NOT match (rounds to 99.001)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('99.0005')).toBeUndefined();
            });

            test('weight "99.001" does NOT match', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('99.001')).toBeUndefined();
            });

            test('weight "98.9994" does NOT match (rounds to 98.999)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('98.9994')).toBeUndefined();
            });
        });

        describe('REALISTIC FICTION SECTION (solution: "1.1013", rounds to 1.101)', () => {
            beforeAll(() => {
                puzzle = testGame.entityFinder.getPuzzle('REALISTIC FICTION SECTION');
            });

            test('weight "1.101" matches (both round to 1.101)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('1.101')).toBe('1.1013');
            });

            test('weight "1.1013" matches (same as solution)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('1.1013')).toBe('1.1013');
            });

            test('weight "1.1014" matches (rounds to 1.101)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('1.1014')).toBe('1.1013');
            });

            test('weight "1.1015" does NOT match (rounds to 1.102)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('1.1015')).toBeUndefined();
            });

            test('weight "1.1005" matches (rounds to 1.101)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('1.1005')).toBe('1.1013');
            });

            test('weight "1.1004" does NOT match (rounds to 1.1)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('1.1004')).toBeUndefined();
            });
        });

        describe('DYSTOPIAN FICTION SECTION (solution: "2.0005", rounds to 2.001)', () => {
            beforeAll(() => {
                puzzle = testGame.entityFinder.getPuzzle('DYSTOPIAN FICTION SECTION');
            });

            test('weight "2.001" matches (both round to 2.001)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('2.001')).toBe('2.0005');
            });

            test('weight "2.0005" matches (same as solution)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('2.0005')).toBe('2.0005');
            });

            test('weight "2.0004" does NOT match (rounds to 2)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('2.0004')).toBeUndefined();
            });

            test('weight "2.0014" matches (rounds to 2.001)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('2.0014')).toBe('2.0005');
            });

            test('weight "2.0015" does NOT match (rounds to 2.002)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('2.0015')).toBeUndefined();
            });
        });

        describe('FANTASY SECTION (solution: "3", rounds to 3)', () => {
            beforeAll(() => {
                puzzle = testGame.entityFinder.getPuzzle('FANTASY SECTION');
            });

            test('weight "3" matches (same as solution)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('3')).toBe('3');
            });

            test('weight "3.000" matches (both round to 3)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('3.000')).toBe('3');
            });

            test('weight "3.0004" matches (rounds to 3)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('3.0004')).toBe('3');
            });

            test('weight "2.9995" matches (rounds to 3)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('2.9995')).toBe('3');
            });

            test('weight "3.0005" does NOT match (rounds to 3.001)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('3.0005')).toBeUndefined();
            });

            test('weight "2.9994" does NOT match (rounds to 2.999)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('2.9994')).toBeUndefined();
            });
        });

        describe('HORROR SECTION (solution: "3.9999", rounds to 4)', () => {
            beforeAll(() => {
                puzzle = testGame.entityFinder.getPuzzle('HORROR SECTION');
            });

            test('weight "4" matches (both round to 4)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('4')).toBe('3.9999');
            });

            test('weight "3.9999" matches (same as solution)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('3.9999')).toBe('3.9999');
            });

            test('weight "3.9995" matches (rounds to 4)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('3.9995')).toBe('3.9999');
            });

            test('weight "4.0004" matches (rounds to 4)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('4.0004')).toBe('3.9999');
            });

            test('weight "3.9994" does NOT match (rounds to 3.999)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('3.9994')).toBeUndefined();
            });

            test('weight "4.001" does NOT match (rounds to 4.001)', () => {
                expect(puzzle.getSolutionSatisfiedByWeight('4.001')).toBeUndefined();
            });
        });

        describe('edge cases', () => {
            test('NaN weight returns undefined', () => {
                const puzzle = testGame.entityFinder.getPuzzle('SCALE');
                expect(puzzle.getSolutionSatisfiedByWeight('not a number')).toBeUndefined();
            });

            test('empty string weight returns undefined', () => {
                const puzzle = testGame.entityFinder.getPuzzle('SCALE');
                expect(puzzle.getSolutionSatisfiedByWeight('')).toBeUndefined();
            });

            test('very long decimal that still rounds correctly matches', () => {
                const puzzle = testGame.entityFinder.getPuzzle('FANTASY SECTION');
                expect(puzzle.getSolutionSatisfiedByWeight('3.0004999')).toBe('3');
            });

            test('weight that differs only beyond 3 decimal places still matches', () => {
                const puzzle = testGame.entityFinder.getPuzzle('SCALE');
                expect(puzzle.getSolutionSatisfiedByWeight('99.00009')).toBe('99.0001');
            });
        });
    });
});
